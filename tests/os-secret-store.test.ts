/**
 * Credential store on macOS (Keychain) and Linux (Secret Service), with a fake program runner.
 * The real programs are exercised on macOS and Linux CI runners (tests/e2e/os-secret-store.mjs).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  __setSecretBackendForTests, saveStoredProfile, readStoredSecret, deleteStoredProfile, listStoredProfiles,
} from '../src/security/credential-store';

const PW = 'S3cret "quoted" \\ back$lash ünï';
type Call = { file: string; args: string[]; input: string };

function fakeStores() {
  const keychain = new Map<string, string>();
  const keyring = new Map<string, string>();
  const calls: Call[] = [];
  const run = (file: string, args: string[], input = '') => {
    calls.push({ file, args, input });
    if (file === '/usr/bin/security') {
      if (args[0] === '-i') {
        const m = /^add-generic-password -U -a "([^"]+)" -s "dhis2-mcp" -l "DHIS2 MCP" -X ([0-9a-f]+)\n$/.exec(input);
        if (!m) throw new Error('bad security -i command');
        keychain.set(m[1]!, Buffer.from(m[2]!, 'hex').toString('utf8'));
        return '';
      }
      const acct = args[args.indexOf('-a') + 1]!;
      if (args[0] === 'find-generic-password') { if (!keychain.has(acct)) throw new Error('not found'); return keychain.get(acct)! + '\n'; }
      if (args[0] === 'delete-generic-password') { keychain.delete(acct); return ''; }
    }
    if (file.endsWith('secret-tool')) {
      const acct = args[args.indexOf('account') + 1]!;
      if (args[0] === 'store') { keyring.set(acct, input); return ''; }
      if (args[0] === 'lookup') return keyring.get(acct) ?? '';
      if (args[0] === 'clear') { keyring.delete(acct); return ''; }
    }
    throw new Error(`unexpected program ${file}`);
  };
  return { keychain, keyring, calls, run };
}

let home: string;
const env = () => ({ ...process.env, DHIS2_MCP_HOME: home, DHIS2_MCP_PLAIN_SECRETS: undefined }) as Record<string, string | undefined>;
const profile = { baseUrl: 'https://dev.example.org', username: 'ana', environment: 'development' as const, verifiedAt: '2026-11-12T00:00:00Z' };

beforeEach(() => { home = fs.mkdtempSync(path.join(os.tmpdir(), 'dhis2-store-')); delete process.env.DHIS2_MCP_PLAIN_SECRETS; });
afterEach(() => { __setSecretBackendForTests(); fs.rmSync(home, { recursive: true, force: true }); });

describe('macOS Keychain', () => {
  test('the password goes to the Keychain, never into a command line or the store files', () => {
    const f = fakeStores();
    __setSecretBackendForTests(f.run, 'darwin');
    expect(saveStoredProfile('dev', profile, PW, env())).toBe('macOS Keychain');
    expect(readStoredSecret('dev', env())).toBe(PW);
    for (const c of f.calls) expect(c.args.join(' ')).not.toContain(PW);
    for (const c of f.calls) expect(c.args.join(' ')).not.toContain(Buffer.from(PW).toString('hex'));
    const files = fs.readdirSync(home).map(n => fs.readFileSync(path.join(home, n), 'utf8')).join('\n');
    expect(files).not.toContain(PW);
    expect(JSON.parse(fs.readFileSync(path.join(home, 'secrets.json'), 'utf8')).scheme).toBe('keychain');
  });

  test('logout removes the Keychain entry', () => {
    const f = fakeStores();
    __setSecretBackendForTests(f.run, 'darwin');
    saveStoredProfile('dev', profile, PW, env());
    expect(deleteStoredProfile('dev', env())).toBe(true);
    expect(f.keychain.size).toBe(0);
    expect(listStoredProfiles(env())).toEqual({});
  });

  test('a Keychain that fails falls back to the private file and says so', () => {
    __setSecretBackendForTests(() => { throw new Error('keychain locked'); }, 'darwin');
    expect(saveStoredProfile('dev', profile, PW, env())).toBe('private file');
    expect(readStoredSecret('dev', env())).toBe(PW);
  });

  test('separate store folders get separate Keychain entries', () => {
    const f = fakeStores();
    __setSecretBackendForTests(f.run, 'darwin');
    saveStoredProfile('dev', profile, 'one', env());
    const first = home;
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'dhis2-store-'));
    saveStoredProfile('dev', profile, 'two', env());
    expect(f.keychain.size).toBe(2);
    expect(readStoredSecret('dev', env())).toBe('two');
    fs.rmSync(first, { recursive: true, force: true });
  });
});

const hasSecretTool = ['/usr/bin/secret-tool', '/usr/local/bin/secret-tool', '/bin/secret-tool'].some(p => fs.existsSync(p));
describe('Linux Secret Service', () => {
  (hasSecretTool ? test.skip : test)('without secret-tool installed, the private file is used and reported', () => {
    const f = fakeStores();
    __setSecretBackendForTests(f.run, 'linux');
    expect(saveStoredProfile('dev', profile, PW, env())).toBe('private file');
    expect(f.calls).toHaveLength(0);
    expect(readStoredSecret('dev', env())).toBe(PW);
  });
});

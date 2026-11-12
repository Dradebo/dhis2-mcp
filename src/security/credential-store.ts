/**
 * Server-owned credential store, so any MCP host can launch the server with no
 * secrets in its own config ("npx -y dhis2-mcp-server").
 *
 * Location: $DHIS2_MCP_HOME, else %APPDATA%\dhis2-mcp (Windows) or ~/.dhis2-mcp.
 *   profiles.json  non-secret profile facts (address, username, environment, verified-at)
 *   secrets.json   where each password lives:
 *                    Windows  encrypted with DPAPI for the current user;
 *                    macOS    in the login Keychain (service "dhis2-mcp");
 *                    Linux    in the Secret Service (GNOME Keyring / KWallet) via secret-tool;
 *                    otherwise (no secret store, e.g. a headless server) in this file, 0600.
 *
 * Honest limits: these protect against other OS users and copied files, not against
 * processes running as the same user (including the agent host itself).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

/** production connections are read-only: the transport refuses every non-GET request. */
export type InstanceEnvironment = 'development' | 'training' | 'production';

export function isWritableEnvironment(env: string | null | undefined): boolean {
  return env === 'development' || env === 'training';
}

export interface StoredProfile {
  baseUrl: string;
  username: string;
  environment: InstanceEnvironment;
  displayName?: string;
  verifiedAt: string;
}

interface ProfilesFile { version: 1; profiles: Record<string, StoredProfile> }
type Scheme = 'dpapi' | 'keychain' | 'secret-service' | 'plain';
interface SecretsFile { version: 1; scheme: Scheme; secrets: Record<string, string> }

export function storeDir(env: Record<string, string | undefined> = process.env): string {
  if (env.DHIS2_MCP_HOME) return env.DHIS2_MCP_HOME;
  if (process.platform === 'win32' && env.APPDATA) return path.join(env.APPDATA, 'dhis2-mcp');
  return path.join(os.homedir(), '.dhis2-mcp');
}

function readJson<T>(file: string, fallback: T): T {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) as T; } catch { return fallback; }
}

function writePrivate(file: string, data: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tmp, file);
  try { fs.chmodSync(file, 0o600); } catch { /* best effort on Windows */ }
}

// --- DPAPI via Windows PowerShell; secrets travel over stdin, never argv ------
const PS = ['-NoProfile', '-NonInteractive', '-Command'];
/** Absolute path, so a PATH entry cannot substitute another program. */
function powershell(): string {
  return path.join(process.env.SystemRoot || process.env.SYSTEMROOT || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
}
function dpapiProtect(plain: string): string {
  return execFileSync(powershell(), [...PS,
    '$s=[Console]::In.ReadToEnd(); ConvertTo-SecureString -String $s -AsPlainText -Force | ConvertFrom-SecureString'],
  { input: plain, encoding: 'utf8', windowsHide: true, timeout: 30000 }).trim();
}
function dpapiUnprotect(blob: string): string {
  const out = execFileSync(powershell(), [...PS,
    '$e=[Console]::In.ReadToEnd().Trim(); $ss=ConvertTo-SecureString -String $e; $p=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($ss); try { [Console]::Out.Write([Runtime.InteropServices.Marshal]::PtrToStringBSTR($p)) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p) }'],
  { input: blob, encoding: 'utf8', windowsHide: true, timeout: 30000 });
  return out;
}

// --- macOS Keychain and Linux Secret Service --------------------------------
// Secrets never go on a command line (visible to other processes): the Keychain gets the
// password as hex inside `security -i` commands read from stdin; secret-tool reads stdin.
const SERVICE = 'dhis2-mcp';
type Run = (file: string, args: string[], input?: string) => string;
const defaultRun: Run = (file, args, input) =>
  execFileSync(file, args, { input: input ?? '', encoding: 'utf8', windowsHide: true, timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] });
let run: Run = defaultRun;
let platform: NodeJS.Platform = process.platform;
/** Tests only: replace the program runner and the platform. */
export function __setSecretBackendForTests(r?: Run, p?: NodeJS.Platform): void { run = r ?? defaultRun; platform = p ?? process.platform; }

const SECURITY = '/usr/bin/security';
const SECRET_TOOL_PATHS = ['/usr/bin/secret-tool', '/usr/local/bin/secret-tool', '/bin/secret-tool'];
function secretTool(): string | undefined {
  return SECRET_TOOL_PATHS.find(p => { try { fs.accessSync(p, fs.constants.X_OK); return true; } catch { return false; } });
}

/** One OS-store entry per store directory and profile, so separate DHIS2_MCP_HOME stores never collide. */
function account(name: string, env: Record<string, string | undefined>): string {
  const dirTag = createHash('sha256').update(path.resolve(storeDir(env))).digest('hex').slice(0, 12);
  return `${name.replace(/[^A-Za-z0-9._-]/g, '_')}@${dirTag}`;
}

function osStorePut(sch: Scheme, acct: string, password: string): boolean {
  try {
    if (sch === 'keychain') {
      const hex = Buffer.from(password, 'utf8').toString('hex');
      run(SECURITY, ['-i'], `add-generic-password -U -a "${acct}" -s "${SERVICE}" -l "DHIS2 MCP" -X ${hex}\n`);
    } else if (sch === 'secret-service') {
      run(secretTool()!, ['store', '--label=DHIS2 MCP', 'service', SERVICE, 'account', acct], password);
    } else return false;
    return osStoreGet(sch, acct) === password; // read back: only trust a store that returns what it was given
  } catch { return false; }
}
function osStoreGet(sch: Scheme, acct: string): string | undefined {
  try {
    if (sch === 'keychain') return run(SECURITY, ['find-generic-password', '-a', acct, '-s', SERVICE, '-w']).replace(/\n$/, '');
    if (sch === 'secret-service') { const v = run(secretTool()!, ['lookup', 'service', SERVICE, 'account', acct]); return v === '' ? undefined : v; }
  } catch { /* not found or store locked */ }
  return undefined;
}
function osStoreDelete(sch: Scheme, acct: string): void {
  try {
    if (sch === 'keychain') run(SECURITY, ['delete-generic-password', '-a', acct, '-s', SERVICE]);
    else if (sch === 'secret-service') run(secretTool()!, ['clear', 'service', SERVICE, 'account', acct]);
  } catch { /* already gone */ }
}

/** The secret store this machine offers, before falling back to the private file. */
function preferredScheme(): Scheme {
  if (process.env.DHIS2_MCP_PLAIN_SECRETS === '1') return 'plain';
  if (platform === 'win32') return 'dpapi';
  if (platform === 'darwin') return 'keychain';
  if (platform === 'linux' && secretTool()) return 'secret-service';
  return 'plain';
}
function scheme(): Scheme { return preferredScheme(); }

/** Where the last saved password went, for the login message. */
export type SecretLocation = 'Windows (DPAPI)' | 'macOS Keychain' | 'system keyring' | 'private file';
const LOCATION: Record<Scheme, SecretLocation> = { dpapi: 'Windows (DPAPI)', keychain: 'macOS Keychain', 'secret-service': 'system keyring', plain: 'private file' };

export function listStoredProfiles(env = process.env): Record<string, StoredProfile> {
  return readJson<ProfilesFile>(path.join(storeDir(env), 'profiles.json'), { version: 1, profiles: {} }).profiles ?? {};
}

export function saveStoredProfile(name: string, profile: StoredProfile, password: string, env = process.env): SecretLocation {
  const dir = storeDir(env);
  const profilesFile = path.join(dir, 'profiles.json');
  const secretsFile = path.join(dir, 'secrets.json');
  let sch = scheme();
  // An OS store that is missing or locked (e.g. no keyring daemon on a server) falls back to the file.
  if ((sch === 'keychain' || sch === 'secret-service') && !osStorePut(sch, account(name, env), password)) sch = 'plain';
  const secrets = readJson<SecretsFile>(secretsFile, { version: 1, scheme: sch, secrets: {} });
  if (secrets.scheme !== sch) { secrets.scheme = sch; secrets.secrets = {}; }
  secrets.secrets[name] = sch === 'dpapi' ? dpapiProtect(password) : sch === 'plain' ? password : 'os-store';
  const profiles = readJson<ProfilesFile>(profilesFile, { version: 1, profiles: {} });
  profiles.profiles[name] = profile;
  writePrivate(secretsFile, secrets);
  writePrivate(profilesFile, profiles);
  return LOCATION[sch];
}

export function readStoredSecret(name: string, env = process.env): string | undefined {
  const secrets = readJson<SecretsFile | null>(path.join(storeDir(env), 'secrets.json'), null);
  const value = secrets?.secrets?.[name];
  if (!value) return undefined;
  if (secrets!.scheme === 'dpapi') return dpapiUnprotect(value);
  if (secrets!.scheme === 'keychain' || secrets!.scheme === 'secret-service') return osStoreGet(secrets!.scheme, account(name, env));
  return value;
}

export function deleteStoredProfile(name: string, env = process.env): boolean {
  const dir = storeDir(env);
  const profiles = readJson<ProfilesFile>(path.join(dir, 'profiles.json'), { version: 1, profiles: {} });
  const secrets = readJson<SecretsFile>(path.join(dir, 'secrets.json'), { version: 1, scheme: scheme(), secrets: {} });
  const existed = name in profiles.profiles;
  if (secrets.scheme === 'keychain' || secrets.scheme === 'secret-service') osStoreDelete(secrets.scheme, account(name, env));
  delete profiles.profiles[name];
  delete secrets.secrets[name];
  writePrivate(path.join(dir, 'profiles.json'), profiles);
  writePrivate(path.join(dir, 'secrets.json'), secrets);
  return existed;
}

/** Hostname markers that suggest a non-production instance (advisory only). */
export function looksNonProduction(baseUrl: string): boolean {
  try {
    return /(^|[.-])(dev|develop|development|test|testing|train|training|staging|stage|sandbox|play|demo|uat|qa)([.-]|\d|$)/i
      .test(new URL(baseUrl).hostname);
  } catch { return false; }
}

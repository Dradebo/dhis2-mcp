#!/usr/bin/env node
/**
 * dhis2-mcp command line.
 *
 *   npx -y dhis2-mcp            MCP server over stdio (what agent hosts launch)
 *   npx -y dhis2-mcp install    Agent-friendly setup: prints the host config; in a terminal it also runs login
 *   npx -y dhis2-mcp login      Person types DHIS2 address, username and password once
 *   npx -y dhis2-mcp status     Show saved connections and check they still work
 *   npx -y dhis2-mcp logout     Remove a saved connection
 */
import { checkLogin, validateInstanceUrl } from './setup/login-check.js';
import {
  deleteStoredProfile, listStoredProfiles, readStoredSecret, saveStoredProfile, storeDir,
} from './security/credential-store.js';

const HOST_CONFIG = { mcpServers: { dhis2: { command: 'npx', args: ['-y', 'dhis2-mcp'] } } };
const argv = process.argv.slice(2);
const command = argv[0] && !argv[0].startsWith('-') ? argv[0] : '';
const flag = (name: string): string | undefined => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

/**
 * One raw-mode reader for the whole session, so lines typed or pasted ahead of the
 * next prompt are kept (a fresh readline per prompt silently drops them).
 */
class TerminalInput {
  private buf = '';
  private wake: (() => void) | null = null;
  private onData = (d: string) => { this.buf += d; this.wake?.(); };
  constructor() {
    process.stdin.setRawMode(true);
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', this.onData);
    process.stdin.resume();
  }
  async prompt(question: string, hidden = false): Promise<string> {
    process.stdout.write(question);
    let value = '';
    for (;;) {
      while (this.buf.length) {
        const ch = this.buf[0]!;
        this.buf = this.buf.slice(1);
        if (ch === '\r' || ch === '\n') {
          if (ch === '\r' && this.buf[0] === '\n') this.buf = this.buf.slice(1);
          process.stdout.write('\n');
          return value.trim();
        }
        if (ch === '\u0003') { process.stdout.write('\n'); this.close(); process.exit(130); }
        if (ch === '\u0008' || ch === '\u007f') {
          if (value) { value = value.slice(0, -1); process.stdout.write('\b \b'); }
          continue;
        }
        if (ch === '\u001b') { // arrow keys etc.
          const m = /^\[[0-9;]*[A-Za-z~]/.exec(this.buf);
          if (m) this.buf = this.buf.slice(m[0].length);
          continue;
        }
        if (ch >= ' ') { value += ch; process.stdout.write(hidden ? '•' : ch); }
      }
      await new Promise<void>(resolve => { this.wake = () => { this.wake = null; resolve(); }; });
    }
  }
  close(): void {
    process.stdin.off('data', this.onData);
    try { process.stdin.setRawMode(false); } catch { /* not a TTY */ }
    process.stdin.pause();
  }
}

function printHostConfig(): void {
  console.log(JSON.stringify(HOST_CONFIG, null, 2));
}

async function login(): Promise<number> {
  if (!process.stdin.isTTY) {
    console.error('Login must be typed by a person in a terminal window, so the password stays private.');
    console.error('Ask the person to run:  npx -y dhis2-mcp login');
    return 2;
  }
  const profile = (flag('profile') ?? 'default').toLowerCase();
  if (!/^[a-z][a-z0-9_]{0,31}$/.test(profile)) { console.error('Profile names use lowercase letters, digits and _.'); return 2; }

  const input = new TerminalInput();
  try {
    return await loginFlow(input, profile);
  } finally {
    input.close();
  }
}

async function loginFlow(input: TerminalInput, profile: string): Promise<number> {
  const ask = (q: string) => input.prompt(q);
  const askHidden = (q: string) => input.prompt(q, true);
  console.log('\nConnect your assistant to DHIS2');
  console.log('You will type your DHIS2 address, username and password once. Your password is not shown and is never sent to the assistant.\n');

  let baseUrl = '';
  for (;;) {
    const v = validateInstanceUrl(flag('url') && !baseUrl ? flag('url')! : await ask('DHIS2 address (for example https://dhis2.example.org): '));
    if (v.ok) { baseUrl = v.url; break; }
    console.log(`  ${v.why}\n`);
    if (flag('url')) return 2;
  }

  const answer = (await ask('Is this a development or training server, and not the live one used for real reporting? (yes/no): ')).toLowerCase();
  if (!['y', 'yes'].includes(answer)) {
    console.log('\nThis version only works with development or training servers, so nothing was saved.');
    console.log('Ask your DHIS2 administrator for a development or training server address.');
    return 3;
  }
  const environment = /train/i.test(new URL(baseUrl).hostname) ? 'training' : 'development';

  for (let attempt = 1; attempt <= 3; attempt++) {
    const username = await ask('Username: ');
    const password = await askHidden('Password: ');
    if (!username || !password) { console.log('  Both are needed.\n'); attempt--; continue; }
    process.stdout.write('Checking… ');
    const result = await checkLogin(baseUrl, username, password);
    if (result.ok) {
      saveStoredProfile(profile, {
        baseUrl, username, environment,
        ...(result.me.displayName ? { displayName: result.me.displayName } : {}),
        verifiedAt: new Date().toISOString(),
      }, password);
      console.log(`connected as ${result.me.displayName || result.me.username || username}.\n`);
      console.log('✔ All set. Your assistant can now work with DHIS2. It will ask you before making any changes.');
      console.log('  You can close this window.\n');
      return 0;
    }
    console.log(`\n  ${result.why}`);
    if (!result.retry) { console.log('  Nothing was saved.'); return 1; }
    if (attempt < 3) console.log('  Please try again.\n');
  }
  console.log('  Nothing was saved. Run this again when you have the right details.');
  return 1;
}

async function status(): Promise<number> {
  const profiles = listStoredProfiles();
  const names = Object.keys(profiles);
  if (!names.length) {
    console.log('No DHIS2 connection is saved yet. Run:  npx -y dhis2-mcp login');
    return 1;
  }
  let allOk = true;
  for (const name of names) {
    const p = profiles[name]!;
    let state = 'unknown';
    try {
      const pw = readStoredSecret(name);
      const r = pw ? await checkLogin(p.baseUrl, p.username, pw) : { ok: false as const, why: 'saved password missing' };
      state = r.ok ? 'working' : `not working: ${r.why}`;
      if (!r.ok) allOk = false;
    } catch { state = 'saved password could not be read'; allOk = false; }
    console.log(`${name}: ${p.baseUrl} as ${p.username} (${p.environment}) — ${state}`);
  }
  console.log(`Saved in: ${storeDir()}`);
  return allOk ? 0 : 1;
}

async function main(): Promise<number> {
  switch (command) {
    case '':
    case 'serve':
      if (command === '' && process.stdin.isTTY) {
        console.log('dhis2-mcp is an assistant connector that your AI agent starts by itself.');
        console.log('To connect it to DHIS2, run:  npx -y dhis2-mcp login');
        return 0;
      }
      await import('./index.js');
      return -1; // keep running as a server
    case 'install':
      if (process.stdin.isTTY) {
        const code = await login();
        if (code !== 0) return code;
        console.log('If your assistant has not added DHIS2 yet, give it this configuration:');
      } else {
        console.log('Add this MCP server to the agent host configuration:');
      }
      printHostConfig();
      if (!process.stdin.isTTY && !Object.keys(listStoredProfiles()).length) {
        console.log('\nNext step for the person (in a terminal window):  npx -y dhis2-mcp login');
      }
      return 0;
    case 'config':
      printHostConfig();
      return 0;
    case 'login':
      return login();
    case 'status':
      return status();
    case 'logout': {
      const name = argv[1] ?? 'default';
      console.log(deleteStoredProfile(name) ? `Removed saved connection "${name}".` : `No saved connection called "${name}".`);
      return 0;
    }
    default:
      console.log('Commands: login, status, logout, install, config');
      return 2;
  }
}

main().then(code => { if (code >= 0) process.exit(code); }).catch(() => {
  console.error('Something went wrong. Please run the command again.');
  process.exit(1);
});

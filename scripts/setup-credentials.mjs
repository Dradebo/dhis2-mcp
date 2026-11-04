#!/usr/bin/env node
// Interactive credential setup for a dhis2-mcp connection profile.
//
// Run it yourself in a terminal you can see. It asks for the username and
// password (the password is not echoed), checks them against the instance's
// /api/me over HTTPS, and saves them to the MCP host's .env file. The password is
// never printed and never passes through an AI model.
//
//   node scripts/setup-credentials.mjs --url https://dhis2.example.org [--profile dev] [--env-file PATH]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { checkLogin, dotenvQuote, saveEnv } from './credential-store.mjs';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const profile = arg('profile', 'dev').toLowerCase();
if (!/^[a-z][a-z0-9_]{0,31}$/.test(profile)) fail('Profile names must be lowercase letters, digits or _ (max 32).');
const defaultEnvFile = process.env.HERMES_HOME
  ? path.join(process.env.HERMES_HOME, '.env')
  : process.platform === 'win32' && process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, 'hermes', '.env')
    : path.join(os.homedir(), '.hermes', '.env');
const envFile = arg('env-file', defaultEnvFile);
const P = `DHIS2_MCP_${profile.toUpperCase()}_`;

function fail(message) {
  console.error(`\n✖ ${message}`);
  process.exit(1);
}

if (!process.stdin.isTTY) fail('Run this in an interactive terminal so the password can be typed without echo.');

function ask(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, answer => { rl.close(); resolve(answer.trim()); });
  });
}

function askHidden(question) {
  return new Promise(resolve => {
    process.stdout.write(question);
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let value = '';
    const onData = chunk => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          stdin.setRawMode(false); stdin.pause(); stdin.off('data', onData);
          process.stdout.write('\n');
          return resolve(value);
        }
        if (ch === '\u0003') { process.stdout.write('\n'); process.exit(130); }      // Ctrl+C
        if (ch === '\u0008' || ch === '\u007f') { value = value.slice(0, -1); continue; } // Backspace
        if (ch >= ' ') value += ch;
      }
    };
    stdin.on('data', onData);
  });
}

console.log(`DHIS2 MCP — set up connection profile "${profile}"`);
console.log(`Credentials will be saved to: ${envFile}\n`);

let baseUrl = arg('url') || await ask('DHIS2 address (https://…): ');
baseUrl = baseUrl.replace(/\/+$/, '');
let parsed;
try { parsed = new URL(baseUrl); } catch { fail('That is not a valid web address.'); }
if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash) {
  fail('The address must start with https:// and contain no username, password, ? or #.');
}
console.log(`Instance: ${baseUrl}`);

let username = '';
let password = '';
for (let attempt = 1; ; attempt++) {
  username = await ask('Username: ');
  password = await askHidden('Password (not shown as you type): ');
  if (!username || !password) { console.log('Both username and password are needed.\n'); continue; }
  process.stdout.write('Checking with the server… ');
  const result = await checkLogin(baseUrl, username, password);
  if (result.ok) { console.log(`OK — signed in as ${result.me.displayName || result.me.username || 'user'}.`); break; }
  console.log(`\n${result.why}`);
  if (!result.retry || attempt >= 3) fail('Nothing was saved.');
  console.log('Please try again.\n');
}

const quoted = dotenvQuote(password);
if (!quoted) fail('This password contains characters that cannot be stored safely in a .env file (a line break, or the sequence ${). Nothing was saved.');
saveEnv(envFile, profile, {
  [`${P}BASE_URL`]: `'${baseUrl}'`,
  [`${P}USERNAME`]: dotenvQuote(username) ?? fail('Unsupported username.'),
  [`${P}PASSWORD`]: quoted,
}, [`${P}TOKEN`]);
password = '';
console.log(`\n✔ Saved profile "${profile}". The password was not displayed or logged.`);
console.log('Next: restart Hermes (or reconnect the dhis2 MCP server) so it picks up the new settings.');

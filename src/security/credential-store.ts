/**
 * Server-owned credential store, so any MCP host can launch the server with no
 * secrets in its own config ("npx -y dhis2-mcp").
 *
 * Location: $DHIS2_MCP_HOME, else %APPDATA%\dhis2-mcp (Windows) or ~/.dhis2-mcp.
 *   profiles.json  non-secret profile facts (address, username, environment, verified-at)
 *   secrets.json   passwords; on Windows encrypted with DPAPI for the current user,
 *                  elsewhere stored with 0600 permissions.
 *
 * Honest limits: DPAPI protects against other OS users and copied files, not against
 * processes running as the same user (including the agent host itself).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

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
interface SecretsFile { version: 1; scheme: 'dpapi' | 'plain'; secrets: Record<string, string> }

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

function scheme(): 'dpapi' | 'plain' {
  return process.platform === 'win32' && process.env.DHIS2_MCP_PLAIN_SECRETS !== '1' ? 'dpapi' : 'plain';
}

export function listStoredProfiles(env = process.env): Record<string, StoredProfile> {
  return readJson<ProfilesFile>(path.join(storeDir(env), 'profiles.json'), { version: 1, profiles: {} }).profiles ?? {};
}

export function saveStoredProfile(name: string, profile: StoredProfile, password: string, env = process.env): void {
  const dir = storeDir(env);
  const profilesFile = path.join(dir, 'profiles.json');
  const secretsFile = path.join(dir, 'secrets.json');
  const sch = scheme();
  const secrets = readJson<SecretsFile>(secretsFile, { version: 1, scheme: sch, secrets: {} });
  if (secrets.scheme !== sch) { secrets.scheme = sch; secrets.secrets = {}; }
  secrets.secrets[name] = sch === 'dpapi' ? dpapiProtect(password) : password;
  const profiles = readJson<ProfilesFile>(profilesFile, { version: 1, profiles: {} });
  profiles.profiles[name] = profile;
  writePrivate(secretsFile, secrets);
  writePrivate(profilesFile, profiles);
}

export function readStoredSecret(name: string, env = process.env): string | undefined {
  const secrets = readJson<SecretsFile | null>(path.join(storeDir(env), 'secrets.json'), null);
  const value = secrets?.secrets?.[name];
  if (!value) return undefined;
  return secrets!.scheme === 'dpapi' ? dpapiUnprotect(value) : value;
}

export function deleteStoredProfile(name: string, env = process.env): boolean {
  const dir = storeDir(env);
  const profiles = readJson<ProfilesFile>(path.join(dir, 'profiles.json'), { version: 1, profiles: {} });
  const secrets = readJson<SecretsFile>(path.join(dir, 'secrets.json'), { version: 1, scheme: scheme(), secrets: {} });
  const existed = name in profiles.profiles;
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

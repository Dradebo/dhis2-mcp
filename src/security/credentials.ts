/**
 * Connection profiles (mission BASE-01). The model only ever supplies a profile
 * name (or nothing, when one profile exists). Address and credentials come from:
 *
 * 1. the server's own store, written by `dhis2-mcp login` (default; works with any MCP host), or
 * 2. environment variables set by an operator, which take precedence when present:
 *      DHIS2_MCP_PROFILES=dev,training      (optional; defaults to "default")
 *      DHIS2_MCP_<PROFILE>_BASE_URL=https://...
 *      DHIS2_MCP_<PROFILE>_TOKEN=d2pat_...  or _USERNAME + _PASSWORD
 *      DHIS2_MCP_<PROFILE>_ENVIRONMENT=development|training
 *
 * This release connects only to development or training instances.
 * Errors name variables, never their values. Resolved secrets are registered for redaction.
 */
import { registerSecret, SafeError } from './safe-errors.js';
import { InstanceEnvironment, listStoredProfiles, looksNonProduction, readStoredSecret } from './credential-store.js';

export type DHIS2Auth =
  | { type: 'basic'; username: string; password: string }
  | { type: 'token'; token: string };

export interface ConnectionProfile {
  name: string;
  baseUrl: string;
  auth: DHIS2Auth;
  /** Username for display/audit when known (basic auth); undefined for tokens. */
  username: string | undefined;
  environment: InstanceEnvironment;
  source: 'environment' | 'store';
}

const PROFILE_NAME = /^[a-z][a-z0-9_]{0,31}$/;
type Env = Record<string, string | undefined>;

function prefix(name: string): string {
  return `DHIS2_MCP_${name.toUpperCase()}_`;
}

function envProfilesDeclared(env: Env): boolean {
  return Boolean(env.DHIS2_MCP_PROFILES) || Object.keys(env).some(k => /^DHIS2_MCP_[A-Z0-9_]+_BASE_URL$/.test(k) && Boolean(env[k]));
}

/** Profile names the operator has declared via environment. Names only. */
export function listProfiles(env: Env = process.env): string[] {
  const raw = env.DHIS2_MCP_PROFILES;
  const names = (raw ? raw.split(',') : ['default']).map(s => s.trim().toLowerCase()).filter(n => PROFILE_NAME.test(n));
  return [...new Set(names)];
}

/** All usable profile names: environment profiles if declared, otherwise stored ones. */
export function listConfiguredProfiles(env: Env = process.env): string[] {
  if (envProfilesDeclared(env)) return listProfiles(env).filter(n => Boolean(env[`${prefix(n)}BASE_URL`]));
  return Object.keys(listStoredProfiles(env)).filter(n => PROFILE_NAME.test(n));
}

function resolveEnvironment(name: string, baseUrl: string, env: Env): InstanceEnvironment {
  const declared = env[`${prefix(name)}ENVIRONMENT`]?.toLowerCase();
  if (declared === 'development' || declared === 'training') return declared;
  if (declared) {
    throw new SafeError('production_not_supported', 'This release connects only to development or training DHIS2 instances.');
  }
  if (looksNonProduction(baseUrl)) return 'development';
  throw new SafeError('environment_unconfirmed',
    `Profile "${name}" is not confirmed as a development or training instance. Run "dhis2-mcp login" (which asks), or set ${prefix(name)}ENVIRONMENT=development or training.`);
}

export function resolveProfile(requested: unknown, env: Env = process.env): ConnectionProfile {
  const available = listConfiguredProfiles(env);
  let name: unknown = requested;
  if (name === undefined) name = available.length === 1 ? available[0] : 'default';
  if (typeof name !== 'string' || !PROFILE_NAME.test(name)) {
    throw new SafeError('invalid_profile', 'Connection profile names must match ^[a-z][a-z0-9_]{0,31}$.');
  }
  if (!available.includes(name)) {
    throw new SafeError(available.length ? 'unknown_profile' : 'not_set_up',
      available.length
        ? `Connection profile "${name}" is not set up. Available: ${available.join(', ')}.`
        : 'DHIS2 is not set up yet. Ask the person to run "npx -y dhis2-mcp login" in a terminal and type their DHIS2 address, username and password.');
  }

  if (envProfilesDeclared(env)) {
    const p = prefix(name);
    const baseUrl = env[`${p}BASE_URL`]!;
    const environment = resolveEnvironment(name, baseUrl, env);
    const token = env[`${p}TOKEN`];
    const username = env[`${p}USERNAME`];
    const password = env[`${p}PASSWORD`];
    if (token) {
      registerSecret(token);
      return { name, baseUrl, auth: { type: 'token', token }, username: undefined, environment, source: 'environment' };
    }
    if (username && password) {
      registerSecret(password);
      return { name, baseUrl, auth: { type: 'basic', username, password }, username, environment, source: 'environment' };
    }
    throw new SafeError('profile_incomplete',
      `Connection profile "${name}" needs ${p}TOKEN, or both ${p}USERNAME and ${p}PASSWORD, in the MCP launch environment.`);
  }

  const stored = listStoredProfiles(env)[name]!;
  if (stored.environment !== 'development' && stored.environment !== 'training') {
    throw new SafeError('production_not_supported', 'This release connects only to development or training DHIS2 instances.');
  }
  let password: string | undefined;
  try { password = readStoredSecret(name, env); } catch { password = undefined; }
  if (!password) {
    throw new SafeError('secret_unavailable', `The saved password for "${name}" could not be read. Ask the person to run "npx -y dhis2-mcp login" again.`);
  }
  registerSecret(password);
  return {
    name, baseUrl: stored.baseUrl, auth: { type: 'basic', username: stored.username, password },
    username: stored.username, environment: stored.environment, source: 'store',
  };
}

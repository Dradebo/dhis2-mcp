/**
 * Connection profiles resolved from the MCP launch environment (mission BASE-01).
 *
 * The model only ever supplies a profile name. Instance URL and credentials come
 * from environment variables set by the operator when the host launches the MCP:
 *
 *   DHIS2_MCP_PROFILES=dev,training          (optional; defaults to "default")
 *   DHIS2_MCP_<PROFILE>_BASE_URL=https://...
 *   DHIS2_MCP_<PROFILE>_TOKEN=d2pat_...      (personal access token; preferred)
 *   or DHIS2_MCP_<PROFILE>_USERNAME + DHIS2_MCP_<PROFILE>_PASSWORD
 *
 * Errors name variables, never their values. Resolved secrets are registered for
 * redaction from every outbound message.
 */
import { registerSecret, SafeError } from './safe-errors.js';

export type DHIS2Auth =
  | { type: 'basic'; username: string; password: string }
  | { type: 'token'; token: string };

export interface ConnectionProfile {
  name: string;
  baseUrl: string;
  auth: DHIS2Auth;
  /** Username for display/audit when known (basic auth); undefined for tokens. */
  username: string | undefined;
}

const PROFILE_NAME = /^[a-z][a-z0-9_]{0,31}$/;
type Env = Record<string, string | undefined>;

function prefix(name: string): string {
  return `DHIS2_MCP_${name.toUpperCase()}_`;
}

/** Profile names the operator has declared. Names only — no URLs or credentials. */
export function listProfiles(env: Env = process.env): string[] {
  const raw = env.DHIS2_MCP_PROFILES;
  const names = (raw ? raw.split(',') : ['default']).map(s => s.trim().toLowerCase()).filter(n => PROFILE_NAME.test(n));
  return [...new Set(names)];
}

/** Profiles that have at least a base URL configured. */
export function listConfiguredProfiles(env: Env = process.env): string[] {
  return listProfiles(env).filter(n => Boolean(env[`${prefix(n)}BASE_URL`]));
}

export function resolveProfile(requested: unknown, env: Env = process.env): ConnectionProfile {
  const name = requested === undefined ? 'default' : requested;
  if (typeof name !== 'string' || !PROFILE_NAME.test(name)) {
    throw new SafeError('invalid_profile', 'Connection profile names must match ^[a-z][a-z0-9_]{0,31}$.');
  }
  if (!listProfiles(env).includes(name)) {
    throw new SafeError('unknown_profile', `Connection profile "${name}" is not declared by the operator (DHIS2_MCP_PROFILES).`);
  }
  const p = prefix(name);
  const baseUrl = env[`${p}BASE_URL`];
  if (!baseUrl) {
    throw new SafeError('profile_incomplete', `Connection profile "${name}" has no ${p}BASE_URL in the MCP launch environment.`);
  }
  const token = env[`${p}TOKEN`];
  const username = env[`${p}USERNAME`];
  const password = env[`${p}PASSWORD`];
  if (token) {
    registerSecret(token);
    return { name, baseUrl, auth: { type: 'token', token }, username: undefined };
  }
  if (username && password) {
    registerSecret(password);
    return { name, baseUrl, auth: { type: 'basic', username, password }, username };
  }
  throw new SafeError('profile_incomplete',
    `Connection profile "${name}" needs ${p}TOKEN, or both ${p}USERNAME and ${p}PASSWORD, in the MCP launch environment.`);
}

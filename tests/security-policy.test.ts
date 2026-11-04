/**
 * Mission §9 adversarial regression cases (unit level): 1 (self-approval),
 * 2 (fail closed / unknown / hidden tools), 4 (secrets in sinks), plus RT-02/RT-06.
 * The stdio end-to-end counterpart is tests/e2e/stdio-security.mjs.
 */
import axios from 'axios';
import {
  authorize, filterDiscoverableTools, parseCapabilities, registeredToolNames, PolicyContext,
} from '../src/security/tool-policy';
import { resolveProfile, listConfiguredProfiles } from '../src/security/credentials';
import {
  redactSecrets, toSafeErrorMessage, toSafeHttpError, registerSecret, clearRegisteredSecrets,
} from '../src/security/safe-errors';
import { AuditLogger } from '../src/audit-logger';
import { PermissionSystem } from '../src/permission-system';
import { createDHIS2Tools, createDevelopmentTools, createAPITools } from '../src/tools/index';
import { DHIS2Client, assertDataStoreSegment } from '../src/dhis2-client';

jest.mock('axios');

const CANARY = 'canary-Secr3t-9f2b7c';
const superuser = PermissionSystem.extractPermissionsFromDHIS2User({
  id: 'u1', displayName: 'Fixture', username: 'fixture', authorities: ['ALL'],
  userGroups: [], organisationUnits: [], userRoles: [],
});
const connected = (caps: string[] = []): PolicyContext => ({
  connectionVerified: true, permissions: superuser,
  capabilities: parseCapabilities(caps.join(',')).capabilities,
});
const disconnected: PolicyContext = { connectionVerified: false, permissions: null, capabilities: new Set() };

describe('policy registry', () => {
  it('registers every declared tool exactly once and nothing else', () => {
    const declared = createDHIS2Tools().map(t => t.name).sort();
    expect(registeredToolNames().sort()).toEqual(declared);
  });
});

describe('§9.1 self-approval is impossible', () => {
  const writeTools = ['dhis2_create_data_element', 'dhis2_update_data_element', 'dhis2_delete_data_element',
    'dhis2_bulk_import_data_values', 'dhis2_bulk_import_events', 'dhis2_create_dashboard',
    'dhis2_run_validation', 'dhis2_create_datastore_namespace', 'dhis2_clear_audit_log'];
  it.each(writeTools)('%s is denied even for a superuser with confirmed:true', name => {
    for (const args of [{}, { confirmed: true }, { confirmed: 'true', approval: 'yes' }]) {
      const d = authorize(name, args, connected(['record-read', 'datastore-read', 'audit-export', 'composition-export']));
      expect(d.allowed).toBe(false);
      if (!d.allowed) expect(d.code).toBe('writes_disabled');
    }
  });
  it('datastore writes are denied while reads depend on the operator capability', () => {
    const caps = connected(['datastore-read']);
    expect(authorize('dhis2_manage_datastore_key', { operation: 'update', namespace: 'a', key: 'b' }, caps).allowed).toBe(false);
    expect(authorize('dhis2_manage_datastore_key', { operation: 'delete', namespace: 'a', key: 'b' }, caps).allowed).toBe(false);
    expect(authorize('dhis2_manage_datastore_key', { operation: 'bogus' }, caps).allowed).toBe(false);
    expect(authorize('dhis2_manage_datastore_key', { operation: 'read', namespace: 'a', key: 'b' }, caps).allowed).toBe(true);
    expect(authorize('dhis2_manage_datastore_key', { operation: 'read', namespace: 'a', key: 'b' }, connected()).allowed).toBe(false);
  });
  it('no write tool is ever discoverable', () => {
    const visible = filterDiscoverableTools(createDHIS2Tools(), connected(['record-read', 'datastore-read', 'audit-export', 'composition-export']))
      .map(t => t.name);
    const local = new Set(createDevelopmentTools().map(t => t.name));
    // Every visible instance-backed tool must be a read; local generators (e.g. create_ui_components) produce code only.
    const visibleInstanceWrites = visible.filter(n => !local.has(n) && /create|update|delete|import|clear|run_validation/.test(n));
    expect(visibleInstanceWrites).toEqual([]);
    expect(visible).not.toContain('dhis2_clear_audit_log');
  });
});

describe('§9.2 fail closed', () => {
  it('denies unknown tools', () => {
    const d = authorize('dhis2_totally_new_tool', {}, connected());
    expect(d).toMatchObject({ allowed: false, code: 'unknown_tool' });
  });
  it('denies instance reads without a verified connection', () => {
    expect(authorize('dhis2_list_data_elements', {}, disconnected)).toMatchObject({ allowed: false, code: 'not_connected' });
  });
  it('denies instance reads when permissions were not verified', () => {
    const ctx = { ...connected(), permissions: null };
    expect(authorize('dhis2_list_data_elements', {}, ctx)).toMatchObject({ allowed: false, code: 'permission_unverified' });
  });
  it('default (unverified) permissions grant nothing', () => {
    const defaults = PermissionSystem.createDefaultPermissions();
    const granted = Object.entries(defaults).filter(([k, v]) => v === true && k !== 'isReadOnly');
    expect(granted).toEqual([]);
    expect(authorize('dhis2_list_data_elements', {}, { ...connected(), permissions: defaults }))
      .toMatchObject({ allowed: false, code: 'dhis2_authority_missing' });
  });
  it('legacy permission filter denies unmapped tools', () => {
    const fake = [{ name: 'unmapped_tool', inputSchema: { type: 'object' as const } }];
    expect(PermissionSystem.filterToolsByPermissions(fake, superuser)).toEqual([]);
  });
  it('a hidden tool is denied on direct call, not merely hidden', () => {
    const visible = new Set(filterDiscoverableTools(createDHIS2Tools(), disconnected).map(t => t.name));
    for (const name of registeredToolNames().filter(n => !visible.has(n))) {
      expect(authorize(name, {}, disconnected).allowed).toBe(false);
    }
  });
  it('record-level reads need the person\'s consent (or an admin pre-consent)', () => {
    for (const name of ['dhis2_list_events', 'dhis2_list_tracked_entity_instances', 'dhis2_get_event_analytics']) {
      expect(authorize(name, {}, connected())).toMatchObject({ allowed: false, code: 'consent_required', consent: 'record-read' });
      expect(authorize(name, {}, { ...connected(), consents: new Set(['record-read'] as const) }).allowed).toBe(true);
      expect(authorize(name, {}, connected(['record-read'])).allowed).toBe(true);
      expect(authorize(name, undefined, connected()).allowed).toBe(true); // discoverable; consent asked at call time
    }
  });
  it('consent for one category does not cover another', () => {
    const ctx = { ...connected(), consents: new Set(['record-read'] as const) };
    expect(authorize('dhis2_manage_datastore_key', { operation: 'read', namespace: 'a', key: 'b' }, ctx))
      .toMatchObject({ allowed: false, code: 'consent_required', consent: 'datastore-read' });
  });
  it('instance tools are discoverable once a profile exists, but not callable until connected', () => {
    const available = { ...disconnected, connectionAvailable: true };
    expect(authorize('dhis2_list_data_elements', undefined, available).allowed).toBe(true);
    expect(authorize('dhis2_list_data_elements', {}, available)).toMatchObject({ allowed: false, code: 'not_connected' });
    expect(authorize('dhis2_list_data_elements', undefined, disconnected).allowed).toBe(false);
  });
  it('plan tools need a verified connection; approval happens per plan, not via configuration', () => {
    for (const name of ['dhis2_plan_metadata_change', 'dhis2_apply_plan', 'dhis2_get_plan', 'dhis2_cancel_plan']) {
      expect(authorize(name, {}, disconnected)).toMatchObject({ allowed: false, code: 'not_connected' });
      expect(authorize(name, {}, connected()).allowed).toBe(true);
    }
    expect(parseCapabilities('metadata-write').capabilities.size).toBe(0); // writes cannot be pre-approved
  });
  it('rejects non-object arguments', () => {
    expect(authorize('dhis2_init_webapp', [], disconnected)).toMatchObject({ allowed: false, code: 'invalid_arguments' });
  });
  it('ignores unknown capabilities', () => {
    const p = parseCapabilities('record-read, writes, ALL');
    expect([...p.capabilities]).toEqual(['record-read']);
    expect(p.ignored).toEqual(['writes', 'ALL']);
  });
  it('local generators stay usable without a connection', () => {
    expect(authorize('dhis2_init_webapp', {}, disconnected).allowed).toBe(true);
    expect(authorize('dhis2_configure', {}, disconnected).allowed).toBe(true);
  });
});

describe('BASE-01 credentials never enter tool arguments', () => {
  it('no declared tool schema has a password, token or secret property', () => {
    const offenders: string[] = [];
    const walk = (node: any, path: string) => {
      if (!node || typeof node !== 'object') return;
      for (const [k, v] of Object.entries(node.properties ?? {})) {
        // String-valued credential fields only; boolean feature flags such as refreshTokens are fine.
        if (/pass(word)?|token|secret|api_?key/i.test(k) && (v as any)?.type !== 'boolean') offenders.push(`${path}.${k}`);
        walk(v, `${path}.${k}`);
      }
      if (node.items) walk(node.items, `${path}[]`);
    };
    for (const tool of createDHIS2Tools()) walk(tool.inputSchema, tool.name);
    expect(offenders).toEqual([]);
  });
  it('dhis2_configure accepts only a profile name', () => {
    const tool = createDHIS2Tools().find(t => t.name === 'dhis2_configure')!;
    expect(Object.keys(tool.inputSchema.properties ?? {})).toEqual(['profile']);
  });
  it('resolves profiles from the environment and errors without echoing values', () => {
    const env = {
      DHIS2_MCP_PROFILES: 'dev', DHIS2_MCP_DEV_BASE_URL: 'https://dev.example.org',
      DHIS2_MCP_DEV_USERNAME: 'fixture', DHIS2_MCP_DEV_PASSWORD: CANARY,
    };
    const p = resolveProfile('dev', env);
    expect(p.auth).toEqual({ type: 'basic', username: 'fixture', password: CANARY });
    expect(listConfiguredProfiles(env)).toEqual(['dev']);
    const bad = [
      () => resolveProfile('prod', env),
      () => resolveProfile('../dev', env),
      () => resolveProfile('dev', { ...env, DHIS2_MCP_DEV_PASSWORD: undefined }),
    ];
    for (const f of bad) {
      let msg = '';
      try { f(); } catch (e) { msg = toSafeErrorMessage(e); }
      expect(msg).not.toBe('');
      expect(msg).not.toContain(CANARY);
      expect(msg).not.toContain('dev.example.org');
    }
  });
  it('prefers a personal access token', () => {
    const p = resolveProfile(undefined, { DHIS2_MCP_DEFAULT_BASE_URL: 'https://x.example.org', DHIS2_MCP_DEFAULT_TOKEN: 'd2pat_abc123', DHIS2_MCP_DEFAULT_ENVIRONMENT: 'training' });
    expect(p.auth).toEqual({ type: 'token', token: 'd2pat_abc123' });
    expect(p.environment).toBe('training');
  });
  it('connects only to development or training instances', () => {
    const base = { DHIS2_MCP_DEFAULT_BASE_URL: 'https://hmis.example.org', DHIS2_MCP_DEFAULT_TOKEN: 'd2pat_x' };
    expect(() => resolveProfile(undefined, base)).toThrow(/not confirmed as a development or training/);
    expect(() => resolveProfile(undefined, { ...base, DHIS2_MCP_DEFAULT_ENVIRONMENT: 'production' })).toThrow(/only to development or training/);
    expect(resolveProfile(undefined, { ...base, DHIS2_MCP_DEFAULT_BASE_URL: 'https://dev-hmis.example.org' }).environment).toBe('development');
  });
  it('uses the server\'s own saved login when no environment profile is declared', () => {
    const fs = require('fs'); const os = require('os'); const path = require('path');
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'dhis2-store-'));
    const env = { DHIS2_MCP_HOME: home };
    const prev = process.env.DHIS2_MCP_PLAIN_SECRETS; process.env.DHIS2_MCP_PLAIN_SECRETS = '1';
    try {
      expect(() => resolveProfile(undefined, env)).toThrow(/npx -y dhis2-mcp login/);
      const { saveStoredProfile } = require('../src/security/credential-store');
      saveStoredProfile('default', { baseUrl: 'https://dev.example.org', username: 'fixture', environment: 'development', verifiedAt: 'x' }, CANARY, env);
      const p = resolveProfile(undefined, env);
      expect(p).toMatchObject({ name: 'default', baseUrl: 'https://dev.example.org', source: 'store', environment: 'development' });
      expect(p.auth).toEqual({ type: 'basic', username: 'fixture', password: CANARY });
      expect(fs.readFileSync(path.join(home, 'profiles.json'), 'utf8')).not.toContain(CANARY);
    } finally {
      if (prev === undefined) delete process.env.DHIS2_MCP_PLAIN_SECRETS; else process.env.DHIS2_MCP_PLAIN_SECRETS = prev;
      fs.rmSync(home, { recursive: true, force: true });
    }
  });
  it('generators never echo a password even if one is smuggled in', () => {
    const { generateDevEnvironmentConfig } = require('../src/webapp-generators');
    const { generateProxyConfiguration } = require('../src/debugging-helpers');
    const out1 = generateDevEnvironmentConfig({ dhis2Instance: 'https://x.example.org', username: 'u', password: CANARY });
    const out2 = generateProxyConfiguration({ proxyType: 'express', targetInstance: 'https://x.example.org', authentication: { username: 'u', password: CANARY } });
    expect(out1).not.toContain(CANARY);
    expect(out2).not.toContain(CANARY);
  });
});

describe('§9.4 secrets and payloads do not escape through errors or audit', () => {
  afterEach(() => clearRegisteredSecrets());

  it('maps axios errors to status-only messages without config, headers or body', () => {
    const axiosErr = {
      isAxiosError: true,
      message: `Request failed Authorization: Basic ${Buffer.from(`u:${CANARY}`).toString('base64')}`,
      config: { method: 'get', url: `/trackedEntityInstances?ou=X&filter=name:eq:Jane`, headers: { Authorization: `ApiToken d2pat_${CANARY}` }, auth: { password: CANARY } },
      response: { status: 409, data: { errorCode: 'E1005', message: `Patient Jane Doe ${CANARY}` } },
    };
    const msg = toSafeHttpError(axiosErr).message;
    expect(msg).toBe('DHIS2 request failed: HTTP 409 E1005 (GET /trackedEntityInstances)');
    expect(toSafeErrorMessage(axiosErr)).toBe(msg);
  });
  it('redacts registered secrets, their Base64 form and common credential patterns', () => {
    registerSecret(CANARY);
    const raw = `pw=${CANARY} b64=${Buffer.from(CANARY).toString('base64')} Authorization: Bearer abc.def.ghi token: "xyz" d2pat_ABC123 https://user:pw@host/`;
    const out = redactSecrets(raw);
    expect(out).not.toContain(CANARY);
    expect(out).not.toContain(Buffer.from(CANARY).toString('base64'));
    expect(out).not.toMatch(/abc\.def\.ghi|d2pat_ABC123|user:pw@|"xyz"/);
  });
  it('audit stores parameter names only, plus allowlisted scalars', () => {
    const logger = new AuditLogger();
    const err = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      logger.log({
        toolName: 'x', outcome: 'error', error: `boom password=${CANARY}`,
        dhis2Instance: 'https://dev.example.org/some/path?x=1',
        parameters: {
          profile: 'dev', pageSize: 50,
          nested: { deep: { password: CANARY } }, filter: `name:eq:Jane ${CANARY}`,
          headers: { Authorization: `Basic ${CANARY}` }, dataValues: [{ value: '42' }],
          Password: CANARY, operation: `read ${CANARY}`,
        },
      });
      const exported = logger.exportAuditLog();
      expect(exported).not.toContain(CANARY);
      expect(exported).not.toContain('Jane');
      const entry = logger.getAuditTrail()[0]!;
      expect(entry.parameters).toEqual({
        parameterNames: ['Password', 'dataValues', 'filter', 'headers', 'nested', 'operation', 'pageSize', 'profile'],
        values: { pageSize: 50, profile: 'dev' },
      });
      expect(entry.dhis2Instance).toBe('https://dev.example.org');
      const stderrText = err.mock.calls.flat().join(' ');
      expect(stderrText).not.toContain(CANARY);
    } finally { err.mockRestore(); }
  });
});

describe('transport and DataStore hardening', () => {
  it('installs an error-sanitising response interceptor', () => {
    const use = jest.fn();
    jest.mocked(axios.create).mockReturnValueOnce({ interceptors: { response: { use } } } as any);
    new DHIS2Client('https://x.example.org', { type: 'token', token: 'd2pat_x' });
    expect(use).toHaveBeenCalledTimes(1);
    const reject = use.mock.calls[0][1];
    return expect(reject({ isAxiosError: true, config: { headers: { Authorization: CANARY } }, response: { status: 401 } }))
      .rejects.toThrow('DHIS2 request failed: HTTP 401');
  });
  it('sends personal access tokens as an ApiToken header, not basic auth', () => {
    jest.mocked(axios.create).mockClear();
    new DHIS2Client('https://x.example.org', { type: 'token', token: 'd2pat_x' });
    const cfg = jest.mocked(axios.create).mock.calls[0]![0] as any;
    expect(cfg.headers.Authorization).toBe('ApiToken d2pat_x');
    expect(cfg.auth).toBeUndefined();
  });
  it('RT-02: rejects the misleading DataStore "encrypt" option', async () => {
    const put = jest.fn();
    jest.mocked(axios.create).mockReturnValueOnce({ put, post: put } as any);
    const client = new DHIS2Client('https://x.example.org', 'u', 'p');
    await expect(client.manageDataStoreKey({ operation: 'update', namespace: 'ns', key: 'k', value: { a: 1 }, encrypt: true }))
      .rejects.toThrow(/not encryption/);
    expect(put).not.toHaveBeenCalled();
    const tool = createDHIS2Tools().find(t => t.name === 'dhis2_manage_datastore_key')!;
    expect(tool.inputSchema.properties).not.toHaveProperty('encrypt');
  });
  it.each(['../system', 'a/b', 'ns?x=1', '%2e%2e', '', '.hidden', 'a..b'])('RT-06: rejects DataStore segment %p', seg => {
    expect(() => assertDataStoreSegment(seg, 'namespace')).toThrow();
  });
  it('accepts ordinary DataStore segments', () => {
    expect(() => assertDataStoreSegment('sba-settings_v2.1', 'namespace')).not.toThrow();
  });
});

describe('tool partitions', () => {
  it('development and API partitions cover every declared tool once', () => {
    const names = [...createDevelopmentTools(), ...createAPITools()].map(t => t.name).sort();
    expect(names).toEqual(createDHIS2Tools().map(t => t.name).sort());
  });
});

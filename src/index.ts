#!/usr/bin/env node

import { withResultLimit } from './result-limit.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CompleteRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'node:fs';
import { PackageEngine, PackageError, describePackage, checkPackageOffline, PACKAGE_LIMITS } from './package-engine.js';
import { summariseFindings } from './design-check.js';
import { generateUid } from './security/plans.js';
import { GUIDES, PROMPTS, getPrompt } from './workflow.js';
const VERSION_GUIDE = { uri: 'dhis2://guides/version-differences', name: 'DHIS2 version differences',
  description: 'What differs on the connected DHIS2 version, and the workaround where a feature is missing (never "upgrade the server").' };
import { DHIS2Client } from './dhis2-client.js';
import { createDevelopmentTools, createAPITools } from './tools/index.js';
import { auditLogger } from './audit-logger.js';
import { authorize, filterDiscoverableTools, parseCapabilities, PolicyContext, ConsentCategory, CONSENT_TEXT } from './security/tool-policy.js';
import { resolveProfile, listConfiguredProfiles, profileEnvironments, ConnectionProfile } from './security/credentials.js';
import { toSafeErrorMessage } from './security/safe-errors.js';
import { ChangeEngine, ChangeEngineError, describePlan, ApprovalResult, ConnectionIdentity } from './change-engine.js';
import { TransferEngine, TransferError, describeTransfer } from './transfer.js';
import { DhisVersion, describeVersion, effectiveRelease, parseVersion, versionGuide, versionStatus } from './versions.js';
import { ProjectEngine, ProjectError, describeProject } from './project.js';
import { OperationEngine, OperationError, describeOperation, OpKindName } from './operations.js';
import { aggregateKind } from './ops/aggregate.js';
import { trackerKind } from './ops/tracker.js';
import { sharingKind } from './ops/sharing.js';
import { JobEngine, JobError, describeJob } from './jobs.js';
import { storeDir } from './security/credential-store.js';
import { PermissionSystem, UserPermissions } from './permission-system.js';
import { describePermissionEvidence } from './permission-evidence.js';
import { ParameterCompletion } from './parameter-completion.js';
import { MultiServerComposition } from './multi-server-composition.js';
import {
  generateWebAppInitInstructions,
  generateManifestContent,
  generateBuildSystemConfig,
  generateDevEnvironmentConfig,
  generateAppRuntimeConfig,
  generateAuthenticationPatterns,
  generateUIComponents,
  generateUIFormPatterns,
  generateUIDataDisplayPatterns,
  generateUINavigationLayout,
  generateDesignSystemConfig,
  generateAndroidMaterialForm,
  generateAndroidListAdapter,
  generateAndroidNavigationDrawer,
  generateAndroidBottomSheet,
  generateTestSetup
} from './webapp-generators.js';
import {
  diagnoseCORSIssues,
  generateCORSConfiguration,
  debugAuthentication,
  generateProxyConfiguration,
  resolveBuildIssues,
  generatePerformanceOptimizations,
  validateEnvironment,
  generateMigrationGuide
} from './debugging-helpers.js';
import {
  generateAndroidProjectInit,
  generateGradleBuildConfig,
  generateSyncConfiguration,
  generateLocationServicesConfig,
  generateStorageConfiguration,
  generateCameraConfiguration,
  generateAndroidAuthenticationConfig,
  generateDataModelsConfiguration,
  generateAndroidTestingConfiguration,
  generateAndroidUIConfiguration,
  generateOfflineAnalyticsConfiguration,
  generateNotificationsConfiguration,
  generatePerformanceOptimizationConfiguration
} from './android-generators.js';

function filterUndefinedValues<T extends Record<string, any>>(obj: T): Partial<T> {
  const filtered: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      filtered[key as keyof T] = value;
    }
  }
  return filtered;
}

// Helper function to add audit logging to successful operations
function logSuccessfulOperation(toolName: string, params: Record<string, any>, result: any, startTime: number, resourcesAffected?: string[]) {
  auditLogger.log({
    toolName,
    parameters: params,
    outcome: 'success',
    dhis2Instance: dhis2Client?.baseURL,
    userId: currentUser?.username,
    executionTime: Date.now() - startTime,
    ...(resourcesAffected && { resourcesAffected })
  });
}

const server = new Server(
  {
    name: 'dhis2-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      completions: {},
      prompts: {},
      resources: {},
    },
  }
);

let dhis2Client: DHIS2Client | null = null;
// Every tool is declared up front; the policy decides what is visible and callable.
let tools: Tool[] = [...createDevelopmentTools(), ...createAPITools()];
let userPermissions: UserPermissions = PermissionSystem.createDefaultPermissions();
let currentUser: any = null;
let parameterCompletion: ParameterCompletion = new ParameterCompletion(null);
let multiServerComposition: MultiServerComposition = new MultiServerComposition();
let connectionVerified = false;
let activeProfile: string | null = null;
let activeEnvironment: string | null = null;
let activeVersion: DhisVersion | null = null;
/** Why the active connection may not change anything (production, or a DHIS2 version older than supported). */
function readOnlyReason(): string | null {
  if (activeEnvironment === 'production') return 'production';
  if (versionStatus(activeVersion) === 'too-old') return 'unsupported-version';
  return null;
}
const sessionConsents = new Set<ConsentCategory>();

// Operator capabilities come only from the launch environment, never from tool arguments.
const parsedCapabilities = parseCapabilities(process.env.DHIS2_MCP_CAPABILITIES);
if (parsedCapabilities.ignored.length) {
  console.error(`Ignoring unknown DHIS2_MCP_CAPABILITIES entries: ${parsedCapabilities.ignored.join(', ')}`);
}

let connectionEpoch = 0;

function connectionIdentity(): ConnectionIdentity | null {
  if (!connectionVerified || !dhis2Client || !currentUser?.id || !activeProfile) return null;
  return {
    epoch: connectionEpoch,
    userId: String(currentUser.id),
    username: String(currentUser.username ?? currentUser.displayName ?? 'user'),
    profile: activeProfile,
    origin: new URL(dhis2Client.baseURL).origin,
    ...(activeEnvironment ? { environment: activeEnvironment } : {}),
    version: describeVersion(activeVersion),
  };
}

/**
 * Trusted approval: the MCP host shows the plan summary to the user (form
 * elicitation). Tool arguments can never produce an 'accept'.
 */
async function requestHostApproval(message: string): Promise<ApprovalResult> {
  if (!server.getClientCapabilities()?.elicitation?.form) return 'unavailable';
  const result = await server.elicitInput(
    { mode: 'form', message, requestedSchema: { type: 'object', properties: {} } },
    { timeout: 10 * 60 * 1000 },
  );
  return result.action === 'accept' ? 'accept' : result.action === 'decline' ? 'decline' : 'cancel';
}

const planTtl = Math.min(3600, Math.max(5, Number(process.env.DHIS2_MCP_PLAN_TTL_SECONDS) || 900));
const changeEngine = new ChangeEngine({
  gateway: () => (connectionVerified ? dhis2Client : null),
  identity: connectionIdentity,
  approve: requestHostApproval,
  ttlSeconds: planTtl,
});

const packageEngine = new PackageEngine({
  gateway: () => (connectionVerified ? dhis2Client : null),
  identity: connectionIdentity,
  approve: requestHostApproval,
  baseDir: () => storeDir(),
});

/** Package arguments: inline, or a local .json file for large packages. */
function packageArgs(a: Record<string, unknown>): Record<string, unknown> {
  if (typeof a.packageFile !== 'string') return a;
  const file = a.packageFile;
  if (!/\.json$/i.test(file)) throw new PackageError('invalid_package', 'packageFile must be a .json file.');
  let stat: fs.Stats;
  try { stat = fs.statSync(file); } catch { throw new PackageError('invalid_package', 'packageFile was not found.'); }
  if (!stat.isFile() || stat.size > PACKAGE_LIMITS.maxBytes) throw new PackageError('invalid_package', `packageFile must be a file of at most ${PACKAGE_LIMITS.maxBytes / 1048576} MB.`);
  let body: Record<string, unknown>;
  try { body = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { throw new PackageError('invalid_package', 'packageFile is not valid JSON.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new PackageError('invalid_package', 'packageFile must hold an object {description?, creates, updates}.');
  return { description: a.description ?? body.description, creates: body.creates, updates: body.updates };
}

function offlineText(r: ReturnType<typeof checkPackageOffline>): string {
  const counts = Object.entries(r.counts).map(([t, c]) => `${t}: ${[c.create ? `${c.create} new` : '', c.update ? `${c.update} updated` : ''].filter(Boolean).join(', ')}`).join('; ');
  return [
    r.ok ? '✅ Offline checks passed.' : '❌ Offline checks found problems.',
    counts ? `Objects: ${counts}` : '',
    ...(r.problems.length ? ['Structural problems:', ...r.problems.slice(0, 60).map(p => `  - ${p}`)] : []),
    summariseFindings(r.findings),
    r.externalRefs.length ? `References to objects outside the package (must already exist on the server): ${r.externalRefs.length}${r.externalRefs.length <= 40 ? ` (${r.externalRefs.join(', ')})` : ''}` : 'No references outside the package.',
  ].filter(Boolean).join('\n');
}

server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: PROMPTS }));
server.setRequestHandler(GetPromptRequestSchema, async (request) => getPrompt(request.params.name, request.params.arguments as Record<string, string> | undefined));
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [...GUIDES, VERSION_GUIDE].map(g => ({ uri: g.uri, name: g.name, description: g.description, mimeType: 'text/markdown' })),
}));
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  // Generated for the connected server's version (all supported versions when not connected).
  if (request.params.uri === VERSION_GUIDE.uri) {
    return { contents: [{ uri: VERSION_GUIDE.uri, mimeType: 'text/markdown', text: versionGuide(connectionVerified ? activeVersion : null) }] };
  }
  const g = GUIDES.find(x => x.uri === request.params.uri);
  if (!g) throw new Error(`Unknown resource: ${request.params.uri}`);
  return { contents: [{ uri: g.uri, mimeType: 'text/markdown', text: g.text }] };
});

/**
 * Build and verify a candidate connection completely before activating it (RT-04).
 * Any failure leaves no connection active: the previous one is revoked rather than
 * mixed with a new identity, and nothing falls back to default permissions (BASE-03).
 * Credentials come only from the server's store or the operator's environment (BASE-01).
 */
async function connectProfile(requestedProfile: unknown): Promise<ConnectionProfile> {
  const profile = resolveProfile(requestedProfile);
  connectionEpoch++;
  changeEngine.invalidateAll();
  sessionConsents.clear();
  dhis2Client = null;
  connectionVerified = false;
  currentUser = null;
  activeProfile = null;
  activeEnvironment = null;
  activeVersion = null;
  userPermissions = PermissionSystem.createDefaultPermissions();
  parameterCompletion = new ParameterCompletion(null);

  // The version is read first (through a read-only client): it decides request shapes and
  // whether this server may be changed at all (older than the supported range: read-only).
  const probe = new DHIS2Client(profile.baseUrl, profile.auth, undefined, { readOnly: true });
  await probe.testConnection();
  const version = await probe.detectVersion();
  // Production, and versions older than supported, get a transport that refuses every non-GET request.
  const candidate = new DHIS2Client(profile.baseUrl, profile.auth, undefined,
    { readOnly: profile.environment === 'production' || versionStatus(version) === 'too-old' });
  candidate.version = version;
  const candidateUser = await candidate.getCurrentUser();
  if (!candidateUser || typeof candidateUser !== 'object' || !candidateUser.id) {
    throw new Error('DHIS2 user could not be verified; connection not activated.');
  }
  const candidatePermissions = PermissionSystem.extractPermissionsFromDHIS2User({
    ...candidateUser,
    authorities: Array.isArray(candidateUser.authorities) ? candidateUser.authorities : [],
    userRoles: Array.isArray(candidateUser.userRoles) ? candidateUser.userRoles
      : Array.isArray(candidateUser.userCredentials?.userRoles) ? candidateUser.userCredentials.userRoles : [],
  });

  dhis2Client = candidate;
  currentUser = candidateUser;
  userPermissions = candidatePermissions;
  activeProfile = profile.name;
  activeEnvironment = profile.environment;
  activeVersion = version;
  connectionVerified = true;
  parameterCompletion = new ParameterCompletion(dhis2Client);
  return profile;
}

/** Ask the person (through the MCP host) to allow a sensitive category for this connection. */
async function requestConsent(category: ConsentCategory, toolName: string): Promise<ApprovalResult> {
  if (!server.getClientCapabilities()?.elicitation?.form) return 'unavailable';
  const origin = dhis2Client ? new URL(dhis2Client.baseURL).origin : 'DHIS2';
  const result = await server.elicitInput({
    mode: 'form',
    message: `Allow the assistant to ${CONSENT_TEXT[category]} on ${activeEnvironment ?? 'the'} server ${origin}?\n` +
      `This permission lasts until the assistant reconnects. Requested by: ${toolName}.`,
    requestedSchema: { type: 'object', properties: {} },
  }, { timeout: 10 * 60 * 1000 });
  return result.action === 'accept' ? 'accept' : result.action === 'decline' ? 'decline' : 'cancel';
}

const transferEngine = new TransferEngine({
  source: () => {
    const who = connectionIdentity();
    return connectionVerified && dhis2Client && who ? { gw: dhis2Client, who, environment: activeEnvironment } : null;
  },
  openTarget: async (requested) => {
    let name = requested;
    if (!name) {
      const prod = Object.entries(profileEnvironments()).filter(([, e]) => e === 'production').map(([n]) => n);
      if (prod.length !== 1) {
        throw new TransferError('target_unknown', prod.length
          ? `Several production servers are set up (${prod.join(', ')}); say which one receives the transfer (targetProfile).`
          : 'No production server is set up. Ask the person to run "npx -y dhis2-mcp-server login" and choose "production" for it (it will be read-only).');
      }
      name = prod[0];
    }
    const target = resolveProfile(name);
    // Always read-only, whatever the target's environment: the assistant never imports.
    const client = new DHIS2Client(target.baseUrl, target.auth, undefined, { readOnly: true });
    await client.testConnection();
    await client.detectVersion();
    return { gw: client, profile: target.name, environment: target.environment, origin: new URL(target.baseUrl).origin };
  },
  approve: requestHostApproval,
  baseDir: () => storeDir(),
});

const operationEngine = new OperationEngine<DHIS2Client>({
  gateway: () => (connectionVerified ? dhis2Client : null),
  identity: connectionIdentity,
  approve: requestHostApproval,
  baseDir: () => storeDir(),
}, [aggregateKind, trackerKind, sharingKind]);

const jobEngine = new JobEngine({
  gateway: () => (connectionVerified ? dhis2Client : null),
  identity: connectionIdentity,
  approve: requestHostApproval,
  baseDir: () => storeDir(),
});

/** Data import arguments: inline, or a local .json file for large imports. */
function dataImportArgs(a: Record<string, unknown>): { kind: OpKindName; input: Record<string, unknown> } {
  let body: Record<string, unknown> = a;
  if (typeof a.dataFile === 'string') {
    const file = a.dataFile;
    if (!/\.json$/i.test(file)) throw new OperationError('invalid', 'dataFile must be a .json file.');
    let stat: fs.Stats;
    try { stat = fs.statSync(file); } catch { throw new OperationError('invalid', 'dataFile was not found.'); }
    if (!stat.isFile() || stat.size > 32 * 1024 * 1024) throw new OperationError('invalid', 'dataFile must be a file of at most 32 MB.');
    try { body = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { throw new OperationError('invalid', 'dataFile is not valid JSON.'); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new OperationError('invalid', 'dataFile must hold an object.');
    body = { ...body, ...(a.description !== undefined ? { description: a.description } : {}), ...(a.acknowledgeDuplicates !== undefined ? { acknowledgeDuplicates: a.acknowledgeDuplicates } : {}) };
  }
  const hasAgg = body.dataValues !== undefined;
  const hasTracker = ['trackedEntities', 'enrollments', 'events'].some(k => body[k] !== undefined);
  if (hasAgg === hasTracker) throw new OperationError('invalid', 'Give either dataValues (aggregate) or trackedEntities/enrollments/events (tracker), not both and not neither.');
  return { kind: hasAgg ? 'aggregate-data' : 'tracker-data', input: body };
}

const projectEngine = new ProjectEngine({
  baseDir: () => storeDir(),
  ask: async (message, requestedSchema) => {
    if (!server.getClientCapabilities()?.elicitation?.form) return { action: 'unavailable' };
    const r = await server.elicitInput({ mode: 'form', message, requestedSchema: requestedSchema as any }, { timeout: 30 * 60 * 1000 });
    return { action: r.action === 'accept' ? 'accept' : r.action === 'decline' ? 'decline' : 'cancel', content: (r.content ?? {}) as Record<string, unknown> };
  },
});

function policyContext(): PolicyContext {
  let connectionAvailable = false;
  try { connectionAvailable = listConfiguredProfiles().length > 0; } catch { connectionAvailable = false; }
  return {
    connectionVerified: connectionVerified && dhis2Client !== null,
    connectionAvailable,
    consents: sessionConsents,
    environment: connectionVerified ? activeEnvironment : null,
    readOnly: connectionVerified ? readOnlyReason() : null,
    permissions: connectionVerified ? userPermissions : null,
    capabilities: parsedCapabilities.capabilities,
  };
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  // Discovery uses the same policy decision as dispatch (mission RT-01).
  return {
    tools: filterDiscoverableTools(tools, policyContext()),
  };
});

server.setRequestHandler(CompleteRequestSchema, async (request) => {
  const { ref, argument } = request.params;
  
  try {
    // Extract current argument values from context for tool-specific completions
    const context = argument?.name ? { [argument.name]: argument.value } : {};
    const toolName = typeof ref === 'object' && 'name' in ref ? (ref as any).name : '';
    const argumentName = argument?.name || '';
    const partialValue = typeof argument?.value === 'string' ? argument.value : undefined;

    // Completions are a disclosure surface too (mission RT-05): only for tools the
    // policy currently allows, and never for an unregistered/denied tool.
    if (!toolName || !authorize(toolName, undefined, policyContext()).allowed) {
      return { completion: { values: [], hasMore: false } };
    }
    
    const completion = await parameterCompletion.getCompletion(toolName, argumentName, partialValue);
    
    // Also try tool-specific completions
    if (toolName && argumentName) {
      const toolSpecific = await parameterCompletion.getToolSpecificCompletion(
        toolName,
        argumentName,
        context
      );
      
      if (toolSpecific.values.length > 0) {
        completion.values = [...toolSpecific.values, ...completion.values];
      }
    }
    
    return {
      completion: {
        values: completion.values.slice(0, 50), // Limit to 50 suggestions
        hasMore: completion.values.length > 50
      }
    };
  } catch (error) {
    console.error(`Error in completion handler: ${toSafeErrorMessage(error)}`);
    return {
      completion: {
        values: [],
        hasMore: false
      }
    };
  }
});

server.setRequestHandler(CallToolRequestSchema, withResultLimit(async (request) => {
  const { name, arguments: args } = request.params;
  const startTime = Date.now();

  // Connect on first use when a profile is set up, so agents never need a setup step.
  if (!connectionVerified && name !== 'dhis2_configure' && createAPITools().some(t => t.name === name)
      && policyContext().connectionAvailable) {
    try {
      await connectProfile(undefined);
    } catch (error) {
      const msg = toSafeErrorMessage(error);
      auditLogger.log({ toolName: name, parameters: {}, outcome: 'error', error: `auto-connect: ${msg}` });
      return { content: [{ type: 'text', text: `❌ Could not connect to DHIS2: ${msg}` }], isError: true };
    }
  }

  // Central authorisation before any handler runs (mission RT-01, BASE-03/04/05).
  // A request-supplied `confirmed` flag is not approval and has no effect.
  let decision = authorize(name, args ?? {}, policyContext());
  if (!decision.allowed && decision.code === 'consent_required' && decision.consent) {
    let answer: ApprovalResult;
    try { answer = await requestConsent(decision.consent, name); } catch { answer = 'unavailable'; }
    if (answer === 'accept') {
      sessionConsents.add(decision.consent);
      decision = authorize(name, args ?? {}, policyContext());
    } else {
      const text = answer === 'unavailable'
        ? `⛔ This needs the person's permission, but this assistant host cannot ask for it. An administrator can pre-approve it by setting DHIS2_MCP_CAPABILITIES=${decision.consent} when the server is launched.`
        : '⛔ The person did not give permission. Do not retry unless they ask you to.';
      auditLogger.log({ toolName: name, parameters: (args ?? {}) as Record<string, any>, outcome: 'error', error: `consent:${answer}` });
      return { content: [{ type: 'text', text }], isError: true };
    }
  }
  if (!decision.allowed) {
    auditLogger.log({
      toolName: name,
      parameters: (args ?? {}) as Record<string, any>,
      outcome: 'error',
      error: `denied:${decision.code}`,
      dhis2Instance: dhis2Client?.baseURL,
    });
    return {
      content: [{ type: 'text', text: `⛔ Denied by MCP policy (${decision.code}): ${decision.reason}` }],
      isError: true,
    };
  }

  try {
    switch (name) {
      case 'dhis2_configure': {
        const { profile: requestedProfile } = (args ?? {}) as { profile?: unknown };
        const profile = await connectProfile(requestedProfile);
        const baseUrl = profile.baseUrl;
        const username = currentUser?.username || profile.username || 'token user';
        
        // Log successful connection
        auditLogger.log({
          toolName: name,
          parameters: { profile: profile.name },
          outcome: 'success',
          dhis2Instance: baseUrl,
          userId: currentUser?.username || username,
          executionTime: Date.now() - startTime
        });
        
        const permissionSummary = PermissionSystem.getPermissionSummary(userPermissions);
        
        return {
          content: [
            {
              type: 'text',
              text: `✅ Successfully connected to DHIS2 instance at ${baseUrl}

👤 User: ${currentUser?.displayName || username}
🔐 Permission Level: ${permissionSummary.level} 
📝 ${permissionSummary.description}

🔑 Profile: ${profile.name} (${profile.environment} server, ${profile.source === 'store' ? 'saved login' : 'operator environment'})
🏷️ ${describeVersion(activeVersion)}
🛠️ Tools permitted by MCP policy: ${filterDiscoverableTools(tools, policyContext()).length} of ${tools.length}
   • Reading metadata and aggregate data needs no permission.
   • Individual records, app storage and exports ask the person once per connection.
   • ${profile.environment === 'production'
      ? 'PRODUCTION: read-only. Nothing can be created or changed here; customise on development and use dhis2_prepare_transfer.'
      : readOnlyReason() === 'unsupported-version'
        ? 'READ-ONLY: this DHIS2 version is older than the assistant supports, so nothing is created or changed.'
        : 'Changes go through packages, data and sharing plans; the person approves each one.'}

✅ Allowed Operations:
${permissionSummary.allowedOperations.map(op => `  • ${op}`).join('\n')}

${permissionSummary.restrictedOperations.length > 0 ? `⛔ Restricted Operations:
${permissionSummary.restrictedOperations.map(op => `  • ${op}`).join('\n')}` : ''}

Local MCP policy is not DHIS2 authorisation; the server still enforces its own sharing and authorities.`,
            },
          ],
        };
      }

      default:
        // Defence in depth: the policy gate already requires a verified connection
        // for instance tools.
        if (createAPITools().some(t => t.name === name) && !dhis2Client) {
          return {
            content: [{ type: 'text', text: `❌ The tool \`${name}\` requires a verified DHIS2 connection. Use \`dhis2_configure\` with an operator-defined profile${listConfiguredProfiles().length ? ` (configured: ${listConfiguredProfiles().join(', ')})` : ''}. Never pass credentials in tool arguments.` }],
            isError: true,
          };
        }
        break;
    }

    // At this point, if we reach here for API tools, dhis2Client must be initialized
    // because the earlier check would have returned an error
    switch (name) {
      case 'dhis2_generate_uids': {
        const n = Math.min(1000, Math.max(1, Math.floor(Number((args as any)?.count) || 0)));
        return { content: [{ type: 'text', text: Array.from({ length: n }, generateUid).join('\n') }] };
      }

      case 'dhis2_plan_data':
      case 'dhis2_plan_sharing_change':
      case 'dhis2_apply_operation':
      case 'dhis2_get_operation':
      case 'dhis2_cancel_operation': {
        const a = (args ?? {}) as Record<string, unknown>;
        try {
          let op;
          if (name === 'dhis2_plan_data') { const { kind, input } = dataImportArgs(a); op = await operationEngine.plan(kind, input); }
          else if (name === 'dhis2_plan_sharing_change') op = await operationEngine.plan('sharing', a);
          else if (name === 'dhis2_apply_operation') op = await operationEngine.apply(a.operationId);
          else if (name === 'dhis2_get_operation') op = await operationEngine.get(a.operationId);
          else op = operationEngine.cancel(a.operationId);
          auditLogger.log({ toolName: name, parameters: { operationId: op.id, kind: op.kind, state: op.state },
            outcome: ['verified', 'validated', 'cancelled'].includes(op.state) ? 'success' : 'error',
            dhis2Instance: dhis2Client?.baseURL, userId: currentUser?.username, executionTime: Date.now() - startTime });
          return { content: [{ type: 'text', text: describeOperation(op) }],
            isError: ['invalid', 'failed', 'stale', 'unknown-outcome', 'applied-unverified', 'partial', 'not-applied'].includes(op.state) };
        } catch (e) {
          if (!(e instanceof OperationError)) throw e;
          auditLogger.log({ toolName: name, parameters: { operationId: typeof a.operationId === 'string' ? a.operationId : undefined }, outcome: 'error', error: e.code });
          return { content: [{ type: 'text', text: `⛔ ${e.code}: ${e.message}` }], isError: true };
        }
      }

      case 'dhis2_run_analytics':
      case 'dhis2_get_job': {
        const a = (args ?? {}) as Record<string, unknown>;
        try {
          const job = name === 'dhis2_run_analytics' ? await jobEngine.startAnalytics(a) : await jobEngine.get(a.jobId);
          auditLogger.log({ toolName: name, parameters: { jobId: job.jobId, state: job.state }, outcome: job.state === 'failed' ? 'error' : 'success',
            dhis2Instance: dhis2Client?.baseURL, userId: currentUser?.username, executionTime: Date.now() - startTime });
          return { content: [{ type: 'text', text: describeJob(job) }], isError: job.state === 'failed' };
        } catch (e) {
          if (!(e instanceof JobError)) throw e;
          auditLogger.log({ toolName: name, parameters: {}, outcome: 'error', error: e.code });
          return { content: [{ type: 'text', text: `⛔ ${e.code}: ${e.message}` }], isError: true };
        }
      }

      case 'dhis2_start_project':
      case 'dhis2_record_requirements':
      case 'dhis2_ask_clarifications':
      case 'dhis2_get_project':
      case 'dhis2_write_handover': {
        const a = (args ?? {}) as Record<string, unknown>;
        try {
          let text: string;
          let isError = false;
          if (name === 'dhis2_start_project') text = describeProject(projectEngine.start(a));
          else if (name === 'dhis2_record_requirements') text = describeProject(projectEngine.update(a));
          else if (name === 'dhis2_get_project') text = describeProject(projectEngine.get(a.projectId));
          else if (name === 'dhis2_ask_clarifications') {
            const r = await projectEngine.askClarifications(a);
            text = [`Answered: ${r.answered.length ? r.answered.join(', ') : 'none'}`, `Still open: ${r.pending.length ? r.pending.join(', ') : 'none'}`,
              ...(r.fallback ? [r.fallback] : []), '', describeProject(r.project)].join('\n');
            isError = Boolean(r.fallback);
          } else {
            const r = projectEngine.writeHandover(a.projectId);
            text = [r.complete ? 'Handover written: complete.' : `Handover written: NOT complete, ${r.open.length} open item(s).`,
              ...r.open.slice(0, 30).map(o => `  - ${o}`), `File: ${r.file}`].join('\n');
          }
          auditLogger.log({ toolName: name, parameters: { projectId: typeof a.projectId === 'string' ? a.projectId : undefined }, outcome: isError ? 'error' : 'success', executionTime: Date.now() - startTime });
          return { content: [{ type: 'text', text }], isError };
        } catch (e) {
          if (!(e instanceof ProjectError)) throw e;
          auditLogger.log({ toolName: name, parameters: { projectId: typeof a.projectId === 'string' ? a.projectId : undefined }, outcome: 'error', error: e.code });
          return { content: [{ type: 'text', text: `⛔ ${e.code}: ${e.message}` }], isError: true };
        }
      }

      case 'dhis2_check_design': {
        try {
          const raw = (args ?? {}) as Record<string, unknown>;
          const { version: requested, ...rest } = raw;
          const a = packageArgs(rest);
          const asked = requested !== undefined ? parseVersion(String(requested)) : null;
          if (requested !== undefined && !asked) return { content: [{ type: 'text', text: '⛔ version must look like "2.40" or "2.41.10".' }], isError: true };
          const release = asked ? effectiveRelease(asked) : connectionVerified && activeVersion ? effectiveRelease(activeVersion) : undefined;
          const r = checkPackageOffline({ ...a, description: typeof a.description === 'string' && a.description.trim() ? a.description : 'design check' }, release);
          const note = release === undefined ? 'DHIS2 version not known: version-specific rules were skipped (give version, or connect first).'
            : `Checked against DHIS2 2.${release} rules.`;
          return { content: [{ type: 'text', text: `${offlineText(r)}\n${note}` }], isError: !r.ok };
        } catch (e) {
          if (!(e instanceof PackageError)) throw e;
          return { content: [{ type: 'text', text: `⛔ ${e.code}: ${e.message}` }], isError: true };
        }
      }

      case 'dhis2_plan_package':
      case 'dhis2_apply_package':
      case 'dhis2_get_package':
      case 'dhis2_cancel_package': {
        const a = (args ?? {}) as Record<string, unknown>;
        try {
          if (name === 'dhis2_plan_package') {
            const { pkg, offline } = await packageEngine.plan(packageArgs(a));
            if (!pkg) {
              auditLogger.log({ toolName: name, parameters: {}, outcome: 'error', error: 'offline_checks' });
              return { content: [{ type: 'text', text: `${offlineText(offline)}\n\nNothing was sent to DHIS2. Fix the errors and plan again.` }], isError: true };
            }
            auditLogger.log({ toolName: name, parameters: { packageId: pkg.id, state: pkg.state }, outcome: pkg.state === 'validated' ? 'success' : 'error',
              dhis2Instance: dhis2Client?.baseURL, userId: currentUser?.username, executionTime: Date.now() - startTime });
            return { content: [{ type: 'text', text: describePackage(pkg) }], isError: pkg.state !== 'validated' };
          }
          const pkg = name === 'dhis2_apply_package' ? await packageEngine.apply(a.packageId)
            : name === 'dhis2_get_package' ? await packageEngine.get(a.packageId)
            : packageEngine.cancel(a.packageId);
          auditLogger.log({ toolName: name, parameters: { packageId: pkg.id, state: pkg.state },
            outcome: ['verified', 'validated', 'cancelled'].includes(pkg.state) ? 'success' : 'error',
            dhis2Instance: dhis2Client?.baseURL, userId: currentUser?.username, executionTime: Date.now() - startTime,
            ...(name === 'dhis2_apply_package' ? { resourcesAffected: pkg.targets.slice(0, 200).map(t => `${t.objectType}/${t.id}`) } : {}) });
          return { content: [{ type: 'text', text: describePackage(pkg) }],
            isError: ['invalid', 'failed', 'stale', 'unknown-outcome', 'applied-unverified', 'partial'].includes(pkg.state) };
        } catch (e) {
          if (!(e instanceof PackageError)) throw e;
          auditLogger.log({ toolName: name, parameters: { packageId: typeof a.packageId === 'string' ? a.packageId : undefined }, outcome: 'error', error: e.code });
          return { content: [{ type: 'text', text: `⛔ ${e.code}: ${e.message}` }], isError: true };
        }
      }

      case 'dhis2_get_schema': {
        const t = String((args as any)?.objectType ?? '');
        const schema = await dhis2Client!.getTypeSchema(t);
        if (!schema) return { content: [{ type: 'text', text: `No schema named "${t.slice(0, 40)}" on this server.` }], isError: true };
        const props = Array.isArray((schema as any).properties) ? (schema as any).properties : [];
        const lines = props.filter((p: any) => p.writable || p.required).sort((x: any, y: any) => Number(y.required) - Number(x.required) || String(x.fieldName ?? x.name).localeCompare(String(y.fieldName ?? y.name)))
          .map((p: any) => `- ${p.fieldName ?? p.name}: ${p.propertyType}${p.collection ? `[${p.itemPropertyType ?? ''}]` : ''}${p.required ? ' REQUIRED' : ''}${p.owner === false && (p.collection || p.propertyType === 'REFERENCE') ? ' (not owned: set on the other side)' : ''}${p.unique ? ' unique' : ''}${p.length && p.length < 100000 ? ` max ${p.length}` : ''}${Array.isArray(p.constants) && p.constants.length ? ` one of ${p.constants.join('|')}` : ''}`);
        return { content: [{ type: 'text', text: [`Schema ${(schema as any).plural ?? t} (${(schema as any).displayName ?? ''})`, ...lines].join('\n') }] };
      }

      case 'dhis2_find_reusable': {
        const t = String((args as any)?.objectType ?? '');
        const q = String((args as any)?.query ?? '').replace(/[^\p{L}\p{N} _-]/gu, ' ').trim().slice(0, 80);
        if (!q) return { content: [{ type: 'text', text: 'query must contain words to match.' }], isError: true };
        const extra: Record<string, string[]> = {
          dataElements: ['valueType', 'domainType', 'aggregationType', 'optionSet[id,name]', 'categoryCombo[id,name]'],
          trackedEntityAttributes: ['valueType', 'optionSet[id,name]', 'unique'],
          optionSets: ['valueType', 'options[code,name]'], categoryCombos: ['dataDimensionType', 'categories[id,name]'],
          indicators: ['numerator', 'denominator', 'indicatorType[id,name]'], programIndicators: ['expression', 'filter', 'program[id,name]', 'analyticsType'],
          legendSets: ['legends[name,startValue,endValue]'], programs: ['programType'],
        };
        const rows = await dhis2Client!.findReusable(t, q, extra[t] ?? []);
        return { content: [{ type: 'text', text: rows.length ? `${rows.length} candidate(s) in ${t} for "${q}":\n${JSON.stringify(rows, null, 1).slice(0, 12000)}` : `No ${t} match "${q}".` }] };
      }

      case 'dhis2_validate_expression': {
        const kind = (args as any)?.kind;
        const expr = String((args as any)?.expression ?? '');
        if (!['programIndicatorExpression', 'programIndicatorFilter', 'indicator', 'validationRule'].includes(kind) || !expr || expr.length > 20000) {
          return { content: [{ type: 'text', text: 'kind must be one of programIndicatorExpression, programIndicatorFilter, indicator, validationRule, and expression must be 1-20000 characters.' }], isError: true };
        }
        const r = await dhis2Client!.describeExpression(kind, expr);
        return { content: [{ type: 'text', text: `${r.status}${r.message ? `: ${r.message}` : ''}${r.description ? `\nReads as: ${r.description}` : ''}` }], isError: r.status !== 'OK' };
      }

      case 'dhis2_plan_metadata_change':
      case 'dhis2_apply_plan':
      case 'dhis2_get_plan':
      case 'dhis2_cancel_plan': {
        const a = (args ?? {}) as Record<string, unknown>;
        try {
          const plan = name === 'dhis2_plan_metadata_change' ? await changeEngine.createPlan(a)
            : name === 'dhis2_apply_plan' ? await changeEngine.applyPlan(a.planId)
            : name === 'dhis2_get_plan' ? await changeEngine.getPlan(a.planId)
            : changeEngine.cancelPlan(a.planId);
          auditLogger.log({
            toolName: name,
            parameters: { planId: plan.id, state: plan.state },
            outcome: ['invalid', 'failed', 'stale', 'unknown-outcome'].includes(plan.state) ? 'error' : 'success',
            dhis2Instance: dhis2Client?.baseURL,
            userId: currentUser?.username,
            executionTime: Date.now() - startTime,
            resourcesAffected: plan.targets.map(t => `${t.objectType}/${t.id}`),
          });
          return {
            content: [{ type: 'text', text: describePlan(plan) }],
            isError: ['invalid', 'failed', 'stale', 'unknown-outcome', 'applied-unverified', 'partial'].includes(plan.state),
          };
        } catch (e) {
          if (!(e instanceof ChangeEngineError)) throw e;
          auditLogger.log({
            toolName: name,
            parameters: { planId: typeof a.planId === 'string' ? a.planId : undefined },
            outcome: 'error',
            error: `${e.code}`,
            dhis2Instance: dhis2Client?.baseURL,
            userId: currentUser?.username,
          });
          return { content: [{ type: 'text', text: `⛔ ${e.code}: ${e.message}` }], isError: true };
        }
      }

      case 'dhis2_prepare_transfer':
      case 'dhis2_approve_transfer':
      case 'dhis2_verify_transfer':
      case 'dhis2_get_transfer': {
        const a = (args ?? {}) as Record<string, unknown>;
        try {
          const t = name === 'dhis2_prepare_transfer' ? await transferEngine.prepare(a)
            : name === 'dhis2_approve_transfer' ? await transferEngine.approve(a.transferId)
            : name === 'dhis2_verify_transfer' ? await transferEngine.verify(a.transferId)
            : transferEngine.get(a.transferId);
          auditLogger.log({
            toolName: name, parameters: { transferId: t.id, state: t.state }, outcome: 'success',
            dhis2Instance: dhis2Client?.baseURL, userId: currentUser?.username, executionTime: Date.now() - startTime,
          });
          return { content: [{ type: 'text', text: describeTransfer(t) }], isError: t.state === 'stale' || t.state === 'partially-imported' };
        } catch (e) {
          if (!(e instanceof TransferError)) throw e;
          auditLogger.log({ toolName: name, parameters: { transferId: typeof a.transferId === 'string' ? a.transferId : undefined }, outcome: 'error', error: e.code });
          return { content: [{ type: 'text', text: `⛔ ${e.code}: ${e.message}` }], isError: true };
        }
      }

      case 'dhis2_get_system_info':
        const systemInfo = await dhis2Client!.getSystemInfo();
        logSuccessfulOperation(name, {}, systemInfo, startTime);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(systemInfo, null, 2),
            },
          ],
        };

      case 'dhis2_list_data_elements':
        const { filter: deFilter, pageSize: dePageSize } = args as {
          filter?: string;
          pageSize?: number;
        };
        const dataElements = await dhis2Client!.getDataElements(filterUndefinedValues({ filter: deFilter, pageSize: dePageSize, page: (args as { page?: number }).page }));
        logSuccessfulOperation(name, { filter: deFilter, pageSize: dePageSize }, dataElements, startTime);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(dataElements, null, 2),
            },
          ],
        };

      case 'dhis2_list_data_sets':
        const { filter: dsFilter, pageSize: dsPageSize } = args as {
          filter?: string;
          pageSize?: number;
        };
        const dataSets = await dhis2Client!.getDataSets(filterUndefinedValues({ filter: dsFilter, pageSize: dsPageSize, page: (args as { page?: number }).page }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(dataSets, null, 2),
            },
          ],
        };

      case 'dhis2_list_categories':
        const { filter: catFilter, pageSize: catPageSize } = args as {
          filter?: string;
          pageSize?: number;
        };
        const categories = await dhis2Client!.getCategories(filterUndefinedValues({ filter: catFilter, pageSize: catPageSize, page: (args as { page?: number }).page }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(categories, null, 2),
            },
          ],
        };

      case 'dhis2_list_category_options':
        const { filter: coFilter, pageSize: coPageSize } = args as {
          filter?: string;
          pageSize?: number;
        };
        const categoryOptions = await dhis2Client!.getCategoryOptions(filterUndefinedValues({ filter: coFilter, pageSize: coPageSize, page: (args as { page?: number }).page }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(categoryOptions, null, 2),
            },
          ],
        };

      case 'dhis2_list_category_combos':
        const { filter: ccFilter, pageSize: ccPageSize } = args as {
          filter?: string;
          pageSize?: number;
        };
        const categoryCombos = await dhis2Client!.getCategoryCombos(filterUndefinedValues({ filter: ccFilter, pageSize: ccPageSize, page: (args as { page?: number }).page }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(categoryCombos, null, 2),
            },
          ],
        };

      case 'dhis2_list_category_option_combos':
        const { filter: cocFilter, pageSize: cocPageSize } = args as {
          filter?: string;
          pageSize?: number;
        };
        const categoryOptionCombos = await dhis2Client!.getCategoryOptionCombos(filterUndefinedValues({ filter: cocFilter, pageSize: cocPageSize, page: (args as { page?: number }).page }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(categoryOptionCombos, null, 2),
            },
          ],
        };

      case 'dhis2_list_org_units':
        const { filter: ouFilter, pageSize: ouPageSize } = args as {
          filter?: string;
          pageSize?: number;
        };
        const orgUnits = await dhis2Client!.getOrganisationUnits(filterUndefinedValues({ filter: ouFilter, pageSize: ouPageSize, page: (args as { page?: number }).page }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(orgUnits, null, 2),
            },
          ],
        };

      case 'dhis2_list_org_unit_groups':
        const { filter: ougFilter, pageSize: ougPageSize } = args as {
          filter?: string;
          pageSize?: number;
        };
        const orgUnitGroups = await dhis2Client!.getOrganisationUnitGroups(filterUndefinedValues({ filter: ougFilter, pageSize: ougPageSize, page: (args as { page?: number }).page }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(orgUnitGroups, null, 2),
            },
          ],
        };

      case 'dhis2_list_validation_rules':
        const { filter: vrFilter, pageSize: vrPageSize } = args as {
          filter?: string;
          pageSize?: number;
        };
        const validationRules = await dhis2Client!.getValidationRules(filterUndefinedValues({ filter: vrFilter, pageSize: vrPageSize, page: (args as { page?: number }).page }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(validationRules, null, 2),
            },
          ],
        };

      case 'dhis2_get_data_values':
        const dataValueParams = args as any;
        const dataValues = await dhis2Client!.getDataValues(dataValueParams);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(dataValues, null, 2),
            },
          ],
        };

      case 'dhis2_get_analytics':
        const analyticsParams = args as any;
        const analytics = await dhis2Client!.getAnalytics(analyticsParams);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(analytics, null, 2),
            },
          ],
        };

      case 'dhis2_list_programs':
        const { filter: progFilter, pageSize: progPageSize } = args as {
          filter?: string;
          pageSize?: number;
        };
        const programs = await dhis2Client!.getPrograms(filterUndefinedValues({ filter: progFilter, pageSize: progPageSize, page: (args as { page?: number }).page }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(programs, null, 2),
            },
          ],
        };

      case 'dhis2_list_tracked_entity_types':
        const { filter: tetFilter, pageSize: tetPageSize } = args as {
          filter?: string;
          pageSize?: number;
        };
        const trackedEntityTypes = await dhis2Client!.getTrackedEntityTypes(filterUndefinedValues({ filter: tetFilter, pageSize: tetPageSize, page: (args as { page?: number }).page }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(trackedEntityTypes, null, 2),
            },
          ],
        };

      case 'dhis2_list_tracked_entity_attributes':
        const { filter: teaFilter, pageSize: teaPageSize } = args as {
          filter?: string;
          pageSize?: number;
        };
        const trackedEntityAttributes = await dhis2Client!.getTrackedEntityAttributes(filterUndefinedValues({ filter: teaFilter, pageSize: teaPageSize, page: (args as { page?: number }).page }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(trackedEntityAttributes, null, 2),
            },
          ],
        };

      case 'dhis2_list_program_stages':
        const { filter: psFilter, pageSize: psPageSize } = args as {
          filter?: string;
          pageSize?: number;
        };
        const programStages = await dhis2Client!.getProgramStages(filterUndefinedValues({ filter: psFilter, pageSize: psPageSize, page: (args as { page?: number }).page }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(programStages, null, 2),
            },
          ],
        };

      case 'dhis2_list_program_rules':
        const { filter: prFilter, pageSize: prPageSize } = args as {
          filter?: string;
          pageSize?: number;
        };
        const programRules = await dhis2Client!.getProgramRules(filterUndefinedValues({ filter: prFilter, pageSize: prPageSize, page: (args as { page?: number }).page }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(programRules, null, 2),
            },
          ],
        };

      case 'dhis2_list_tracked_entities':
      case 'dhis2_list_enrollments':
      case 'dhis2_list_events': {
        const entity = name === 'dhis2_list_tracked_entities' ? 'trackedEntities' : name === 'dhis2_list_enrollments' ? 'enrollments' : 'events';
        const r = await dhis2Client!.queryTracker(entity, (args ?? {}) as any);
        const countOnly = (args as { countOnly?: boolean }).countOnly === true;
        return { content: [{ type: 'text', text: JSON.stringify(countOnly
          ? { total: r.total ?? null, ...(r.total === undefined ? { note: 'The server did not return a count.' } : {}) }
          : { [entity]: r.records, page: r.page, pageSize: r.pageSize, returned: r.records.length, ...(r.total !== undefined ? { total: r.total } : {}) }, null, 2) }] };
      }

      case 'dhis2_get_event_analytics':
        const eventAnalyticsParams = args as any;
        const eventAnalytics = await dhis2Client!.getEventAnalytics(eventAnalyticsParams);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(eventAnalytics, null, 2),
            },
          ],
        };

      case 'dhis2_get_enrollment_analytics':
        const enrollmentAnalyticsParams = args as any;
        const enrollmentAnalytics = await dhis2Client!.getEnrollmentAnalytics(enrollmentAnalyticsParams);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(enrollmentAnalytics, null, 2),
            },
          ],
        };

      case 'dhis2_get_data_statistics':
        const dataStatistics = await dhis2Client!.getDataStatistics();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(dataStatistics, null, 2),
            },
          ],
        };

      case 'dhis2_list_dashboards':
        const { filter: dbFilter, pageSize: dbPageSize } = args as {
          filter?: string;
          pageSize?: number;
        };
        const dashboards = await dhis2Client!.getDashboards(filterUndefinedValues({ filter: dbFilter, pageSize: dbPageSize, page: (args as { page?: number }).page }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(dashboards, null, 2),
            },
          ],
        };

      case 'dhis2_list_visualizations':
        const { filter: vizFilter, pageSize: vizPageSize } = args as {
          filter?: string;
          pageSize?: number;
        };
        const visualizations = await dhis2Client!.getVisualizations(filterUndefinedValues({ filter: vizFilter, pageSize: vizPageSize, page: (args as { page?: number }).page }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(visualizations, null, 2),
            },
          ],
        };

      case 'dhis2_list_reports':
        const { filter: reportFilter, pageSize: reportPageSize } = args as {
          filter?: string;
          pageSize?: number;
        };
        const reports = await dhis2Client!.getReports(filterUndefinedValues({ filter: reportFilter, pageSize: reportPageSize, page: (args as { page?: number }).page }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(reports, null, 2),
            },
          ],
        };

      case 'dhis2_generate_report':
        const { reportId, ...reportParams } = args as any;
        const generatedReport = await dhis2Client!.generateReport(reportId, reportParams);
        return {
          content: [
            {
              type: 'text',
              text: 'Report generated successfully (binary data)',
            },
          ],
        };

      // Web App Platform Integration Tools
      case 'dhis2_init_webapp':
        const { appName, appTitle, appDescription, namespace, appType, template, typescript, pwa, outputPath } = args as any;
        const initInstructions = generateWebAppInitInstructions(appName, appTitle, appDescription, { namespace, appType, template, typescript, pwa, outputPath });
        return {
          content: [
            {
              type: 'text',
              text: initInstructions,
            },
          ],
        };

      case 'dhis2_configure_app_manifest':
        const manifestArgs = args as any;
        const manifestContent = generateManifestContent(manifestArgs);
        return {
          content: [
            {
              type: 'text',
              text: manifestContent,
            },
          ],
        };

      case 'dhis2_configure_build_system':
        const buildSystemArgs = args as any;
        const buildConfig = generateBuildSystemConfig(buildSystemArgs);
        return {
          content: [
            {
              type: 'text',
              text: buildConfig,
            },
          ],
        };

      case 'dhis2_setup_dev_environment':
        const devEnvArgs = args as any;
        const devEnvConfig = generateDevEnvironmentConfig(devEnvArgs);
        return {
          content: [
            {
              type: 'text',
              text: devEnvConfig,
            },
          ],
        };

      case 'dhis2_generate_app_runtime_config':
        const runtimeConfigArgs = args as any;
        const runtimeConfig = generateAppRuntimeConfig(runtimeConfigArgs);
        return {
          content: [
            {
              type: 'text',
              text: runtimeConfig,
            },
          ],
        };

      case 'dhis2_manage_datastore_key':
        const datastoreKeyArgs = args as any;
        const keyResult = await dhis2Client!.manageDataStoreKey(datastoreKeyArgs);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(keyResult, null, 2),
            },
          ],
        };

      case 'dhis2_setup_authentication_patterns':
        const authArgs = args as any;
        const authPatterns = generateAuthenticationPatterns(authArgs);
        return {
          content: [
            {
              type: 'text',
              text: authPatterns,
            },
          ],
        };

      case 'dhis2_create_ui_components':
        const uiArgs = args as any;
        const uiComponents = generateUIComponents(uiArgs);
        return {
          content: [
            {
              type: 'text',
              text: uiComponents,
            },
          ],
        };

      // Phase 4: UI Library Integration
      case 'dhis2_generate_ui_form_patterns':
        const formArgs = args as any;
        const formCode = generateUIFormPatterns(formArgs);
        return {
          content: [
            { type: 'text', text: formCode }
          ]
        };

      case 'dhis2_generate_ui_data_display':
        const displayArgs = args as any;
        const displayCode = generateUIDataDisplayPatterns(displayArgs);
        return {
          content: [
            { type: 'text', text: displayCode }
          ]
        };

      case 'dhis2_generate_ui_navigation_layout':
        const navArgs = args as any;
        const navCode = generateUINavigationLayout(navArgs);
        return {
          content: [
            { type: 'text', text: navCode }
          ]
        };

      case 'dhis2_generate_design_system':
        const dsArgs = args as any;
        const dsConfig = generateDesignSystemConfig(dsArgs);
        return {
          content: [
            { type: 'text', text: dsConfig }
          ]
        };

      // Android UI pattern tools (Phase 4)
      case 'android_generate_material_form':
        const aFormArgs = args as any;
        const aForm = generateAndroidMaterialForm(aFormArgs);
        return { content: [{ type: 'text', text: aForm }] };

      case 'android_generate_list_adapter':
        const aListArgs = args as any;
        const aList = generateAndroidListAdapter(aListArgs);
        return { content: [{ type: 'text', text: aList }] };

      case 'android_generate_navigation_drawer':
        const aNavArgs = args as any;
        const aNav = generateAndroidNavigationDrawer(aNavArgs);
        return { content: [{ type: 'text', text: aNav }] };

      case 'android_generate_bottom_sheet':
        const aSheetArgs = args as any;
        const aSheet = generateAndroidBottomSheet(aSheetArgs);
        return { content: [{ type: 'text', text: aSheet }] };

      case 'dhis2_generate_test_setup':
        const testArgs = args as any;
        const testSetup = generateTestSetup(testArgs);
        return {
          content: [
            {
              type: 'text',
              text: testSetup,
            },
          ],
        };

      // DHIS2 Debugging and Troubleshooting Tools
      case 'dhis2_diagnose_cors_issues':
        const corsArgs = args as any;
        const corsAnalysis = diagnoseCORSIssues(corsArgs);
        return {
          content: [
            {
              type: 'text',
              text: corsAnalysis,
            },
          ],
        };

      case 'dhis2_configure_cors_allowlist':
        const corsAllowlistArgs = args as any;
        const corsConfig = generateCORSConfiguration(corsAllowlistArgs);
        return {
          content: [
            {
              type: 'text',
              text: corsConfig,
            },
          ],
        };

      case 'dhis2_debug_authentication':
        const authDebugArgs = args as any;
        const authAnalysis = debugAuthentication(authDebugArgs);
        return {
          content: [
            {
              type: 'text',
              text: authAnalysis,
            },
          ],
        };

      case 'dhis2_fix_proxy_configuration':
        const proxyArgs = args as any;
        const proxyConfig = generateProxyConfiguration(proxyArgs);
        return {
          content: [
            {
              type: 'text',
              text: proxyConfig,
            },
          ],
        };

      case 'dhis2_resolve_build_issues':
        const buildIssueArgs = args as any;
        const buildSolution = resolveBuildIssues(buildIssueArgs);
        return {
          content: [
            {
              type: 'text',
              text: buildSolution,
            },
          ],
        };

      case 'dhis2_optimize_performance':
        const perfArgs = args as any;
        const perfOptimizations = generatePerformanceOptimizations(perfArgs);
        return {
          content: [
            {
              type: 'text',
              text: perfOptimizations,
            },
          ],
        };

      case 'dhis2_validate_environment':
        const envArgs = args as any;
        const envValidation = validateEnvironment(envArgs);
        return {
          content: [
            {
              type: 'text',
              text: envValidation,
            },
          ],
        };

      case 'dhis2_migration_assistant':
        const migrationArgs = args as any;
        const migrationGuide = generateMigrationGuide(migrationArgs);
        return {
          content: [
            {
              type: 'text',
              text: migrationGuide,
            },
          ],
        };

      // Phase 3: Android SDK Integration Tools
      case 'dhis2_android_init_project':
        const androidProjectArgs = args as any;
        const androidProjectInstructions = generateAndroidProjectInit(androidProjectArgs);
        return {
          content: [
            {
              type: 'text',
              text: androidProjectInstructions,
            },
          ],
        };

      case 'dhis2_android_configure_gradle':
        const gradleArgs = args as any;
        const gradleConfig = generateGradleBuildConfig(gradleArgs);
        return {
          content: [
            {
              type: 'text',
              text: gradleConfig,
            },
          ],
        };

      case 'dhis2_android_setup_sync':
        const syncArgs = args as any;
        const syncConfig = generateSyncConfiguration(syncArgs);
        return {
          content: [
            {
              type: 'text',
              text: syncConfig,
            },
          ],
        };

      case 'dhis2_android_configure_storage':
        const storageArgs = args as any;
        const storageConfig = generateStorageConfiguration(storageArgs);
        return {
          content: [
            {
              type: 'text',
              text: storageConfig,
            },
          ],
        };

      case 'dhis2_android_setup_location_services':
        const locationArgs = args as any;
        const locationConfig = generateLocationServicesConfig(locationArgs);
        return {
          content: [
            {
              type: 'text',
              text: locationConfig,
            },
          ],
        };

      case 'dhis2_android_configure_camera':
        const cameraArgs = args as any;
        const cameraConfig = generateCameraConfiguration(cameraArgs);
        return {
          content: [
            {
              type: 'text',
              text: cameraConfig,
            },
          ],
        };

      case 'dhis2_android_setup_authentication':
        const androidAuthArgs = args as any;
        const authConfig = generateAndroidAuthenticationConfig(androidAuthArgs);
        return {
          content: [
            {
              type: 'text',
              text: authConfig,
            },
          ],
        };

      case 'dhis2_android_generate_data_models':
        const dataModelsArgs = args as any;
        const dataModelsConfig = generateDataModelsConfiguration(dataModelsArgs);
        return {
          content: [
            {
              type: 'text',
              text: dataModelsConfig,
            },
          ],
        };

      case 'dhis2_android_setup_testing':
        const testingArgs = args as any;
        const testingConfig = generateAndroidTestingConfiguration(testingArgs);
        return {
          content: [
            {
              type: 'text',
              text: testingConfig,
            },
          ],
        };

      case 'dhis2_android_configure_ui_patterns':
        const androidUIArgs = args as any;
        const uiConfig = generateAndroidUIConfiguration(androidUIArgs);
        return {
          content: [
            {
              type: 'text',
              text: uiConfig,
            },
          ],
        };

      case 'dhis2_android_setup_offline_analytics':
        const analyticsArgs = args as any;
        const analyticsConfig = generateOfflineAnalyticsConfiguration(analyticsArgs);
        return {
          content: [
            {
              type: 'text',
              text: analyticsConfig,
            },
          ],
        };

      case 'dhis2_android_configure_notifications':
        const notificationsArgs = args as any;
        const notificationsConfig = generateNotificationsConfiguration(notificationsArgs);
        return {
          content: [
            {
              type: 'text',
              text: notificationsConfig,
            },
          ],
        };

      case 'dhis2_android_performance_optimization':
        const androidPerfArgs = args as any;
        const perfConfig = generatePerformanceOptimizationConfiguration(androidPerfArgs);
        return {
          content: [
            {
              type: 'text',
              text: perfConfig,
            },
          ],
        };

      // System Management and Audit Tools
      case 'dhis2_get_audit_log':
        const { limit = 50 } = args as { limit?: number };
        const auditEntries = auditLogger.getAuditTrail(Math.min(limit, 1000));
        
        // Log successful audit retrieval
        auditLogger.log({
          toolName: name,
          parameters: { limit },
          outcome: 'success',
          dhis2Instance: dhis2Client?.baseURL,
          userId: currentUser?.username,
          executionTime: Date.now() - startTime
        });
        
        return {
          content: [{
            type: 'text',
            text: `📋 Audit Log (${auditEntries.length} entries)\n\n` + 
                  auditEntries.map(entry => 
                    `🕐 ${entry.timestamp}\n` +
                    `🛠️  Tool: ${entry.toolName}\n` +
                    `👤 User: ${entry.userId || 'unknown'}\n` +
                    `${entry.outcome === 'success' ? '✅' : '❌'} Result: ${entry.outcome}${entry.error ? ` - ${entry.error}` : ''}\n` +
                    `⏱️  Duration: ${entry.executionTime || 0}ms\n` +
                    `📍 Instance: ${entry.dhis2Instance || 'N/A'}\n`
                  ).join('\n')
          }]
        };

      case 'dhis2_get_audit_summary':
        const summary = auditLogger.getAuditSummary();
        const permissionSummary = PermissionSystem.getPermissionSummary(userPermissions);
        
        auditLogger.log({
          toolName: name,
          parameters: {},
          outcome: 'success',
          dhis2Instance: dhis2Client?.baseURL,
          userId: currentUser?.username,
          executionTime: Date.now() - startTime
        });
        
        return {
          content: [{
            type: 'text',
            text: `📊 DHIS2 MCP Server Audit Summary

🔢 **Usage Statistics:**
  • Total Operations: ${summary.totalOperations}
  • Successful: ${summary.successCount} (${Math.round((summary.successCount / summary.totalOperations) * 100) || 0}%)
  • Errors: ${summary.errorCount} (${Math.round((summary.errorCount / summary.totalOperations) * 100) || 0}%)

👤 **Current Session:**
  • User: ${currentUser?.displayName || 'Unknown'}
  • Permission Level: ${permissionSummary.level}
  • Available Tools: ${filterDiscoverableTools(tools, policyContext()).length} of ${tools.length}
  • Connected to: ${dhis2Client?.baseURL || 'Not connected'}

🛠️ **Most Used Tools:**
${summary.mostUsedTools.slice(0, 5).map(tool => `  • ${tool.tool}: ${tool.count} times`).join('\n') || '  • No operations yet'}

${summary.recentErrors.length > 0 ? `⚠️  **Recent Errors:**
${summary.recentErrors.slice(0, 3).map(error => `  • ${error.toolName}: ${error.error}`).join('\n')}` : '✅ No recent errors'}`
          }]
        };

      case 'dhis2_export_audit_log':
        const exportData = auditLogger.exportAuditLog();
        
        auditLogger.log({
          toolName: name,
          parameters: {},
          outcome: 'success',
          dhis2Instance: dhis2Client?.baseURL,
          userId: currentUser?.username,
          executionTime: Date.now() - startTime
        });
        
        return {
          content: [{
            type: 'text',
            text: `📤 Audit Log Export\n\n${exportData}`
          }]
        };

      case 'dhis2_clear_audit_log':
        auditLogger.clear();
        
        return {
          content: [{
            type: 'text',
            text: `🗑️ Audit log cleared successfully.`
          }]
        };

      case 'dhis2_get_permission_info':
        const filteredTools = filterDiscoverableTools(tools, policyContext());
        const permInfo = PermissionSystem.getPermissionSummary(userPermissions);
        
        auditLogger.log({
          toolName: name,
          parameters: {},
          outcome: 'success',
          dhis2Instance: dhis2Client?.baseURL,
          userId: currentUser?.username,
          executionTime: Date.now() - startTime
        });
        
        return {
          content: [{
            type: 'text',
            text: `🔐 Permission Information

${describePermissionEvidence(Boolean(dhis2Client), Boolean(currentUser?.id))}

👤 **Cached User Details (if retrieved):**
  • Name: ${currentUser?.displayName || 'Unknown'}
  • Username: ${currentUser?.username || 'Unknown'}
  • User Groups: ${currentUser?.userGroups?.map((g: any) => g.name).join(', ') || 'None'}

🎯 **Local MCP policy level:** ${permInfo.level}
📝 **Description:** ${permInfo.description}

✅ **Local policy permits (not verified instance access):**
${permInfo.allowedOperations.map(op => `  • ${op}`).join('\n')}

${permInfo.restrictedOperations.length > 0 ? `⛔ **Restricted Operations:**
${permInfo.restrictedOperations.map(op => `  • ${op}`).join('\n')}` : ''}

🛠️ **Exposed Tools (discovery only):** ${filteredTools.length} of ${tools.length} total
  • Configuration: ${filteredTools.filter(t => t.name.includes('configure')).length}
  • Data Management: ${filteredTools.filter(t => t.name.includes('list') || t.name.includes('get')).length}
  • Creation Tools: ${filteredTools.filter(t => t.name.includes('create')).length}
  • Analytics: ${filteredTools.filter(t => t.name.includes('analytics')).length}
  • Development: ${filteredTools.filter(t => t.name.includes('init') || t.name.includes('generate')).length}

🔑 **DHIS2 Authorities:** ${userPermissions.authorities.length} authorities assigned`
          }]
        };

      // Multi-Server Composition Tools
      case 'dhis2_get_server_info':
        const serverInfo = multiServerComposition.getServerInfo();
        
        auditLogger.log({
          toolName: name,
          parameters: {},
          outcome: 'success',
          dhis2Instance: dhis2Client?.baseURL,
          userId: currentUser?.username,
          executionTime: Date.now() - startTime
        });
        
        return {
          content: [{
            type: 'text',
            text: `🖥️ DHIS2 MCP Server Information

**Server Details:**
  • Name: ${serverInfo.name}
  • Version: ${serverInfo.version}
  • Composition Mode: ${serverInfo.compositionMode ? 'Enabled' : 'Disabled'}
  
**Description:** ${serverInfo.description}

**Capabilities:**
${serverInfo.capabilities.map(cap => 
  `  • **${cap.domain}** (v${cap.version}): ${cap.operations.join(', ')}`
).join('\n')}

**Compatible MCP Servers:**
${serverInfo.compatibleWith.map(server => `  • ${server}`).join('\n')}

**Currently Registered Servers:** ${multiServerComposition.getCompatibleServers().length}
${multiServerComposition.getCompatibleServers().map(server => 
  `  • ${server.name} v${server.version}: ${server.description}`
).join('\n') || '  • No servers registered yet'}

🔗 **Integration Status:** 
${multiServerComposition.getCompatibleServers().length > 0 ? 
  `✅ Ready for multi-server workflows with ${multiServerComposition.getCompatibleServers().length} registered server(s)` : 
  '⚠️  No compatible servers registered. Use dhis2_register_compatible_server to enable workflows.'
}`
          }]
        };

      case 'dhis2_get_composition_examples':
        const examples = multiServerComposition.generateIntegrationExamples();
        
        auditLogger.log({
          toolName: name,
          parameters: {},
          outcome: 'success',
          dhis2Instance: dhis2Client?.baseURL,
          userId: currentUser?.username,
          executionTime: Date.now() - startTime
        });
        
        return {
          content: [{
            type: 'text',
            text: examples
          }]
        };

      case 'dhis2_register_compatible_server':
        const serverRegistrationArgs = args as {
          name: string;
          version: string;
          capabilities: Array<{ domain: string; operations: string[]; version: string }>;
          description: string;
        };
        
        multiServerComposition.registerCompatibleServer({
          name: serverRegistrationArgs.name,
          version: serverRegistrationArgs.version,
          capabilities: serverRegistrationArgs.capabilities,
          description: serverRegistrationArgs.description,
          compatibleWith: ['dhis2-mcp'],
          compositionMode: true
        });
        
        auditLogger.log({
          toolName: name,
          parameters: serverRegistrationArgs,
          outcome: 'success',
          dhis2Instance: dhis2Client?.baseURL,
          userId: currentUser?.username,
          executionTime: Date.now() - startTime
        });
        
        return {
          content: [{
            type: 'text',
            text: `✅ Successfully registered MCP server: ${serverRegistrationArgs.name} v${serverRegistrationArgs.version}

**Capabilities Added:**
${serverRegistrationArgs.capabilities.map(cap => 
  `  • ${cap.domain}: ${cap.operations.join(', ')}`
).join('\n')}

🔗 **Multi-Server Workflows:** Now enabled with ${multiServerComposition.getCompatibleServers().length} registered server(s)

💡 **Next Steps:**
  • Use dhis2_get_composition_recommendations to see integration suggestions
  • Use dhis2_export_for_composition to share data with other servers
  • Check dhis2_get_composition_examples for workflow ideas`
          }]
        };

      case 'dhis2_get_composition_recommendations':
        const { lastTool } = args as { lastTool?: string };
        const recommendations = multiServerComposition.getCompositionRecommendations(
          lastTool || 'dhis2_general', 
          {}
        );
        
        auditLogger.log({
          toolName: name,
          parameters: { lastTool },
          outcome: 'success',
          dhis2Instance: dhis2Client?.baseURL,
          userId: currentUser?.username,
          executionTime: Date.now() - startTime
        });
        
        return {
          content: [{
            type: 'text',
            text: `💡 Multi-Server Integration Recommendations

${lastTool ? `**Based on your last operation:** ${lastTool}` : '**General Recommendations:**'}

**Suggested Next Steps:**
${recommendations.length > 0 ? 
  recommendations.map(rec => `  • ${rec}`).join('\n') : 
  '  • No specific recommendations for this operation'
}

**Available Compatible Servers:** ${multiServerComposition.getCompatibleServers().length}
${multiServerComposition.getCompatibleServers().map(server => 
  `  • **${server.name}**: ${server.capabilities.map(c => c.domain).join(', ')}`
).join('\n') || '  • Register servers with dhis2_register_compatible_server'}

**Common Integration Patterns:**
  • **Data Quality**: DHIS2 validation → GitHub issues → Slack notifications
  • **Development**: DHIS2 app generation → Git commits → Pull requests
  • **Analytics**: DHIS2 reports → Database storage → Email distribution
  • **Monitoring**: DHIS2 system info → Log aggregation → Alert systems

🔗 Use **dhis2_export_for_composition** to prepare data for other servers.`
          }]
        };

      case 'dhis2_export_for_composition':
        const exportArgs = args as {
          toolName: string;
          data: any;
          targetServer?: string;
          metadata?: Record<string, any>;
        };
        
        const exportContext = multiServerComposition.exportDataForComposition(
          exportArgs.toolName,
          exportArgs.data,
          {
            targetServer: exportArgs.targetServer,
            ...exportArgs.metadata
          }
        );
        
        auditLogger.log({
          toolName: name,
          parameters: exportArgs,
          outcome: 'success',
          dhis2Instance: dhis2Client?.baseURL,
          userId: currentUser?.username,
          executionTime: Date.now() - startTime,
          resourcesAffected: [exportArgs.toolName]
        });
        
        return {
          content: [{
            type: 'text',
            text: `📤 Data Exported for Multi-Server Composition

**Export Details:**
  • Source Tool: ${exportArgs.toolName}
  • Timestamp: ${exportContext.timestamp}
  • Target Server: ${exportArgs.targetServer || 'Any compatible server'}
  • Operation Type: ${exportContext.operationType}

**Standardized Export Format:**
\`\`\`json
${JSON.stringify(exportContext, null, 2)}
\`\`\`

**Compatible Servers:** ${multiServerComposition.getCompatibleServers().map(s => s.name).join(', ') || 'None registered'}

**Next Steps:**
  • Share this exported data with other MCP servers
  • Use the standardized format for workflow automation
  • Check server documentation for import procedures

💡 **Integration Tip:** This format is designed to work seamlessly with GitHub, Slack, Database, and other MCP servers.`
          }]
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    // Log the error
    const safeMessage = toSafeErrorMessage(error);
    auditLogger.log({
      toolName: name,
      parameters: (args ?? {}) as Record<string, any>,
      outcome: 'error',
      error: safeMessage,
      dhis2Instance: dhis2Client?.baseURL,
      userId: currentUser?.username,
      executionTime: Date.now() - startTime
    });

    return {
      content: [
        {
          type: 'text',
          text: `Error: ${safeMessage}`,
        },
      ],
      isError: true,
    };
  }
}));

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('🚀 DHIS2 MCP Server running on stdio');
  console.error('');
  console.error('📋 Available Modes:');
  console.error('  🛠️  Development Mode: Ready! (App building, code generation, testing)');
  console.error('  🔧 API Mode: Use dhis2_configure to connect to DHIS2 instance');
  console.error('');
  console.error('💡 Start with development tools - no DHIS2 connection required!');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
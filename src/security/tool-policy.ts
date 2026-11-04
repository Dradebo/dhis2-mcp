/**
 * Central tool policy (mission W1 / RT-01, BASE-03, BASE-04, BASE-05).
 *
 * Every tool is registered with an operation class. The same decision function
 * drives tool discovery, completions and dispatch, so hiding a tool and denying
 * its invocation can never diverge. Unknown tools are denied.
 *
 * Write, delete and server-side action classes are denied unconditionally until a
 * trusted, host-mediated approval channel exists (mission W2). A model-supplied
 * `confirmed: true` is not approval and is ignored.
 */
import { PermissionSystem, UserPermissions } from '../permission-system.js';

export type OperationClass =
  | 'local'                 // code/doc generation, local info; no instance access
  | 'connect'               // establish a connection from an operator-defined profile
  | 'metadata-read'         // instance metadata reads
  | 'aggregate-read'        // aggregate data, analytics, reports
  | 'record-read'           // individual-level records (tracker, event line lists)
  | 'datastore-read'        // DataStore reads (arbitrary app content)
  | 'local-export'          // exports local evidence to the caller (audit log, composition)
  | 'planned-write'         // plan/apply through the safe change engine (host approval per apply)
  | 'transfer'              // dev→production package: export from dev, compare against production read-only
  | 'instance-write'        // legacy direct create/update/import/server actions: always denied
  | 'instance-delete'
  | 'audit-admin';          // audit retention/deletion

/**
 * Sensitive categories that need the person's consent (asked through the MCP host,
 * once per connection). An administrator may pre-consent at launch via
 * DHIS2_MCP_CAPABILITIES (never through tool arguments). Writes are never
 * pre-consentable: every plan is approved individually by the change engine.
 */
export type Capability = 'record-read' | 'datastore-read' | 'audit-export' | 'composition-export';
export type ConsentCategory = Capability;
const KNOWN_CAPABILITIES: ReadonlySet<Capability> = new Set([
  'record-read', 'datastore-read', 'audit-export', 'composition-export',
]);

export const CONSENT_TEXT: Record<ConsentCategory, string> = {
  'record-read': 'read individual-level records (people, enrollments, events)',
  'datastore-read': 'read DHIS2 app storage (DataStore), which can contain any kind of saved app data',
  'audit-export': 'export the assistant\'s activity log',
  'composition-export': 'export DHIS2 results for use by other connected tools',
};

const HARD_DENIED: ReadonlySet<OperationClass> = new Set(['instance-write', 'instance-delete', 'audit-admin']);
const INSTANCE_CLASSES: ReadonlySet<OperationClass> = new Set([
  'metadata-read', 'aggregate-read', 'record-read', 'datastore-read', 'planned-write', 'transfer', 'instance-write', 'instance-delete',
]);
/** Classes that can change an instance: never allowed on a production connection. */
const WRITE_CLASSES: ReadonlySet<OperationClass> = new Set(['planned-write', 'instance-write', 'instance-delete']);

type Classifier = OperationClass | ((args: Record<string, unknown> | undefined) => OperationClass);

interface PolicyEntry {
  classify: Classifier;
  /** Sensitive category: the person is asked once per connection (or an admin pre-consented). */
  capability?: Capability;
  /** Discovery class used when no arguments are available. */
  discoveryClass?: OperationClass;
}

const local: PolicyEntry = { classify: 'local' };
const metaRead: PolicyEntry = { classify: 'metadata-read' };
const aggRead: PolicyEntry = { classify: 'aggregate-read' };
const recordRead: PolicyEntry = { classify: 'record-read', capability: 'record-read' };
const write: PolicyEntry = { classify: 'instance-write' };
const del: PolicyEntry = { classify: 'instance-delete' };

const DATASTORE_READ_OPS = new Set(['read', 'list']);

const REGISTRY: ReadonlyMap<string, PolicyEntry> = new Map<string, PolicyEntry>([
  ['dhis2_configure', { classify: 'connect' }],

  // Metadata reads
  ['dhis2_get_system_info', metaRead],
  ['dhis2_list_data_elements', metaRead],
  ['dhis2_list_data_sets', metaRead],
  ['dhis2_list_categories', metaRead],
  ['dhis2_list_category_options', metaRead],
  ['dhis2_list_category_combos', metaRead],
  ['dhis2_list_category_option_combos', metaRead],
  ['dhis2_list_org_units', metaRead],
  ['dhis2_list_org_unit_groups', metaRead],
  ['dhis2_list_validation_rules', metaRead],
  ['dhis2_list_programs', metaRead],
  ['dhis2_list_tracked_entity_types', metaRead],
  ['dhis2_list_tracked_entity_attributes', metaRead],
  ['dhis2_list_program_stages', metaRead],
  ['dhis2_list_program_rules', metaRead],
  ['dhis2_list_dashboards', metaRead],
  ['dhis2_list_visualizations', metaRead],
  ['dhis2_list_reports', metaRead],

  // Aggregate reads
  ['dhis2_get_data_values', aggRead],
  ['dhis2_get_analytics', aggRead],
  ['dhis2_get_data_statistics', aggRead],
  ['dhis2_generate_report', aggRead],

  // Individual-level reads: tracker records and event/enrollment *query* analytics
  // (the client calls /analytics/events/query and /analytics/enrollments/query,
  // which return line lists, not aggregates).
  ['dhis2_list_tracked_entity_instances', recordRead],
  ['dhis2_list_enrollments', recordRead],
  ['dhis2_list_events', recordRead],
  ['dhis2_get_event_analytics', recordRead],
  ['dhis2_get_enrollment_analytics', recordRead],

  // Safe change engine: server-held plans, host-mediated approval, read-back.
  ['dhis2_plan_metadata_change', { classify: 'planned-write' }],
  ['dhis2_apply_plan', { classify: 'planned-write' }],
  ['dhis2_get_plan', { classify: 'planned-write' }],
  ['dhis2_cancel_plan', { classify: 'planned-write' }],

  // Development → production transfer (the MCP never writes to production).
  ['dhis2_prepare_transfer', { classify: 'transfer' }],
  ['dhis2_approve_transfer', { classify: 'transfer' }],
  ['dhis2_verify_transfer', { classify: 'transfer' }],
  ['dhis2_get_transfer', { classify: 'transfer' }],

  // Change packages (build-scale changes on development; one approval per package).
  ['dhis2_generate_uids', local],
  ['dhis2_check_design', local],
  ['dhis2_plan_package', { classify: 'planned-write' }],
  ['dhis2_apply_package', { classify: 'planned-write' }],
  ['dhis2_get_package', { classify: 'planned-write' }],
  ['dhis2_cancel_package', { classify: 'planned-write' }],

  // Discovery for design and reuse.
  ['dhis2_get_schema', metaRead],
  ['dhis2_find_reusable', metaRead],
  ['dhis2_validate_expression', metaRead],

  // Legacy direct writes, imports and server-side actions: always denied. Metadata
  // creates/updates go through dhis2_plan_metadata_change + dhis2_apply_plan.
  ['dhis2_create_data_element', write],
  ['dhis2_update_data_element', write],
  ['dhis2_create_data_set', write],
  ['dhis2_create_category', write],
  ['dhis2_create_category_option', write],
  ['dhis2_create_category_combo', write],
  ['dhis2_create_org_unit_group', write],
  ['dhis2_create_validation_rule', write],
  ['dhis2_run_validation', write], // POST /validation; may send notifications
  ['dhis2_bulk_import_data_values', write],
  ['dhis2_create_program', write],
  ['dhis2_create_tracked_entity_type', write],
  ['dhis2_create_tracked_entity_attribute', write],
  ['dhis2_create_program_stage', write],
  ['dhis2_create_program_rule', write],
  ['dhis2_create_tracked_entity_instance', write],
  ['dhis2_create_enrollment', write],
  ['dhis2_create_event', write],
  ['dhis2_bulk_import_events', write],
  ['dhis2_create_dashboard', write],
  ['dhis2_create_visualization', write],
  ['dhis2_create_datastore_namespace', write],
  ['dhis2_delete_data_element', del],
  ['dhis2_manage_datastore_key', {
    classify: args => {
      const op = typeof args?.operation === 'string' ? args.operation : '';
      if (DATASTORE_READ_OPS.has(op)) return 'datastore-read';
      return op === 'delete' ? 'instance-delete' : 'instance-write';
    },
    discoveryClass: 'datastore-read',
    capability: 'datastore-read',
  }],

  // Local audit/permission/composition tools
  ['dhis2_get_audit_log', local],
  ['dhis2_get_audit_summary', local],
  ['dhis2_get_permission_info', local],
  ['dhis2_export_audit_log', { classify: 'local-export', capability: 'audit-export' }],
  ['dhis2_clear_audit_log', { classify: 'audit-admin' }],
  ['dhis2_get_server_info', local],
  ['dhis2_get_composition_examples', local],
  ['dhis2_register_compatible_server', local],
  ['dhis2_get_composition_recommendations', local],
  ['dhis2_export_for_composition', { classify: 'local-export', capability: 'composition-export' }],

  // Code/documentation generators and debugging guides (template output only).
  ...[
    'dhis2_init_webapp', 'dhis2_configure_app_manifest', 'dhis2_configure_build_system',
    'dhis2_setup_dev_environment', 'dhis2_generate_app_runtime_config', 'dhis2_setup_authentication_patterns',
    'dhis2_create_ui_components', 'dhis2_generate_ui_form_patterns', 'dhis2_generate_ui_data_display',
    'dhis2_generate_ui_navigation_layout', 'dhis2_generate_design_system', 'android_generate_material_form',
    'android_generate_list_adapter', 'android_generate_navigation_drawer', 'android_generate_bottom_sheet',
    'dhis2_generate_test_setup', 'dhis2_diagnose_cors_issues', 'dhis2_configure_cors_allowlist',
    'dhis2_debug_authentication', 'dhis2_fix_proxy_configuration', 'dhis2_resolve_build_issues',
    'dhis2_optimize_performance', 'dhis2_validate_environment', 'dhis2_migration_assistant',
    'dhis2_android_init_project', 'dhis2_android_configure_gradle', 'dhis2_android_setup_sync',
    'dhis2_android_configure_storage', 'dhis2_android_setup_location_services', 'dhis2_android_configure_camera',
    'dhis2_android_setup_authentication', 'dhis2_android_generate_data_models', 'dhis2_android_setup_testing',
    'dhis2_android_configure_ui_patterns', 'dhis2_android_setup_offline_analytics',
    'dhis2_android_configure_notifications', 'dhis2_android_performance_optimization',
  ].map(name => [name, local] as [string, PolicyEntry]),
]);

export interface PolicyContext {
  /** True only after a connection was built, tested and the DHIS2 user retrieved. */
  connectionVerified: boolean;
  /** A saved/declared profile exists, so the server can connect on first use. Discovery only. */
  connectionAvailable?: boolean;
  /** Categories the person consented to for the current connection. */
  consents?: ReadonlySet<ConsentCategory>;
  /** Environment of the active connection; 'production' is read-only. */
  environment?: string | null;
  /** Permissions derived from the verified DHIS2 user; null when unverified. */
  permissions: UserPermissions | null;
  capabilities: ReadonlySet<Capability>;
}

export type PolicyDecision =
  | { allowed: true; operationClass: OperationClass }
  | { allowed: false; operationClass: OperationClass | 'unknown'; code: DenialCode; reason: string; consent?: ConsentCategory };

export type DenialCode =
  | 'unknown_tool' | 'writes_disabled' | 'not_connected' | 'permission_unverified'
  | 'dhis2_authority_missing' | 'consent_required' | 'invalid_arguments' | 'production_read_only';

function deny(operationClass: OperationClass | 'unknown', code: DenialCode, reason: string): PolicyDecision {
  return { allowed: false, operationClass, code, reason };
}

export function registeredToolNames(): string[] {
  return [...REGISTRY.keys()];
}

export function isRegistered(name: string): boolean {
  return REGISTRY.has(name);
}

/**
 * Decide whether a tool may run. `args === undefined` means a discovery-time check.
 */
export function authorize(name: string, args: unknown, ctx: PolicyContext): PolicyDecision {
  const entry = REGISTRY.get(name);
  if (!entry) return deny('unknown', 'unknown_tool', `Tool "${name}" is not registered with the MCP policy and is denied.`);

  if (args !== undefined && (args === null || typeof args !== 'object' || Array.isArray(args))) {
    return deny('unknown', 'invalid_arguments', 'Tool arguments must be a JSON object.');
  }
  const argObj = args as Record<string, unknown> | undefined;

  let cls: OperationClass;
  if (typeof entry.classify === 'function') {
    cls = argObj === undefined ? (entry.discoveryClass ?? 'instance-write') : entry.classify(argObj);
  } else {
    cls = entry.classify;
  }

  if (HARD_DENIED.has(cls)) {
    return deny(cls, 'writes_disabled',
      'Direct write, delete, import and audit-deletion tools are disabled. Metadata creates/updates go through dhis2_plan_metadata_change and dhis2_apply_plan, which require approval by the user in the MCP host. A "confirmed" argument is not accepted as approval.');
  }

  const discovery = argObj === undefined;
  if (WRITE_CLASSES.has(cls) && ctx.environment === 'production') {
    return deny(cls, 'production_read_only',
      'This is a production server: the assistant can only read here. Make changes on the development server and transfer them with dhis2_prepare_transfer.');
  }
  if (INSTANCE_CLASSES.has(cls)) {
    // Discovery: instance tools are listed once a profile exists; the server connects on first use.
    if (discovery && !ctx.connectionVerified) {
      return ctx.connectionAvailable ? { allowed: true, operationClass: cls } : deny(cls, 'not_connected', 'DHIS2 is not set up.');
    }
    if (!ctx.connectionVerified) {
      return deny(cls, 'not_connected', 'No verified DHIS2 connection. Use dhis2_configure with an operator-defined connection profile.');
    }
    if (!ctx.permissions) {
      return deny(cls, 'permission_unverified', 'DHIS2 user permissions could not be verified; instance operations are denied.');
    }
    if (!PermissionSystem.hasToolPermission(name, ctx.permissions)) {
      return deny(cls, 'dhis2_authority_missing', 'The connected DHIS2 user lacks the authority this MCP maps to this operation.');
    }
  }

  if (entry.capability && !discovery && !ctx.capabilities.has(entry.capability) && !ctx.consents?.has(entry.capability)) {
    return {
      allowed: false, operationClass: cls, code: 'consent_required', consent: entry.capability,
      reason: `The person must agree before the assistant can ${CONSENT_TEXT[entry.capability]}.`,
    };
  }

  return { allowed: true, operationClass: cls };
}

/** Tools visible in discovery: exactly those a discovery-time authorize() permits. */
export function filterDiscoverableTools<T extends { name: string }>(tools: T[], ctx: PolicyContext): T[] {
  return tools.filter(tool => authorize(tool.name, undefined, ctx).allowed);
}

/** Parse operator capabilities from the launch environment. Unknown entries are ignored. */
export function parseCapabilities(raw: string | undefined): { capabilities: Set<Capability>; ignored: string[] } {
  const capabilities = new Set<Capability>();
  const ignored: string[] = [];
  for (const item of (raw ?? '').split(',').map(s => s.trim()).filter(Boolean)) {
    if (KNOWN_CAPABILITIES.has(item as Capability)) capabilities.add(item as Capability);
    else ignored.push(item.slice(0, 40));
  }
  return { capabilities, ignored };
}

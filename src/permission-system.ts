import { Tool } from '@modelcontextprotocol/sdk/types.js';

export interface UserPermissions {
  // Core permissions
  canCreateMetadata: boolean;
  canUpdateMetadata: boolean;
  canDeleteMetadata: boolean;
  canViewMetadata: boolean;
  
  // Data permissions
  canEnterData: boolean;
  canViewData: boolean;
  canImportData: boolean;
  canExportData: boolean;
  canDeleteData: boolean;
  
  // System permissions
  canManageUsers: boolean;
  canManageSystem: boolean;
  canViewSystemInfo: boolean;
  canRunAnalytics: boolean;
  canManageDashboards: boolean;
  
  // Program permissions
  canManagePrograms: boolean;
  canEnrollTEI: boolean;
  canViewTEI: boolean;
  canManageTrackerData: boolean;
  
  // Mobile/Android permissions
  canUseMobileFeatures: boolean;
  canConfigureMobile: boolean;
  
  // UI/Development permissions
  canUseUITools: boolean;
  canConfigureApps: boolean;
  canDebugApplications: boolean;
  
  // Special permissions
  isReadOnly: boolean;
  authorities: string[];
}

export interface DHIS2UserInfo {
  id: string;
  displayName: string;
  username: string;
  authorities: string[];
  userGroups: Array<{ id: string; name: string }>;
  organisationUnits: Array<{ id: string; name: string }>;
  userRoles: Array<{ 
    id: string; 
    name: string; 
    authorities: string[];
  }>;
}

export class PermissionSystem {
  private static readonly TOOL_PERMISSIONS = new Map<string, keyof UserPermissions | Array<keyof UserPermissions>>([
    // Configuration and connection
    ['dhis2_configure', 'canViewSystemInfo'],
    ['dhis2_get_system_info', 'canViewSystemInfo'],
    
    // Metadata operations - Data Elements
    ['dhis2_list_data_elements', 'canViewMetadata'],
    ['dhis2_create_data_element', 'canCreateMetadata'],
    ['dhis2_update_data_element', 'canUpdateMetadata'],
    ['dhis2_delete_data_element', 'canDeleteMetadata'],
    
    // Metadata operations - Data Sets
    ['dhis2_list_data_sets', 'canViewMetadata'],
    ['dhis2_create_data_set', 'canCreateMetadata'],
    
    // Metadata operations - Categories
    ['dhis2_list_categories', 'canViewMetadata'],
    ['dhis2_create_category', 'canCreateMetadata'],
    ['dhis2_list_category_options', 'canViewMetadata'],
    ['dhis2_create_category_option', 'canCreateMetadata'],
    ['dhis2_list_category_combos', 'canViewMetadata'],
    ['dhis2_create_category_combo', 'canCreateMetadata'],
    ['dhis2_list_category_option_combos', 'canViewMetadata'],
    
    // Organisation Units
    ['dhis2_list_org_units', 'canViewMetadata'],
    ['dhis2_list_org_unit_groups', 'canViewMetadata'],
    ['dhis2_create_org_unit_group', 'canCreateMetadata'],
    
    // Validation Rules
    ['dhis2_list_validation_rules', 'canViewMetadata'],
    ['dhis2_create_validation_rule', 'canCreateMetadata'],
    ['dhis2_run_validation', ['canViewData', 'canRunAnalytics']],
    
    // Data Values
    ['dhis2_get_data_values', 'canViewData'],
    ['dhis2_bulk_import_data_values', 'canImportData'],
    
    // Analytics
    ['dhis2_get_analytics', 'canRunAnalytics'],
    ['dhis2_get_data_statistics', 'canRunAnalytics'],
    
    // Programs (Tracker)
    ['dhis2_list_programs', 'canViewMetadata'],
    ['dhis2_create_program', 'canManagePrograms'],
    ['dhis2_list_tracked_entity_types', 'canViewMetadata'],
    ['dhis2_create_tracked_entity_type', 'canManagePrograms'],
    ['dhis2_list_tracked_entity_attributes', 'canViewMetadata'],
    ['dhis2_create_tracked_entity_attribute', 'canManagePrograms'],
    ['dhis2_list_program_stages', 'canViewMetadata'],
    ['dhis2_create_program_stage', 'canManagePrograms'],
    ['dhis2_list_program_rules', 'canViewMetadata'],
    ['dhis2_create_program_rule', 'canManagePrograms'],
    
    // Tracker Data
    ['dhis2_list_tracked_entity_instances', 'canViewTEI'],
    ['dhis2_create_tracked_entity_instance', 'canEnrollTEI'],
    ['dhis2_list_enrollments', 'canViewTEI'],
    ['dhis2_create_enrollment', 'canEnrollTEI'],
    ['dhis2_list_events', 'canViewTEI'],
    ['dhis2_create_event', 'canManageTrackerData'],
    ['dhis2_bulk_import_events', 'canImportData'],
    ['dhis2_get_event_analytics', 'canRunAnalytics'],
    ['dhis2_get_enrollment_analytics', 'canRunAnalytics'],
    
    // Dashboards and Visualizations
    ['dhis2_list_dashboards', 'canViewData'],
    ['dhis2_create_dashboard', 'canManageDashboards'],
    ['dhis2_list_visualizations', 'canViewData'],
    ['dhis2_create_visualization', 'canManageDashboards'],
    ['dhis2_list_reports', 'canViewData'],
    ['dhis2_generate_report', 'canExportData'],
    
    // Web App Platform Tools
    ['dhis2_init_webapp', 'canConfigureApps'],
    ['dhis2_configure_app_manifest', 'canConfigureApps'],
    ['dhis2_configure_build_system', 'canConfigureApps'],
    ['dhis2_setup_dev_environment', 'canConfigureApps'],
    ['dhis2_generate_app_runtime_config', 'canConfigureApps'],
    ['dhis2_create_datastore_namespace', 'canConfigureApps'],
    ['dhis2_manage_datastore_key', 'canConfigureApps'],
    ['dhis2_setup_authentication_patterns', 'canConfigureApps'],
    ['dhis2_create_ui_components', 'canUseUITools'],
    ['dhis2_generate_test_setup', 'canConfigureApps'],
    
    // Debugging Tools
    ['dhis2_diagnose_cors_issues', 'canDebugApplications'],
    ['dhis2_configure_cors_allowlist', 'canDebugApplications'],
    ['dhis2_debug_authentication', 'canDebugApplications'],
    ['dhis2_fix_proxy_configuration', 'canDebugApplications'],
    ['dhis2_resolve_build_issues', 'canDebugApplications'],
    ['dhis2_optimize_performance', 'canDebugApplications'],
    ['dhis2_validate_environment', 'canDebugApplications'],
    ['dhis2_migration_assistant', 'canDebugApplications'],
    
    // Android SDK Tools
    ['dhis2_android_init_project', 'canUseMobileFeatures'],
    ['dhis2_android_configure_gradle', 'canUseMobileFeatures'],
    ['dhis2_android_setup_sync', 'canConfigureMobile'],
    ['dhis2_android_configure_storage', 'canConfigureMobile'],
    ['dhis2_android_setup_location_services', 'canUseMobileFeatures'],
    ['dhis2_android_configure_camera', 'canUseMobileFeatures'],
    ['dhis2_android_setup_authentication', 'canConfigureMobile'],
    ['dhis2_android_generate_data_models', 'canUseMobileFeatures'],
    ['dhis2_android_setup_testing', 'canUseMobileFeatures'],
    ['dhis2_android_configure_ui_patterns', 'canUseMobileFeatures'],
    ['dhis2_android_setup_offline_analytics', 'canUseMobileFeatures'],
    ['dhis2_android_configure_notifications', 'canUseMobileFeatures'],
    ['dhis2_android_performance_optimization', 'canUseMobileFeatures'],
    
    // UI Library Tools
    ['dhis2_generate_ui_form_patterns', 'canUseUITools'],
    ['dhis2_generate_ui_data_display', 'canUseUITools'],
    ['dhis2_generate_ui_navigation_layout', 'canUseUITools'],
    ['dhis2_generate_design_system', 'canUseUITools'],
    ['android_generate_material_form', 'canUseMobileFeatures'],
    ['android_generate_list_adapter', 'canUseMobileFeatures'],
    ['android_generate_navigation_drawer', 'canUseMobileFeatures'],
    ['android_generate_bottom_sheet', 'canUseMobileFeatures'],
  ]);

  static extractPermissionsFromDHIS2User(userInfo: DHIS2UserInfo): UserPermissions {
    const authorities = new Set(userInfo.authorities);
    
    // Extract role-based authorities
    userInfo.userRoles.forEach(role => {
      role.authorities.forEach(auth => authorities.add(auth));
    });

    return {
      // Metadata permissions
      canCreateMetadata: authorities.has('F_DATAELEMENT_PUBLIC_ADD') || authorities.has('ALL'),
      canUpdateMetadata: authorities.has('F_DATAELEMENT_PRIVATE_ADD') || authorities.has('ALL'),
      canDeleteMetadata: authorities.has('F_DATAELEMENT_DELETE') || authorities.has('ALL'),
      canViewMetadata: authorities.has('F_METADATA_READ') || authorities.has('ALL'),
      
      // Data permissions
      canEnterData: authorities.has('F_DATAVALUE_ADD') || authorities.has('ALL'),
      canViewData: authorities.has('F_DATAVALUE_READ') || authorities.has('ALL'),
      canImportData: authorities.has('F_IMPORT_DATA') || authorities.has('ALL'),
      canExportData: authorities.has('F_EXPORT_DATA') || authorities.has('ALL'),
      canDeleteData: authorities.has('F_DATAVALUE_DELETE') || authorities.has('ALL'),
      
      // System permissions
      canManageUsers: authorities.has('F_USER_ADD') || authorities.has('ALL'),
      canManageSystem: authorities.has('F_SYSTEM_SETTING') || authorities.has('ALL'),
      canViewSystemInfo: true, // Basic permission for connection
      canRunAnalytics: authorities.has('F_ANALYTICS_READ') || authorities.has('ALL'),
      canManageDashboards: authorities.has('F_DASHBOARD_PUBLIC_ADD') || authorities.has('ALL'),
      
      // Program permissions
      canManagePrograms: authorities.has('F_PROGRAM_PUBLIC_ADD') || authorities.has('ALL'),
      canEnrollTEI: authorities.has('F_TEI_CASCADE_DELETE') || authorities.has('F_TRACKED_ENTITY_INSTANCE_ADD') || authorities.has('ALL'),
      canViewTEI: authorities.has('F_TRACKED_ENTITY_INSTANCE_SEARCH') || authorities.has('ALL'),
      canManageTrackerData: authorities.has('F_PROGRAMSTAGE_ADD') || authorities.has('ALL'),
      
      // Development permissions (more permissive for development tools)
      canUseMobileFeatures: !authorities.has('RESTRICT_MOBILE'),
      canConfigureMobile: authorities.has('F_MOBILE_SETTINGS') || authorities.has('ALL'),
      canUseUITools: true, // UI tools are generally safe
      canConfigureApps: authorities.has('F_APP_MANAGEMENT') || authorities.has('ALL'),
      canDebugApplications: authorities.has('F_SYSTEM_SETTING') || authorities.has('ALL'),
      
      // Special flags
      isReadOnly: authorities.has('READONLY_MODE'),
      authorities: Array.from(authorities)
    };
  }

  static createDefaultPermissions(): UserPermissions {
    return {
      canCreateMetadata: true,
      canUpdateMetadata: true,
      canDeleteMetadata: false, // Conservative default
      canViewMetadata: true,
      canEnterData: true,
      canViewData: true,
      canImportData: true,
      canExportData: true,
      canDeleteData: false, // Conservative default
      canManageUsers: false,
      canManageSystem: false,
      canViewSystemInfo: true,
      canRunAnalytics: true,
      canManageDashboards: true,
      canManagePrograms: true,
      canEnrollTEI: true,
      canViewTEI: true,
      canManageTrackerData: true,
      canUseMobileFeatures: true,
      canConfigureMobile: true,
      canUseUITools: true,
      canConfigureApps: true,
      canDebugApplications: true,
      isReadOnly: false,
      authorities: []
    };
  }

  static filterToolsByPermissions(tools: Tool[], permissions: UserPermissions): Tool[] {
    if (permissions.isReadOnly) {
      // In read-only mode, only allow viewing operations
      return tools.filter(tool => 
        !tool.name.includes('create') && 
        !tool.name.includes('update') && 
        !tool.name.includes('delete') &&
        !tool.name.includes('import') &&
        (tool.name.includes('list') || tool.name.includes('get') || tool.name === 'dhis2_configure')
      );
    }

    return tools.filter(tool => {
      const requiredPermissions = this.TOOL_PERMISSIONS.get(tool.name);
      if (!requiredPermissions) {
        // If no specific permission is defined, allow by default
        return true;
      }

      if (Array.isArray(requiredPermissions)) {
        // All permissions in the array must be satisfied
        return requiredPermissions.every(permission => permissions[permission]);
      } else {
        // Single permission must be satisfied
        return permissions[requiredPermissions];
      }
    });
  }

  static getPermissionSummary(permissions: UserPermissions): {
    level: 'read-only' | 'data-entry' | 'metadata-manager' | 'system-admin' | 'developer';
    description: string;
    allowedOperations: string[];
    restrictedOperations: string[];
  } {
    if (permissions.isReadOnly) {
      return {
        level: 'read-only',
        description: 'Read-only access to DHIS2 data and metadata',
        allowedOperations: ['View data', 'List metadata', 'Run analytics'],
        restrictedOperations: ['Create', 'Update', 'Delete', 'Import operations']
      };
    }

    if (permissions.canManageSystem) {
      return {
        level: 'system-admin',
        description: 'Full system administration capabilities',
        allowedOperations: ['All operations', 'User management', 'System configuration'],
        restrictedOperations: []
      };
    }

    if (permissions.canConfigureApps && permissions.canDebugApplications) {
      return {
        level: 'developer',
        description: 'Development and debugging capabilities',
        allowedOperations: ['App development', 'Debugging tools', 'Mobile development', 'UI tools'],
        restrictedOperations: permissions.canDeleteMetadata ? [] : ['Metadata deletion']
      };
    }

    if (permissions.canCreateMetadata) {
      return {
        level: 'metadata-manager',
        description: 'Metadata management and configuration',
        allowedOperations: ['Create/update metadata', 'Manage programs', 'Configure system'],
        restrictedOperations: permissions.canDeleteMetadata ? [] : ['Delete operations']
      };
    }

    return {
      level: 'data-entry',
      description: 'Data entry and basic operations',
      allowedOperations: ['Enter data', 'View reports', 'Basic analytics'],
      restrictedOperations: ['Metadata management', 'System configuration', 'Delete operations']
    };
  }
}
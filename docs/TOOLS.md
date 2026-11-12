# Tools

Generated from the tool definitions in this release (105 tools). The agent sees only the tools the connection allows: a production (read-only) or unsupported-version server gets no change tools.

## Changes (each one approved by the person; development and training servers only) (14)

| Tool | What it does |
|---|---|
| `dhis2_apply_operation` | Apply a planned data import or sharing change. |
| `dhis2_apply_package` | Apply a planned package. |
| `dhis2_apply_plan` | Apply a validated plan. |
| `dhis2_approve_transfer` | Ask the person to approve a prepared transfer in their MCP host. |
| `dhis2_cancel_operation` | Cancel a planned (not yet applied) data import or sharing change. |
| `dhis2_cancel_package` | Cancel a planned package that has not been applied. |
| `dhis2_cancel_plan` | Cancel a validated plan that has not been applied. |
| `dhis2_plan_data` | Plan importing data on the development server: aggregate values (dataValues) OR tracker records (trackedEntities with nested enrollments/events, enrollments, events). |
| `dhis2_plan_metadata_change` | Plan a metadata change (create or update; no deletion, sharing or ownership changes). |
| `dhis2_plan_package` | Plan a change package on the development server: up to 2000 new or updated objects applied together. |
| `dhis2_plan_sharing_change` | Plan a sharing change on the development server: who can see, edit or enter data in objects. |
| `dhis2_prepare_transfer` | Prepare moving finished customisation from the development server to production. |
| `dhis2_run_analytics` | Start analytics table generation on the development server so new data and indicators show in dashboards. |
| `dhis2_verify_transfer` | After a production administrator has imported an approved package, read production and confirm every object matches the package. |

## Projects, requirements and handover (local files) (5)

| Tool | What it does |
|---|---|
| `dhis2_ask_clarifications` | Ask the person up to 5 questions in one form (batch them; never ask piecemeal). |
| `dhis2_get_project` | Show a project's goal, documents, requirement counts and open questions. |
| `dhis2_record_requirements` | Add or update requirements in the ledger (by ref), and record checks you ran. |
| `dhis2_start_project` | Start a customisation project: register the goal and every source document. |
| `dhis2_write_handover` | Write the plain-language handover (handover.md) from the server's own records: requirements with sources, the person's decisions, which work was verified by reading DHIS2 back (fro |

## Design and discovery (no changes) (10)

| Tool | What it does |
|---|---|
| `dhis2_check_design` | Check a draft metadata package offline (no server needed): structure, limits, references, and DHIS2 design rules that otherwise fail silently (option codes vs value types, unsectio |
| `dhis2_find_reusable` | Search existing metadata to reuse before creating new objects (token match on name, code and short name; 25 results). |
| `dhis2_generate_uids` | Generate valid DHIS2 UIDs locally (no server needed), for ids that objects in one package use to reference each other. |
| `dhis2_get_job` | Progress of an analytics run started with dhis2_run_analytics: running, completed or failed, with the latest messages. |
| `dhis2_get_operation` | State, counts and read-back problems of a data import or sharing change. |
| `dhis2_get_package` | Show a package's state, counts, read-back results and file locations. |
| `dhis2_get_plan` | Show a plan's state and receipt. |
| `dhis2_get_schema` | Properties of one metadata type on this server: required, writable, owned collections, enum values and length limits. |
| `dhis2_get_transfer` | Show a transfer's state, counts and file locations. |
| `dhis2_validate_expression` | Ask DHIS2 whether an expression is valid and how it reads (changes nothing). |

## Reading the connected DHIS2 server (38)

| Tool | What it does |
|---|---|
| `dhis2_configure` | Connect to a DHIS2 instance using an operator-defined connection profile. |
| `dhis2_configure_app_manifest` | Generate or update manifest.webapp file for DHIS2 app |
| `dhis2_configure_build_system` | Set up build system configuration for DHIS2 app (d2.config.js, webpack, etc.) |
| `dhis2_configure_cors_allowlist` | Generate instructions and configuration for DHIS2 CORS allowlist setup |
| `dhis2_generate_report` | Generate a report from DHIS2 |
| `dhis2_get_analytics` | Get analytics data from DHIS2 |
| `dhis2_get_audit_log` | Retrieve audit log of all MCP operations performed |
| `dhis2_get_audit_summary` | Get summary statistics of audit log and system usage |
| `dhis2_get_composition_examples` | Get examples of how to integrate this DHIS2 MCP server with other MCP servers |
| `dhis2_get_composition_recommendations` | Get recommendations for integrating the result of the last operation with other MCP servers |
| `dhis2_get_data_statistics` | Get data statistics overview from DHIS2 |
| `dhis2_get_data_values` | Get data values from DHIS2 |
| `dhis2_get_enrollment_analytics` | Get enrollment analytics data from DHIS2 |
| `dhis2_get_event_analytics` | Get event analytics data from DHIS2 |
| `dhis2_get_permission_info` | Get detailed information about current user permissions and available tools |
| `dhis2_get_server_info` | Get information about this MCP server and its composition capabilities |
| `dhis2_get_system_info` | Get system information from the DHIS2 instance |
| `dhis2_list_categories` | List categories from the DHIS2 instance |
| `dhis2_list_category_combos` | List category combinations from the DHIS2 instance |
| `dhis2_list_category_option_combos` | List category option combinations from the DHIS2 instance |
| `dhis2_list_category_options` | List category options from the DHIS2 instance |
| `dhis2_list_dashboards` | List dashboards from the DHIS2 instance |
| `dhis2_list_data_elements` | List data elements from the DHIS2 instance |
| `dhis2_list_data_sets` | List data sets from the DHIS2 instance |
| `dhis2_list_enrollments` | List enrollments of a program through the tracker API (version-aware). |
| `dhis2_list_events` | List events of a program through the tracker API (version-aware). |
| `dhis2_list_org_unit_groups` | List organisation unit groups from the DHIS2 instance |
| `dhis2_list_org_units` | List organisation units from the DHIS2 instance |
| `dhis2_list_program_rules` | List program rules from the DHIS2 instance |
| `dhis2_list_program_stages` | List program stages from the DHIS2 instance |
| `dhis2_list_programs` | List programs from the DHIS2 instance |
| `dhis2_list_reports` | List reports from the DHIS2 instance |
| `dhis2_list_tracked_entities` | List tracked entities (people, households, ...) through the tracker API, using the parameter names of the connected DHIS2 version. |
| `dhis2_list_tracked_entity_attributes` | List tracked entity attributes from the DHIS2 instance |
| `dhis2_list_tracked_entity_types` | List tracked entity types from the DHIS2 instance |
| `dhis2_list_validation_rules` | List validation rules from the DHIS2 instance |
| `dhis2_list_visualizations` | List visualizations from the DHIS2 instance |
| `dhis2_manage_datastore_key` | Create, read, update, or delete DataStore key-value pairs |

## App development helpers (no DHIS2 connection needed) (38)

| Tool | What it does |
|---|---|
| `android_generate_bottom_sheet` | Generate Android bottom sheet component (Compose) |
| `android_generate_list_adapter` | Generate Android RecyclerView adapter and layout for DHIS2-style lists |
| `android_generate_material_form` | Generate Android Jetpack Compose form patterns (Material Design) |
| `android_generate_navigation_drawer` | Generate Android navigation drawer pattern (Compose) |
| `dhis2_android_configure_camera` | Set up camera and media capture capabilities for DHIS2 Android app |
| `dhis2_android_configure_gradle` | Generate Gradle build configuration for DHIS2 Android SDK integration |
| `dhis2_android_configure_notifications` | Set up push notifications and local notifications for DHIS2 Android app |
| `dhis2_android_configure_storage` | Set up local storage and database configuration for DHIS2 Android app |
| `dhis2_android_configure_ui_patterns` | Generate Android UI patterns and components for DHIS2 apps |
| `dhis2_android_generate_data_models` | Generate Android data model classes and repositories for DHIS2 entities |
| `dhis2_android_init_project` | Initialize a new Android project with DHIS2 SDK integration |
| `dhis2_android_performance_optimization` | Generate performance optimization patterns and monitoring for DHIS2 Android app |
| `dhis2_android_setup_authentication` | Configure authentication and security patterns for DHIS2 Android app |
| `dhis2_android_setup_location_services` | Configure GPS and location services for DHIS2 Android app |
| `dhis2_android_setup_offline_analytics` | Configure offline analytics and reporting capabilities for DHIS2 Android app |
| `dhis2_android_setup_sync` | Configure offline-first data synchronization patterns for DHIS2 Android app |
| `dhis2_android_setup_testing` | Configure testing framework and generate test patterns for DHIS2 Android app |
| `dhis2_clear_audit_log` | Clear the audit log (requires confirmation) |
| `dhis2_create_ui_components` | Generate common UI components using DHIS2 UI library patterns |
| `dhis2_debug_authentication` | Debug authentication issues including login failures, session management, and cookie problems |
| `dhis2_diagnose_cors_issues` | Diagnose and provide solutions for CORS (Cross-Origin Resource Sharing) issues in DHIS2 app development |
| `dhis2_export_audit_log` | Export complete audit log as JSON for compliance reporting |
| `dhis2_export_for_composition` | Export the result of a DHIS2 operation in a format suitable for other MCP servers |
| `dhis2_fix_proxy_configuration` | Generate proxy configuration and fixes for local development against DHIS2 instances |
| `dhis2_generate_app_runtime_config` | Generate configuration for DHIS2 App Runtime integration |
| `dhis2_generate_design_system` | Generate design system tokens (palette, typography, spacing) and dark mode support |
| `dhis2_generate_test_setup` | Generate testing setup and example tests for DHIS2 app |
| `dhis2_generate_ui_data_display` | Generate @dhis2/ui data display patterns (tables, cards, lists, modal, loading states) |
| `dhis2_generate_ui_form_patterns` | Generate @dhis2/ui form patterns (inputs, validation, date picker, file upload, multi-select) |
| `dhis2_generate_ui_navigation_layout` | Generate @dhis2/ui navigation and layout patterns (header bar, sidebar, breadcrumbs, tabs) |
| `dhis2_init_webapp` | Initialize a new DHIS2 web application project with proper scaffolding |
| `dhis2_migration_assistant` | Assist with migrating from deprecated d2 library to modern App Platform |
| `dhis2_optimize_performance` | Identify and fix performance issues in DHIS2 web applications |
| `dhis2_register_compatible_server` | Register information about a compatible MCP server for composition workflows |
| `dhis2_resolve_build_issues` | Diagnose and resolve common DHIS2 app build and bundling issues |
| `dhis2_setup_authentication_patterns` | Generate authentication patterns and examples for DHIS2 app |
| `dhis2_setup_dev_environment` | Set up development environment for DHIS2 app with proper proxy and hot reload |
| `dhis2_validate_environment` | Validate and troubleshoot DHIS2 development environment setup |

# DHIS2 MCP Server

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![DHIS2](https://img.shields.io/badge/DHIS2-0080FF?style=for-the-badge&logo=dhis2&logoColor=white)](https://dhis2.org/)
[![MCP](https://img.shields.io/badge/MCP-Model_Context_Protocol-purple?style=for-the-badge)](https://modelcontextprotocol.io/)

> **🚀 Production Ready**: A comprehensive Model Context Protocol (MCP) server for DHIS2 development and management, providing 60+ tools for complete DHIS2 Web API coverage, app development, and community-driven debugging solutions.

## ✨ Features

### 🏗️ **Complete DHIS2 Web API Coverage**
- **Aggregate Data Model**: Data elements, data sets, categories, validation rules
- **Event/Tracker Data Model**: Programs, tracked entities, events, enrollments  
- **Analytics & Reporting**: Dashboards, visualizations, event analytics
- **Bulk Operations**: Mass data import/export with validation
- **System Management**: Connection handling, system info, statistics

### 🛡️ **Production Grade**
- **Type Safety**: Comprehensive TypeScript interfaces with strict mode
- **Error Handling**: Robust error management with meaningful messages
- **Testing**: 26 automated tests ensuring reliability
- **Code Quality**: ESLint validation and best practices
- **Build Pipeline**: Complete development workflow

### 🔧 **Developer Experience**
- **60+ MCP Tools**: Complete DHIS2 development lifecycle coverage
- **Web App Platform**: Full scaffolding and debugging toolkit
- **Community Solutions**: Real-world problem solving based on DHIS2 community issues
- **Detailed Schemas**: Rich input validation and documentation
- **Easy Setup**: Simple npm commands for all operations
- **Interactive**: Perfect for API exploration, development, and troubleshooting

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Access to a DHIS2 instance (demo, local, or production)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/dhis2-mcp.git
cd dhis2-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Run tests (optional)
npm run test

# Start the MCP server
npm start
```

### First Connection

Once the MCP server is running, use the `dhis2_configure` tool to connect:

```json
{
  "baseUrl": "https://play.dhis2.org/2.40.4",
  "username": "admin",
  "password": "district"
}
```

## 📖 Usage Examples

### Web App Development (Phase 2)
```typescript
// Initialize new DHIS2 app
dhis2_init_webapp({
  "appName": "health-dashboard",
  "appTitle": "Health Dashboard", 
  "appType": "app",
  "template": "with-analytics",
  "typescript": true,
  "pwa": true
})

// Debug CORS issues
dhis2_diagnose_cors_issues({
  "dhis2Instance": "https://play.dhis2.org/2.40.4",
  "localDevelopmentUrl": "http://localhost:3000",
  "browser": "chrome",
  "symptoms": ["login_fails", "api_requests_blocked"]
})

// Generate UI components
dhis2_create_ui_components({
  "componentType": "table",
  "componentName": "DataElementTable",
  "features": {
    "pagination": true,
    "search": true,
    "export": true
  },
  "dataIntegration": {
    "useDataQuery": true,
    "apiEndpoint": "dataElements"
  }
})
```

### UI Library Integration (Phase 4)
```typescript
// Form patterns: inputs, validation, date picker, file upload, multi-select
dhis2_generate_ui_form_patterns({
  componentName: 'DataElementForm',
  includeValidation: true,
  includeDatePicker: true,
  includeFileUpload: true,
  includeMultiSelect: true,
  includeSelects: true
})

// Data display patterns: table, cards, lists, modal, loading
dhis2_generate_ui_data_display({
  componentName: 'DataElementDisplay',
  includeTable: true,
  includePagination: true,
  includeCards: true,
  includeLists: true,
  includeModal: true,
  includeLoading: true
})

// Navigation & layout: header bar, sidebar, breadcrumbs, tabs, responsive
dhis2_generate_ui_navigation_layout({
  componentName: 'AppLayout',
  includeHeaderBar: true,
  includeSidebar: true,
  includeBreadcrumbs: true,
  includeTabs: true,
  includeResponsive: true
})

// Design system tokens: palette, typography, spacing, dark mode
dhis2_generate_design_system({
  theme: 'default',
  enableDarkMode: true
})
```

#### Advanced options
```typescript
// Form patterns with i18n, RTL, accessibility and density
dhis2_generate_ui_form_patterns({
  componentName: 'DataElementForm',
  i18n: true,
  rtl: true,
  accessibility: true,
  density: 'compact'
})

// Data display with skeleton, empty state, sorting, selection and sticky header
dhis2_generate_ui_data_display({
  componentName: 'DataElementDisplay',
  skeleton: true,
  emptyState: true,
  sorting: true,
  selection: true,
  stickyHeader: true
})

// Navigation with alerts and RTL considerations
dhis2_generate_ui_navigation_layout({
  componentName: 'AppLayout',
  useAlerts: true,
  rtl: true
})

// Design system with custom density and RTL variables
dhis2_generate_design_system({
  theme: 'custom',
  enableDarkMode: true,
  density: 'compact',
  rtl: true
})
```

### Android UI Patterns (Phase 4)
```typescript
// Compose material form: validation, date picker, multi-select
android_generate_material_form({
  screenName: 'RegistrationForm',
  includeValidation: true,
  includeDatePicker: true,
  includeMultiSelect: true
})

// RecyclerView adapter + XML item layout
android_generate_list_adapter({
  adapterName: 'DataElementAdapter',
  itemLayout: 'item_data_element'
})

// Navigation drawer (Compose)
android_generate_navigation_drawer({ componentName: 'AppNavigation' })

// Bottom sheet (Compose)
android_generate_bottom_sheet({ componentName: 'DetailsBottomSheet' })
```

#### Advanced options
```typescript
// Compose form with dynamic color, light/dark and snackbar feedback
android_generate_material_form({
  screenName: 'RegistrationForm',
  dynamicColor: true,
  lightDark: true,
  rtl: true,
  snackbar: true
})

// RecyclerView with shimmer, pull-to-refresh and sticky headers
android_generate_list_adapter({
  adapterName: 'DataElementAdapter',
  itemLayout: 'item_data_element',
  shimmer: true,
  pullToRefresh: true,
  stickyHeaders: true
})

// Navigation drawer with Navigation Compose and dynamic color
android_generate_navigation_drawer({
  componentName: 'AppNavigation',
  navCompose: true,
  dynamicColor: true
})

// Persistent bottom sheet alternative
android_generate_bottom_sheet({
  componentName: 'DetailsBottomSheet',
  persistent: true
})
```

### Data Management
```typescript
// Create a data element
dhis2_create_data_element({
  "name": "Population Under 5",
  "shortName": "Pop U5",
  "valueType": "INTEGER",
  "domainType": "AGGREGATE",
  "aggregationType": "SUM"
})

// Bulk import data values
dhis2_bulk_import_data_values({
  "dataValues": [
    {
      "dataElement": "dataElementId",
      "period": "202301",
      "orgUnit": "orgUnitId", 
      "value": "1250"
    }
  ]
})
```

### Tracker Programs
```typescript
// Create a tracker program
dhis2_create_program({
  "name": "Child Health Program",
  "shortName": "Child Health",
  "programType": "WITH_REGISTRATION",
  "trackedEntityType": { "id": "trackedEntityTypeId" }
})

// Register a tracked entity instance
dhis2_create_tracked_entity_instance({
  "trackedEntityType": "personId",
  "orgUnit": "facilityId",
  "attributes": [
    {
      "attribute": "firstNameAttrId",
      "value": "John"
    }
  ]
})
```

### Analytics & Reporting
```typescript
// Get event analytics
dhis2_get_event_analytics({
  "program": "programId",
  "startDate": "2023-01-01",
  "endDate": "2023-12-31",
  "orgUnit": "countryId",
  "dimension": ["dataElementId", "orgUnitId"]
})

// Create a dashboard
dhis2_create_dashboard({
  "name": "Health Dashboard",
  "dashboardItems": [
    {
      "type": "VISUALIZATION",
      "x": 0, "y": 0, "width": 6, "height": 4,
      "visualization": { "id": "chartId" }
    }
  ]
})
```

## 🛠️ Development

### Available Commands

```bash
# Development with file watching
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Run tests
npm run test

# Build for production
npm run build

# Start the server
npm run start
```

### Project Structure

```
dhis2-mcp/
├── src/
│   ├── index.ts           # MCP server entry point
│   ├── dhis2-client.ts    # DHIS2 API client
│   └── tools/
│       └── index.ts       # Tool definitions
├── tests/                 # Test suites
├── dist/                  # Built output
└── package.json
```

## 🛠️ Development & Debugging Tools

### CORS & Authentication Issues
- **CORS Diagnosis**: Identify and fix cross-origin resource sharing problems
- **Browser Configuration**: Chrome, Firefox, Safari-specific solutions
- **Authentication Debug**: Login failures, session timeouts, cookie problems
- **Proxy Setup**: Development proxy configuration for all build tools

### Build & Performance Issues  
- **Build Troubleshooting**: webpack, Vite, d2 CLI, App Platform issues
- **Performance Analysis**: Bundle size, memory leaks, API bottlenecks
- **Migration Support**: Automated d2 library → App Platform migration
- **Environment Validation**: Complete development environment health checks

### Web App Scaffolding
- **Project Initialization**: Full DHIS2 app setup with templates
- **Configuration Generation**: d2.config.js, manifest.webapp, build systems
- **Component Library**: UI components using @dhis2/ui with data integration
- **Testing Setup**: Jest, Cypress, Playwright configuration

## 🎯 Supported DHIS2 Operations

### Aggregate Data Model
- ✅ **Data Elements**: Full CRUD with 15+ value types
- ✅ **Data Sets**: Period types, org units, sections
- ✅ **Categories**: Options, combinations, disaggregation
- ✅ **Data Values**: Bulk operations, validation, audit
- ✅ **Validation Rules**: Creation, execution, results
- ✅ **Organisation Units**: Groups, hierarchies, coordinates

### Event/Tracker Data Model  
- ✅ **Programs**: WITH_REGISTRATION, WITHOUT_REGISTRATION
- ✅ **Tracked Entity Types**: Attributes, validation, patterns
- ✅ **Program Stages**: Data elements, sections, rules
- ✅ **Program Rules**: 10+ action types, expressions
- ✅ **Tracked Entity Instances**: Registration, relationships
- ✅ **Events**: Data capture, coordinates, status management
- ✅ **Enrollments**: Program workflows, dates, transfers

### Analytics & Reporting
- ✅ **Event Analytics**: Advanced querying, dimensions
- ✅ **Enrollment Analytics**: Program-based insights  
- ✅ **Dashboards**: Items, layouts, visualizations
- ✅ **Visualizations**: 15+ chart types, pivot tables
- ✅ **Reports**: Generation, templates, parameters
- ✅ **Data Statistics**: System overview, metrics

## 🧪 Testing

The project includes comprehensive test coverage:

```bash
npm run test
```

- **Unit Tests**: Core functionality validation
- **Integration Tests**: DHIS2 client operations  
- **Tool Schema Tests**: Input validation and schemas
- **Error Handling Tests**: Robust error scenarios

## 📝 Configuration

### Environment Variables

```bash
# Optional: Default timeout for HTTP requests
DHIS2_TIMEOUT=30000
```

### DHIS2 Version Compatibility

- ✅ **DHIS2 2.38+**: Fully supported
- ✅ **DHIS2 2.39+**: All features available
- ✅ **DHIS2 2.40+**: Latest features supported

## 🤝 Use Cases

### 1. **Health Information System Setup**
Complete metadata configuration for new DHIS2 implementations.

### 2. **Data Migration & Integration**  
Bulk data operations between DHIS2 instances or external systems.

### 3. **Quality Assurance & Validation**
Automated data validation and quality checking workflows.

### 4. **Learning & Training**
Interactive DHIS2 API exploration and concept learning.

### 5. **Development & Testing**
API testing, integration development, and debugging support.

### 6. **System Monitoring**
Analytics automation and system health monitoring.

## 📚 Documentation

- **Implementation Plan**: [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) - Detailed project roadmap
- **Development Guide**: [CLAUDE.md](./CLAUDE.md) - Development instructions and patterns
- **API Reference**: Tool schemas provide comprehensive parameter documentation
- **DHIS2 Documentation**: [docs.dhis2.org](https://docs.dhis2.org)

## 🔄 Roadmap

### ✅ Phase 1: Web API Foundation (COMPLETED)
- Complete DHIS2 Web API coverage
- Production-ready MCP server
- Comprehensive testing and validation

### ✅ Phase 2: Web App Platform Integration (COMPLETED)
- ✅ DHIS2 app scaffolding and initialization tools
- ✅ App Runtime integration patterns and examples
- ✅ Development environment setup and configuration
- ✅ Authentication and security patterns
- ✅ Build system configuration (d2.config.js, webpack, vite)
- ✅ UI component generation with @dhis2/ui integration
- ✅ Testing framework setup (Jest, Cypress, Playwright)
- ✅ DataStore operations and namespace management

### ✅ Phase 2+: Community-Driven Debugging Tools (COMPLETED)
- ✅ **CORS Issues Diagnosis**: Browser-specific solutions for cross-origin problems
- ✅ **Authentication Debugging**: Login failures, session management, cookie issues
- ✅ **Proxy Configuration**: Local development proxy setup for all build tools
- ✅ **Build Issue Resolution**: d2 CLI migration, dependency conflicts, bundling problems
- ✅ **Performance Optimization**: Bundle analysis, memory leaks, API bottlenecks
- ✅ **Environment Validation**: Development environment health checks
- ✅ **Migration Assistant**: Automated guidance for d2 library → App Platform transitions

### 🔮 Phase 3: Android SDK Integration  
- Mobile project setup tools
- Offline-first architecture patterns
- GPS and media capture support
- Synchronization strategies

### 🎨 Phase 4: UI Library Integration (IN PROGRESS)
- @dhis2/ui component integration (forms, data display, navigation & layout)
- Design system patterns (palette, typography, spacing, dark mode)
- Responsive layout tools
- Mobile UI components (Android Compose: form, list adapter, navigation drawer, bottom sheet)

## 🏆 Project Status

**🚀 Production Ready** - Phase 1 & 2 Complete

| Metric | Achievement |
|--------|-------------|
| **MCP Tools** | 60+ comprehensive tools |
| **DHIS2 Endpoints** | 30+ API endpoints covered |
| **Web App Platform** | Complete integration toolkit |
| **Debugging Tools** | Community-driven troubleshooting |
| **TypeScript Interfaces** | 50+ type definitions |
| **Test Coverage** | 26 automated tests |
| **Code Quality** | ESLint + strict TypeScript |

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. **Fork** the repository
2. **Create** a feature branch
3. **Make** your changes with tests
4. **Ensure** all tests pass: `npm run test`
5. **Submit** a pull request

### Development Setup

```bash
# Clone your fork
git clone https://github.com/yourusername/dhis2-mcp.git
cd dhis2-mcp

# Install dependencies
npm install

# Start development mode
npm run dev

# Run tests
npm run test
```

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- **DHIS2 Community**: For the amazing health information platform
- **Model Context Protocol**: For the innovative AI-human collaboration framework  
- **TypeScript Team**: For excellent type safety tools
- **Open Source Community**: For the foundational tools and libraries

---

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/dhis2-mcp/issues)
- **DHIS2 Community**: [community.dhis2.org](https://community.dhis2.org)
- **Documentation**: [docs.dhis2.org](https://docs.dhis2.org)

**Made with ❤️ for the global health community**
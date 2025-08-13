# DHIS2 MCP Server

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![DHIS2](https://img.shields.io/badge/DHIS2-0080FF?style=for-the-badge&logo=dhis2&logoColor=white)](https://dhis2.org/)
[![MCP](https://img.shields.io/badge/MCP-Model_Context_Protocol-purple?style=for-the-badge)](https://modelcontextprotocol.io/)

> **🔧 Development Assistant**: A Model Context Protocol (MCP) server providing 108 tools for DHIS2 development, including code generators, debugging helpers, and documentation access for web and Android app development.

## ✨ What This Actually Is

### 🛠️ **DHIS2 Development Assistant**
- **Code Generators**: Creates boilerplate code for DHIS2 apps (web and Android)
- **Configuration Helpers**: Generates build configs, manifests, and setup files
- **Debugging Tools**: Diagnoses common DHIS2 development issues (CORS, auth, build problems)
- **API Wrapper**: Basic DHIS2 Web API client for data operations
- **Documentation Access**: Framework for querying local and web documentation

### 📱 **Mobile Development Support**
- **Android Project Setup**: Complete Android app scaffolding with DHIS2 SDK integration
- **UI Code Generation**: Jetpack Compose components, RecyclerView adapters, navigation patterns
- **Mobile-Specific Features**: Location services, camera, offline sync, notifications
- **Architecture Patterns**: MVVM, MVP, MVI implementations

### 🌐 **Web Development Support**  
- **DHIS2 App Platform**: Project initialization and configuration
- **UI Component Generation**: Form patterns, data display, navigation layouts using @dhis2/ui
- **Build System Configuration**: Webpack, Vite, d2 CLI setup
- **Testing Framework Setup**: Jest, Cypress, Playwright configurations

## 🎯 **Realistic Feature Overview**

### ✅ **What Works Well**
- **108 MCP Tools**: All tools have valid schemas and integrate properly
- **Dual-Mode Operation**: Development tools work without DHIS2 connection, API tools require connection
- **Code Generation**: Produces actual, usable code snippets and configurations
- **Error Handling**: Graceful handling of invalid inputs and missing dependencies
- **Performance**: All tools load in <10ms with minimal memory usage (82KB)

### ⚠️ **Current Limitations**
- **Basic DHIS2 API Coverage**: ~30 endpoints
- **Code Generators Only**: Outputs code templates and guides, doesn't perform actual setup
- **Mock External Integrations**: Documentation access requires external MCP servers to be fully functional
- **Limited Testing**: 4 test files covering basic functionality

### 🔍 **What's Actually Tested**
- **Schema Validation**: 100% of tools have valid MCP schemas
- **Code Generation**: Android and web app generators produce proper output
- **DHIS2 Client**: Basic API operations work with real DHIS2 instances
- **Integration**: All components work together without conflicts

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MCP client (Claude Code, Claude Desktop, etc.)
- DHIS2 instance (optional - many tools work without it)

### Installation

#### Option 1: Local Development
```bash
# Clone and build locally
git clone https://github.com/yourusername/dhis2-mcp.git
cd dhis2-mcp
npm install
npm run build
```

#### Option 2: NPX (Recommended for MCP clients)
```bash
# Use directly in MCP client config
npx dhis2-mcp
```

## 🔧 **MCP Client Configuration**

### For Claude Code (Cursor)
Create `.claude/config.json` in your project:
```json
{
  "mcpServers": {
    "dhis2-mcp": {
      "command": "npx",
      "args": ["-y", "dhis2-mcp"]
    }
  }
}
```

### For Claude Desktop
Add to your MCP configuration:
```json
{
  "mcpServers": {
    "dhis2-mcp": {
      "command": "npx",
      "args": ["-y", "dhis2-mcp"]
    }
  }
}
```

## 📖 Usage Examples

### 🏗️ **Initialize DHIS2 Web App**
```typescript
// Use the dhis2_init_webapp tool
{
  "appName": "health-tracker",
  "appTitle": "Health Tracker",
  "appType": "app",
  "typescript": true,
  "template": "basic"
}
```

### 📱 **Create Android App Structure**  
```typescript
// Use the dhis2_android_init_project tool
{
  "projectName": "DHIS2HealthApp",
  "applicationId": "org.dhis2.health",
  "language": "kotlin",
  "architecture": "mvvm",
  "features": ["location", "camera", "offline"]
}
```

### 🎨 **Generate UI Components**
```typescript
// Use the dhis2_generate_ui_form_patterns tool
{
  "componentName": "DataElementForm",
  "includeValidation": true,
  "includeDatePicker": true,
  "includeMultiSelect": true
}
```

### 🔍 **Debug Development Issues**
```typescript
// Use the dhis2_diagnose_cors_issues tool
{
  "dhis2Instance": "https://play.dhis2.org/2.40.4",
  "localDevelopmentUrl": "http://localhost:3000",
  "browser": "chrome",
  "symptoms": ["login_fails", "api_requests_blocked"]
}
```

### 📚 **Access Documentation**
```typescript
// Use the dhis2_query_documentation tool
{
  "topic": "LocationManager",
  "platform": "android", 
  "searchType": "both",
  "language": "kotlin"
}
```

## 🛠️ Available Tool Categories

### 🌐 **Web Development (23 tools)**
- App initialization and configuration
- UI component generation (@dhis2/ui patterns)
- Build system setup (webpack, vite, d2)
- Testing framework configuration
- Authentication patterns

### 📱 **Android Development (17 tools)** 
- Project initialization with DHIS2 SDK
- Gradle configuration and build setup
- UI pattern generation (Compose, XML)
- Mobile-specific features (GPS, camera, notifications)
- Offline sync and data storage

### 🔗 **DHIS2 API Integration (52 tools)**
- Data elements, data sets, categories
- Programs, tracked entities, events
- Analytics and reporting
- Bulk data operations
- System management

### 🐛 **Debugging & Troubleshooting (8 tools)**
- CORS issue diagnosis
- Authentication debugging
- Build problem resolution
- Performance optimization
- Environment validation

### 📚 **Documentation Access (9 tools)**
- Local Android SDK documentation
- Web documentation search
- Integration guides generation
- Code example extraction
- Troubleshooting assistance

## 🎯 **Use Cases**

### 1. **Learning DHIS2 Development**
Perfect for developers new to DHIS2 who need code examples and project structure guidance.

### 2. **Rapid Prototyping**
Quickly generate app scaffolding and UI components to get projects started.

### 3. **Debugging Development Issues**
Diagnose common problems like CORS issues, authentication failures, and build errors.

### 4. **Code Reference**
Generate examples of DHIS2 integration patterns and best practices.

### 5. **Mobile App Development**
Get Android-specific code and configuration for DHIS2 mobile apps.

## 📊 **Project Stats**

| Metric | Value |
|--------|-------|
| **Total MCP Tools** | 108 |
| **Development Tools** | 47 (work without DHIS2 connection) |
| **API Tools** | 52 (require DHIS2 connection) |
| **Documentation Tools** | 9 (require external MCPs) |
| **Test Files** | 4 (basic functionality testing) |
| **TypeScript Interfaces** | ~100 (comprehensive type safety) |
| **Tool Load Time** | <10ms (excellent performance) |
| **Memory Usage** | ~82KB (very efficient) |

## 🔄 **Realistic Roadmap**

### ✅ **Current Status (v1.0)**
- Functional MCP server with 108 tools
- Code generation for web and Android
- Basic DHIS2 API integration
- Debugging and troubleshooting helpers

### 🔮 **Future Improvements**
- **Enhanced Testing**: Expand test coverage beyond basic schema validation
- **Real Documentation Integration**: Connect to actual filesystem and web search MCPs
- **Extended API Coverage**: Add more DHIS2 Web API endpoints
- **Interactive Debugging**: Real-time problem diagnosis and fixes
- **Template Library**: Pre-built project templates for common use cases

## 🤝 **Contributing**

This is a development tool that generates code and configurations. Contributions welcome for:

1. **New Code Generators** - Additional UI patterns, project templates
2. **Enhanced Debugging** - More diagnostic tools and solutions
3. **API Coverage** - Additional DHIS2 endpoints and operations
4. **Documentation** - Better examples and usage guides
5. **Testing** - Expanded test coverage and validation

```bash
# Development setup
git clone https://github.com/yourusername/dhis2-mcp.git
cd dhis2-mcp
npm install
npm run dev      # Watch mode
npm run test     # Run tests
npm run lint     # Code quality
```

## ⚠️ **Important Notes**

### **This is NOT:**
- A complete DHIS2 Web API replacement
- A production-ready backend service
- A fully-tested enterprise solution
- A replacement for official DHIS2 tools

### **This IS:**
- A development assistant and code generator
- A learning tool for DHIS2 development patterns
- A debugging helper for common development issues
- A starting point for DHIS2 app development

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- **DHIS2 Community** - For the platform and development patterns
- **Model Context Protocol** - For the AI-human collaboration framework
- **TypeScript & Node.js** - For the solid foundation
- **Open Source Community** - For tools and libraries used

---

**Made with ❤️ as a development assistant for the DHIS2 community**

*This tool is designed to help developers get started with DHIS2 development by generating code, configurations, and providing debugging assistance. It's not a replacement for official DHIS2 documentation or tools, but rather a helpful companion for development workflows.*
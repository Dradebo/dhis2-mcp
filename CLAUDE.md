# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Build**: `npm run build` - Compiles TypeScript to JavaScript in `dist/`
- **Development**: `npm run dev` - Runs TypeScript compiler in watch mode
- **Type Check**: `npm run type-check` - Validates TypeScript without emitting files
- **Lint**: `npm run lint` - Runs ESLint on all TypeScript files in `src/`
- **Test**: `npm run test` - Runs Jest test suite
- **Start**: `npm run start` - Runs the compiled MCP server from `dist/index.js`

## Architecture Overview

This is a Model Context Protocol (MCP) server that provides tools for DHIS2 development and management. The architecture follows a modular pattern:

### Core Components

- **MCP Server** (`src/index.ts`): Main entry point that sets up the MCP server using `@modelcontextprotocol/sdk`. Handles tool registration and request routing through stdio transport.

- **DHIS2 Client** (`src/dhis2-client.ts`): HTTP client wrapper around the DHIS2 Web API using Axios. Provides typed interfaces for DHIS2 resources (DataElement, OrganisationUnit, etc.) and handles authentication via basic auth.

- **Tool Definitions** (`src/tools/index.ts`): Defines MCP tool schemas for DHIS2 operations. Each tool specifies input parameters and descriptions for the MCP protocol.

### Key Patterns

- **Lazy Initialization**: DHIS2Client is created only after `dhis2_configure` tool is called with connection details
- **Tool Registration**: Tools are dynamically registered after successful DHIS2 connection
- **Error Handling**: All DHIS2 API calls wrapped with try-catch and meaningful error messages
- **Type Safety**: Comprehensive TypeScript interfaces for all DHIS2 API responses

### DHIS2 Integration Points

The MCP currently supports these DHIS2 Web API endpoints:
- `/api/me` - Connection testing
- `/api/system/info` - System information
- `/api/dataElements` - Data element metadata
- `/api/organisationUnits` - Organization unit hierarchy  
- `/api/analytics` - Analytics engine queries
- `/api/dataValues` - Data value CRUD operations
- `/api/dataSets` - Data set metadata

## Development Notes

- Uses ES modules (`"type": "module"` in package.json)
- TypeScript configured with strict mode and additional safety checks
- All API methods include optional parameter objects for filtering, paging, and field selection
- The server runs on stdio transport, making it suitable for integration with MCP clients
- Connection credentials are passed at runtime, not stored in configuration

## Extending for DHIS2 Platform Development

When adding support for Web App Platform, Android SDK, and UI libraries:

- **Web App Platform**: Add tools for app scaffolding, d2 CLI integration, and platform API interactions
- **Android SDK**: Include tools for Android app structure, offline sync patterns, and mobile-specific DHIS2 APIs  
- **UI Libraries**: Provide tools for component usage, design system integration, and responsive patterns for both web and mobile

Maintain the existing pattern of tool definitions in `/tools/` and client abstractions for different DHIS2 development contexts.
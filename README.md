# DHIS2 MCP Server

A TypeScript Model Context Protocol server for DHIS2 development assistance and selected DHIS2 Web API operations.

## Status

**Resurrection candidate — not yet production ready.**

The repository contains a substantial MCP tool catalogue, but the current release still needs installation proof, end-to-end tests against a disposable DHIS2 instance, dependency upgrades and a registration fix for `dhis2_configure` before it should be recommended for routine use.

## What it provides

### Development tools

These tools do not require a DHIS2 connection and generate guidance or code for:

- DHIS2 web application scaffolding;
- Android project structure and SDK configuration;
- Jetpack Compose and web UI patterns;
- build, testing and runtime configuration;
- common authentication, CORS and performance diagnostics.

### DHIS2 API tools

After a successful connection, the server exposes tools for selected operations involving:

- data elements, data sets and categories;
- organisation units and validation rules;
- aggregate data values and analytics;
- programs, tracker entities, enrolments and events;
- dashboards, visualisations, reports and the data store.

This is not complete DHIS2 Web API coverage and is not a replacement for official DHIS2 tooling or documentation.

## Installation

### From source

```bash
git clone https://github.com/Dradebo/dhis2-mcp.git
cd dhis2-mcp
npm install
npm run build
```

Configure an MCP client to execute the built entry point:

```json
{
  "mcpServers": {
    "dhis2": {
      "command": "node",
      "args": ["/absolute/path/to/dhis2-mcp/dist/index.js"]
    }
  }
}
```

### npm package

The package metadata uses the npm package name `dhis2-mcp-server` and provides the executable command `dhis2-mcp`.

After a verified npm release, the expected MCP configuration is:

```json
{
  "mcpServers": {
    "dhis2": {
      "command": "npx",
      "args": ["-y", "dhis2-mcp-server"]
    }
  }
}
```

Do not rely on the older `npx dhis2-mcp` instructions unless that separate package name is intentionally published and maintained.

## Connecting to DHIS2

The intended connection tool is `dhis2_configure`:

```json
{
  "baseUrl": "https://your-dhis2-instance.example",
  "username": "your-username",
  "password": "your-password"
}
```

Do not commit credentials to repository files or MCP configuration committed to source control.

### Known blocker

In the current `main` branch, `dhis2_configure` is classified as an API-only tool. API-only tools are hidden before a connection exists, while the server only exposes them after `dhis2_configure` succeeds. The handler exists, but standards-compliant clients may never be shown the tool required to establish the connection.

The resurrection work must make `dhis2_configure` available before connection while keeping all other API tools gated.

## Development

```bash
npm run build
npm run type-check
npm run lint
npm test
npm run inspector
```

## Minimum release proof

A release candidate is not complete until all of the following are recorded:

1. Clean installation on a machine without the repository already present.
2. Successful MCP client startup over stdio.
3. `tools/list` exposes `dhis2_configure` before connection.
4. Development tools work without DHIS2 credentials.
5. Configuration succeeds against a disposable DHIS2 instance.
6. Read-only API operations work after connection.
7. Mutating tools require confirmation and respect permissions.
8. Credentials never appear in logs, exported audit data or errors.
9. npm package name, executable name and documentation agree.
10. CI builds, lints and runs unit and integration tests.

## Security notes

- Use a least-privileged DHIS2 account for testing.
- Treat tool-generated writes as potentially destructive.
- Never use production credentials in screenshots or demo recordings.
- The audit logger redacts top-level `password`, `token` and `apiKey` fields, but recursive sanitisation should be added before nested request payloads are considered safe.
- Run the server in an isolated environment while the permission and confirmation systems are being validated.

## Portfolio framing

> DHIS2 MCP is an experimental open-source bridge between Model Context Protocol clients and DHIS2 development workflows. It combines code-generation, diagnostics and selected API operations. The current resurrection effort is focused on making installation reproducible, connection handling secure and the advertised tool catalogue verifiable end to end.

## Contributing

Useful contributions include:

- fixing pre-connection tool registration;
- MCP protocol and compatibility testing;
- DHIS2 API integration tests;
- credential and audit-log hardening;
- modularising the large tool registry and request dispatcher;
- improving generated Android and web examples;
- validating behaviour across supported DHIS2 versions.

Please include a reproducible test or recorded verification with functional changes.

## Licence

MIT. See `LICENSE`.

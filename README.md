# DHIS2 MCP Server

Let your AI assistant (Claude, ChatGPT, Cursor, Codex, VS Code and other MCP hosts) work with your DHIS2 server. It reads your data and metadata, designs and builds configuration on a development server, imports data, and prepares changes for production. **Nothing changes without your approval**, and production servers are only ever read.

[![npm](https://img.shields.io/npm/v/dhis2-mcp-server)](https://www.npmjs.com/package/dhis2-mcp-server)
[![tests](https://github.com/Dradebo/dhis2-mcp/actions/workflows/tests.yml/badge.svg)](https://github.com/Dradebo/dhis2-mcp/actions/workflows/tests.yml)

<a href="https://glama.ai/mcp/servers/@Dradebo/dhis2-mcp"><img width="380" height="200" src="https://glama.ai/mcp/servers/@Dradebo/dhis2-mcp/badge" alt="DHIS2 MCP server on Glama" /></a>

## Setup: two steps

**1. Add it to your assistant.** Most hosts accept this configuration (your assistant can add it for you):

```json
{ "mcpServers": { "dhis2": { "command": "npx", "args": ["-y", "dhis2-mcp-server"] } } }
```

For Claude Code: `claude mcp add --scope user dhis2 -- npx -y dhis2-mcp-server`

**2. Sign in once, in a terminal window:**

```
npx -y dhis2-mcp-server login
```

It asks four things:
- the address of your DHIS2 server;
- whether it is a development, training or production server;
- your username;
- your password. The password is hidden as you type and never shown to the assistant.

The login is checked straight away and saved on your computer:

| Your computer | Where the password is kept |
|---|---|
| Windows | encrypted for your Windows account |
| macOS | the Keychain |
| Linux | the system keyring, or a private file if there is none |

Restart your assistant and it is ready. Run `login` again for each further server, for example a read-only production server alongside your development server.

You need [Node.js](https://nodejs.org) 20 or newer.

## What your assistant can do

- **Read:** metadata, aggregate data, analytics, dashboards, and tracker records (people, enrollments, events). Before it shows individual-level records it asks you once per session. It can count records without downloading them.
- **Build on a development or training server:**
  - It designs data sets, programs, indicators, option sets and more.
  - It checks the design against DHIS2's rules for your server's version.
  - It trial-runs the change with DHIS2's own dry run, then asks you to approve it.
  - It applies the change exactly as approved and reads it back to confirm.
- **Import data:** aggregate values, events and tracker records, with the same plan, dry run, approve and read-back steps. Existing values are never deleted.
- **Change sharing** (who can see or enter what), with your approval.
- **Move finished work to production:** it prepares a reviewed package, a production administrator imports it, and the assistant then confirms production matches.
- **Keep a project record:** requirements tied to your documents, questions for you in one batch, and a handover note of what was built and verified.

The full list of tools is in [docs/TOOLS.md](docs/TOOLS.md).

## What it will not do

- **Change a production server.** Production connections are read-only in two independent places: the tool policy, and a connection that refuses anything but reads.
- **Apply anything without your approval** in your assistant's approval prompt. The assistant cannot approve on your behalf.
- **Delete data, or change users, roles or passwords.**
- **Show your password to the assistant, or put it in any configuration file.**

The details and their tests are in [SECURITY-MODEL.md](SECURITY-MODEL.md).

## DHIS2 versions

| Your server | What the assistant does |
|---|---|
| **2.39 – 2.43** | Full support. The assistant detects the version when it connects and uses that version's API, parameter names and rules. |
| **Older than 2.39** | Read-only. |
| **Newer than 2.43** | Treated like 2.43 and flagged as untested. Every change still has to pass DHIS2's own dry run first. |

Where a feature needs a newer DHIS2 than yours, the assistant uses that version's workaround instead of asking you to upgrade. For example, program-indicator disaggregation arrived in 2.42; on 2.41 the workaround is one indicator per category option.

## Other commands

```
npx -y dhis2-mcp-server status        # saved servers, and whether each login still works
npx -y dhis2-mcp-server logout dev    # forget a saved server
npx -y dhis2-mcp-server install       # print the host configuration (for assistants)
```

## Also included

The server also has helpers for building DHIS2 web and Android apps: project scaffolding, UI patterns, and debugging guides for CORS, authentication and builds. They need no DHIS2 connection.

## Upgrading from 1.x

- **Setup:** version 2 replaces environment-variable passwords and the `dhis2_configure` arguments with the one-time `login` above.
- **Changes:** the direct create, update and delete tools are gone. Every change now goes through a plan you approve.

## Development

```
npm ci
npm test                    # unit tests
npm run test:e2e-security   # end-to-end tests against fake DHIS2 servers
```

The [tests workflow](.github/workflows/tests.yml) runs everything on Windows, macOS and Linux:
- unit tests;
- end-to-end tests against fake DHIS2 servers that behave like each version from 2.38 to 2.43;
- a real round trip through each operating system's secret store.

Issues and ideas: [GitHub issues](https://github.com/Dradebo/dhis2-mcp/issues), or the [DHIS2 community thread](https://community.dhis2.org/t/dhis2-mcp-server-with-100-tools-for-dhis2-development/67441).

## Licence

MIT. See [LICENSE](LICENSE).

# Security model (local single-user stdio)

The server applies one policy to tool discovery, completions and dispatch. It is a local stdio server for one person. A remote or multi-user deployment needs a separate authentication and session review.

## Setup: one login, typed by a person

1. The agent adds the server to its host. The host config holds no secrets: `{"command": "npx", "args": ["-y", "dhis2-mcp"]}`. `npx -y dhis2-mcp install` prints this config, plus the one human step.
2. The person runs `npx -y dhis2-mcp login` in a terminal and types three things:
   - the DHIS2 address;
   - what kind of server it is: 1 development, 2 training, or 3 production;
   - their username and password.

   The password is masked and checked live against `/api/me` (HTTPS, no redirects). Login refuses to run without a real terminal, so an agent cannot pipe credentials into it.
3. The login is saved in the server's own store (`%APPDATA%\dhis2-mcp`, or `~/.dhis2-mcp`; override with `DHIS2_MCP_HOME`):
   - Windows: the password is encrypted with DPAPI for the current OS user.
   - Other systems: the password file has `0600` permissions.

   DPAPI protects against other OS users and copied files. It does not protect against processes running as the same user, such as the agent host.
4. The server connects on first use. The agent never needs a setup call. `status` checks the saved login, and `logout` removes it.

**Production is read-only.** A production login is saved as read-only. So is any environment profile not declared, or not recognisably named, as development or training. On a production connection:
- the policy denies and hides every change tool;
- the HTTP transport refuses every non-GET request, whichever code path asks;
- run `login` once per server to save a development and a production login side by side. The server defaults to the development one.

Operators can still use environment profiles instead of the store. When they are present, they take precedence:

```bash
DHIS2_MCP_PROFILES=dev
DHIS2_MCP_DEV_BASE_URL=https://dev.example.org
DHIS2_MCP_DEV_TOKEN=d2pat_...          # or DHIS2_MCP_DEV_USERNAME + DHIS2_MCP_DEV_PASSWORD
DHIS2_MCP_DEV_ENVIRONMENT=development
```

- URLs must be HTTPS, with no embedded credentials, query string or fragment. Redirects are not followed.
- The model never handles credentials: `dhis2_configure` accepts only a profile name, and every other argument is ignored.
- A candidate connection is fully verified before it is activated. On failure, the previous connection is revoked, with no fallback to default permissions.

## Permission tiers: the server asks instead of requiring configuration

| Tier | Operations | Behaviour |
|---|---|---|
| 0 | local generators and guides; metadata and aggregate reads | no prompt (DHIS2 still enforces its own sharing and authorities) |
| 1 | individual-level records (tracker, enrollments, events, event/enrollment *query* analytics); DataStore reads; audit/composition export | the person is asked through the MCP host, **once per connection** per category |
| 2 | metadata create/update via `dhis2_plan_metadata_change` → `dhis2_apply_plan` | the person approves **each plan** in the MCP host (see below) |
| — | legacy direct create/update/delete/import tools, `run_validation`, DataStore writes, audit clear; unregistered tools | always denied |

- Prompts use MCP form elicitation. Hosts that cannot ask are refused tier 1 and tier 2.
- For such hosts, an administrator can pre-approve tier-1 categories with `DHIS2_MCP_CAPABILITIES=record-read,...`. Writes can never be pre-approved.
- A `confirmed: true` argument is ignored: it is not approval.

## Development → production transfer (the assistant never writes to production)

Customisation is done only on development. Finished work moves to production in five steps:
1. **`dhis2_prepare_transfer`** exports the chosen objects with their metadata dependencies from development (`/{type}/{id}/metadata`, sharing skipped). It then:
   - removes sharing, user references and development org unit assignments;
   - drops users, roles, groups and org units entirely, and reports what was dropped;
   - compares every object against production, **reading only**: new, changed (with field names), identical, or conflict (same code or name under a different id);
   - writes `package.json` and a plain-language `review.md`.
2. **`dhis2_approve_transfer`** re-hashes the package file, so edits after preparation are detected, and re-exports from development, so changes there are detected. It refuses while conflicts remain. The person then approves in the MCP host. The prompt says plainly that the assistant will not change production.
3. On approval it writes `approval.json` (package fingerprint, source, target, time) and `FOR-THE-PRODUCTION-ADMINISTRATOR.txt` (Import/Export app steps: dry run first, then import).
4. **A production administrator imports the file.** The assistant has no way to do this.
5. **`dhis2_verify_transfer`** reads production and reports `verified`, `partially-imported` or `not-imported`. Transfers are stored on disk, so verification works days later and after a restart.

## Planned changes (safe change engine)

1. `dhis2_plan_metadata_change` validates the request:
   - Collections are allowlisted.
   - At most 20 objects and 40 fields per plan.
   - No deletion, and no sharing, ownership or id changes.
2. For updates, it fetches a fresh `:owner` before-image and changes only the requested top-level fields. Everything else is re-sent as it was, including binding arrays and nested sharing access strings.
3. It runs a DHIS2 `VALIDATE` import, and rejects the plan if DHIS2's object count differs from what was sent.
4. It stores an immutable plan bound to the connection epoch, DHIS2 user, instance origin and profile. The plan expires after 15 minutes (`DHIS2_MCP_PLAN_TTL_SECONDS`).
5. `dhis2_apply_plan` then:
   - re-checks preconditions (each target is unchanged, each create is still absent);
   - asks the host to show the user the complete change list through MCP form elicitation (in Hermes, the normal approval prompt);
   - re-checks preconditions again after approval, then commits atomically;
   - reads every target back.

   The result is one of: `verified`, `applied-unverified` (a field was not stored as intended), `partial`, `failed`, `stale` or `unknown-outcome`. Read-back also reports collateral changes to fields the plan did not touch.
6. If the response is lost after the commit, the server reconciles by reading the targets back. It never re-sends.

Approval cannot come from tool arguments. A plan that was declined, applied, cancelled, made stale, expired, or created under another connection cannot be applied. If the host does not support elicitation, applying is refused.

Limits:
- A small time-of-check/time-of-use window remains between the last precondition read and the commit, because the DHIS2 metadata import has no conditional-write precondition.
- Plans live in memory and are lost when the server restarts.
- How the approval is displayed is up to the host.
- Read-back can flag legitimate server normalisation as a mismatch. This errs toward `applied-unverified`, never a false `verified`.

## Disclosure controls

- HTTP-client errors are converted at the transport boundary into status-only messages, such as `HTTP 409 E1005 (GET /path)`. Request configuration, headers, query strings and response bodies are never returned or logged.
- Audit entries record parameter names, plus values only for a small allowlist of non-sensitive scalar keys. Error text is redacted, and the instance is recorded as its origin only.
- Resolved secrets, and their Base64 forms, are redacted from every message.
- The DataStore `encrypt` option was removed: it was Base64 encoding, not encryption. DataStore namespaces and keys are restricted to `[A-Za-z0-9_.-]`.

## Verification

```bash
npm test                    # unit tests, incl. tests/security-policy.test.ts
npm run test:e2e-security   # builds to build-e2e/; real-stdio adversarial checks, change-engine checks
                            # and install/login/store checks against a local fake DHIS2 (needs openssl)
```

## Known limitations

- The DHIS2 authority mapping in `permission-system.ts` has not been verified against a current DHIS2 authority list. It fails closed, so a non-superuser may be denied reads that DHIS2 would allow.
- DHIS2 itself still enforces sharing and authorities. Local policy does not establish DHIS2 authorisation.
- Process-level environment scrubbing is not an OS sandbox. If the host offers unrestricted terminal, browser or file tools, the MCP cannot guarantee confidentiality.
- Disclosure risk from aggregate queries (small cells, differencing) is not controlled yet.

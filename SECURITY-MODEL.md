# Security model (local single-user stdio)

This build is **read-only by design**. It applies one policy to tool discovery, completions and dispatch. It is a local stdio server for one user; a remote or multi-user deployment needs a separate authentication and session review.

## Connecting: credentials stay in the launch environment

**Simplest setup (Hermes):** run this in a terminal you can see and type your DHIS2 username and password when asked:

```bash
node scripts/setup-credentials.mjs --url https://your-dhis2.example.org --profile dev
```

It checks the login against `/api/me` (HTTPS, no redirects) and writes `DHIS2_MCP_DEV_*` to the Hermes `.env` file. Hermes passes those values to the server through `${VAR}` references in `mcp_servers.dhis2.env`. The password is not echoed, printed or logged. It is stored in plaintext in `.env`, like the other Hermes secrets. Passwords containing `${` or line breaks are refused, because the `.env` loader would alter them.

`dhis2_configure` accepts only a profile name. The MCP host (for example, Hermes) reads the instance URL and credentials from environment variables when it launches the server:

```bash
DHIS2_MCP_PROFILES=dev                 # optional, comma-separated; default: "default"
DHIS2_MCP_DEV_BASE_URL=https://dev.example.org
DHIS2_MCP_DEV_TOKEN=d2pat_...          # personal access token (preferred), or:
DHIS2_MCP_DEV_USERNAME=...
DHIS2_MCP_DEV_PASSWORD=...
```

- URLs must be HTTPS and must not contain embedded credentials, a query string or a fragment. Redirects are not followed.
- Never pass URLs, usernames, passwords or tokens in tool arguments. Arguments other than `profile` are ignored.
- Before any connection is activated, the server tests it and retrieves the DHIS2 user. If either step fails, no connection remains active: the previous connection is revoked and the server does not fall back to default permissions.
- Wherever the variables are stored (user environment, host config file), they are plaintext at rest. Prefer a narrowly scoped personal access token with an expiry.

## Operation classes

| Class | Behaviour |
|---|---|
| local (generators, guides, permission info, audit summary) | allowed |
| metadata / aggregate reads | allowed after a verified connection, intersected with the mapped DHIS2 authority |
| record-level reads (tracker, enrollments, events, event/enrollment *query* analytics) | require operator capability `record-read` |
| DataStore reads | require `datastore-read` |
| audit export / composition export | require `audit-export` / `composition-export` |
| metadata create/update via `dhis2_plan_metadata_change` → `dhis2_apply_plan` | require `metadata-write`; **every apply needs the user's approval in the MCP host** (see below) |
| legacy direct create/update/delete/import tools, `run_validation`, DataStore writes, audit clear | **always denied** |
| unregistered tool | denied |

Capabilities can only be enabled by the operator in `DHIS2_MCP_CAPABILITIES` (comma-separated), never through tool arguments. The server ignores a `confirmed: true` argument: it is not approval.

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
npm run test:e2e-security   # builds to build-e2e/ and runs real-stdio adversarial checks
                            # against a local fake DHIS2 (needs openssl)
```

## Known limitations

- The DHIS2 authority mapping in `permission-system.ts` has not been verified against a current DHIS2 authority list. It fails closed, so a non-superuser may be denied reads that DHIS2 would allow.
- DHIS2 itself still enforces sharing and authorities. Local policy does not establish DHIS2 authorisation.
- Process-level environment scrubbing is not an OS sandbox. If the host offers unrestricted terminal, browser or file tools, the MCP cannot guarantee confidentiality.
- Disclosure risk from aggregate queries (small cells, differencing) is not controlled yet.

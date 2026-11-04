# Security model (local single-user stdio)

This build is **read-only by design**. It applies one policy to tool discovery, completions and dispatch. It is a local stdio server for one user; a remote or multi-user deployment needs a separate authentication and session review.

## Connecting: credentials stay in the launch environment

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
| create, update, delete, import, `run_validation`, DataStore writes, audit clear | **always denied** until a trusted, host-mediated approval channel exists |
| unregistered tool | denied |

Capabilities can only be enabled by the operator in `DHIS2_MCP_CAPABILITIES` (comma-separated), never through tool arguments. The server ignores a `confirmed: true` argument: it is not approval.

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

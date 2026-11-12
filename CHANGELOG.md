# Changelog

## 2.0.0 (2026-11)

A rewrite around one idea: a person with no command-line experience signs in once, and their AI assistant can then safely do real DHIS2 work.

### Setup
- **One-time login in a terminal: `npx -y dhis2-mcp-server login`.** It asks for the server address, the kind of server (development, training or production), your username and your password.
- **The password is kept by the operating system:** Windows DPAPI, the macOS Keychain, or the Linux Secret Service. A private file is used only where none exists.
- **Host configuration holds no secrets.** It is the same everywhere: `npx -y dhis2-mcp-server`.

### Safety
- **Production servers are read-only,** enforced by the tool policy and separately by a connection that refuses anything but reads.
- **Every change is planned first.** It is trial-run with DHIS2's own dry run, approved by the person in the assistant's approval prompt, applied exactly as approved, and read back. The assistant cannot approve on the person's behalf.
- **The direct create, update, delete and bulk-import tools of 1.x are removed** (23 tools).
- **Individual-level records** are shown only after the person agrees, once per session.
- **Errors from the server never reach the assistant verbatim.** It gets only the status and DHIS2's error code.

### Working with DHIS2
- **Packages:** up to 2,000 metadata objects built and applied together, with about 44 offline design checks.
- **Data imports:** aggregate values, events and tracker records. Existing values are never deleted.
- **Sharing changes** and **analytics runs**, with approval.
- **Development → production transfer:** a reviewed package that a production administrator imports, then checked by reading production.
- **A project record:** requirements cited to documents, batched clarification questions, and a handover note.

### DHIS2 versions
- **Version detection:** reads the server version on connect and uses that version's API, parameter names and rules.
- **Support range:** full support for 2.39-2.43. Older servers are read-only; newer ones are treated as 2.43 and flagged as untested.
- **Workarounds instead of upgrades:** for example, program-indicator disaggregation before 2.42.
- **Tracker reads** use `/api/tracker` on every version, because the old endpoints were removed in 2.42.

### Fixed after testing against a live DHIS2 2.41 server
- **Non-superusers were refused all reads:** permission checks used authority names that don't exist in DHIS2.
- **Lists ignored `pageSize`:** 5 category combos returned 18 MB. Lists now page, and tool replies are size-limited.
- **Aggregate data values could not be read:** the wrong endpoint was used.
- **Tracker lists** now report totals and can count without downloading records.

### Upgrading from 1.x
- **Setup:** replace environment-variable passwords and `dhis2_configure` arguments with the one-time `login`.
- **Changes:** tools that wrote directly are gone; ask the assistant to plan the change instead.

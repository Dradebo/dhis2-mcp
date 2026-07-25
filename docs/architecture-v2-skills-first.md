# Architecture Decision: Skills-First DHIS2 Agent System

## Status

Proposed direction for the DHIS2 MCP resurrection branch.

## Decision

Split the original project into two complementary layers:

1. **DHIS2 Agent Skills** — portable, dependency-free operating knowledge that teaches capable agents how to inspect, reason about and safely work with DHIS2.
2. **DHIS2 Guard** — an optional, deliberately small MCP server or HTTP safety proxy that enforces write boundaries, confirmation, snapshots and audit behaviour.

The skills are the primary product. The guard is optional infrastructure for organisations that require enforceable controls.

## Why

The original npm-distributed MCP combines domain knowledge, tool registration, transport, credentials, API access, code generation and safety policy inside one package and dependency tree.

A skills-first design:

- can be dropped directly into a repository;
- can be reviewed as plain text before use;
- avoids mandatory npm installation and lifecycle scripts;
- is portable across agents that support the Agent Skills format;
- separates DHIS2 expertise from any particular tool runtime;
- lets organisations use their existing browser, HTTP, connector or API tools;
- makes the operating procedure, stopping conditions and safety invariants visible.

Skills are not themselves a security boundary. A capable agent can still misuse generic HTTP or browser tools, and a malicious skill can contain harmful instructions or executable scripts. The optional guard exists to enforce controls that prose cannot guarantee.

## Product split

### Product A: DHIS2 Agent Skills

Working name: `dhis2-agent-skills`

Distribution:

- Git repository and signed release archives;
- pin installations to a specific commit or release tag;
- no install script;
- no package-manager dependency;
- no executable code in the initial release;
- credentials never stored in the skill repository;
- users manually copy or vendor the required skill directories into their agent workspace.

Initial skill set:

1. `dhis2-instance-orientation`
   - identify DHIS2 version and instance identity;
   - inspect the current user and effective permissions;
   - establish whether the environment is development, staging or production;
   - begin read-only.

2. `dhis2-metadata-forensics`
   - search before creating;
   - inspect identifiers, references and dependency relationships;
   - identify conflicts and reusable metadata;
   - produce a change map without mutation.

3. `dhis2-safe-metadata-change`
   - require a written change plan;
   - export or snapshot affected metadata;
   - validate references and payload shape;
   - distinguish create, update and delete risk;
   - require explicit confirmation before writes;
   - verify the result and produce a rollback record.

4. `dhis2-tracker-event-design`
   - design tracker and event programmes;
   - reason about tracked entity attributes, programme stages, sections, option sets and data elements;
   - prevent duplicate-name and invalid-reference errors;
   - preserve loader and API compatibility.

5. `dhis2-aggregate-data-operations`
   - inspect datasets, category combinations and completeness;
   - retrieve and validate data values;
   - prohibit silent mutation of completed periods;
   - document import assumptions and validation results.

6. `dhis2-data-quality-investigation`
   - use analytics and data-value queries read-only;
   - identify missingness, outliers, completeness and organisational-unit anomalies;
   - distinguish evidence from inference;
   - produce reproducible query records.

7. `dhis2-incident-and-recovery`
   - respond to failed imports, credentials exposure and unexpected metadata changes;
   - preserve logs and evidence;
   - identify affected objects and access paths;
   - define rollback, rotation and verification steps.

8. `dhis2-release-verification`
   - verify a proposed skill, integration or change against a disposable/test instance;
   - run read-only, create, update and rollback scenarios;
   - record version compatibility and failure behaviour.

### Shared references

The skill repository should contain reviewable reference material rather than repeating it in every `SKILL.md`:

- DHIS2 version and API compatibility matrix;
- endpoint and pagination guidance;
- metadata dependency graph;
- destructive-operation catalogue;
- safe field-selection patterns;
- loader header and UID guidance;
- change-plan template;
- preflight and post-change checklist;
- rollback record template;
- credential-handling policy;
- examples of good and unsafe requests.

### Skill safety contract

Every skill must declare:

- when it should activate;
- required inputs;
- minimum tool capabilities;
- whether it is read-only or write-capable;
- safety invariants;
- production-instance stopping conditions;
- explicit confirmation points;
- expected output contract;
- verification steps;
- rollback expectations;
- examples and edge cases.

Baseline invariants:

- never store credentials in repository files, prompts, logs or generated reports;
- identify the target instance before taking action;
- begin with the narrowest read-only request;
- search for existing metadata before creating anything;
- never infer that similarly named metadata is interchangeable;
- never delete by default;
- never write to production without an explicit, reviewed change plan;
- export or snapshot affected metadata before a write where the API permits it;
- show the intended payload and expected impact before mutation;
- stop when permissions, identifiers, ownership or instance identity are ambiguous;
- verify the result using a fresh read after every mutation;
- record what changed, what did not change and how to reverse it.

## Product B: DHIS2 Guard

Working name: `dhis2-guard`.

This is not the original 108-tool development assistant. It is a small enforcement layer.

Possible forms:

- local MCP server;
- local HTTP reverse proxy for DHIS2 API requests;
- signed single binary;
- source distribution with locked and vendored dependencies.

Responsibilities:

- read-only by default;
- endpoint allowlist and denylist;
- separate read and write credentials where possible;
- recursive credential and token redaction;
- request and response size limits;
- rate limits and operation budgets;
- instance fingerprinting;
- production write lock;
- explicit two-phase mutation flow;
- metadata snapshot before writes;
- payload validation;
- confirmation tokens tied to one reviewed payload;
- audit log containing hashes and affected identifiers, not secrets;
- post-write verification;
- delete disabled unless separately enabled;
- idempotency and replay protection where possible.

Suggested mutation protocol:

1. `inspect_change`
2. `plan_change`
3. `validate_change`
4. human review
5. `authorize_change`
6. `apply_change`
7. `verify_change`
8. `produce_rollback_record`

Reads may use the agent's native HTTP/browser tools. Sensitive writes should be routed through DHIS2 Guard when enforceable governance is required.

## Hermes material recovery

The skills developed with Hermes on the VPS should not be pasted directly into the public repository.

Recovery process:

1. inventory each recovered skill and reference file;
2. remove credentials, hostnames, personal paths and operational secrets;
3. identify the actual repeatable DHIS2 procedure inside it;
4. separate universal guidance from instance-specific notes;
5. split oversized instructions into `SKILL.md` plus references;
6. classify every instruction as read, propose, write, delete or administrative;
7. add explicit stopping conditions and confirmation points;
8. test against a disposable DHIS2 instance;
9. run adversarial tests for prompt injection and unsafe instruction following;
10. publish only after manual review and signed release tagging.

## Repository direction

The existing `dhis2-mcp` repository should preserve the v1 history and clearly describe it as an experimental predecessor.

Preferred long-term layout:

```text
dhis2-agent-skills/
├── README.md
├── SECURITY.md
├── LICENSE
├── skills/
│   ├── dhis2-instance-orientation/
│   │   ├── SKILL.md
│   │   └── references/
│   ├── dhis2-metadata-forensics/
│   ├── dhis2-safe-metadata-change/
│   ├── dhis2-tracker-event-design/
│   ├── dhis2-aggregate-data-operations/
│   ├── dhis2-data-quality-investigation/
│   ├── dhis2-incident-and-recovery/
│   └── dhis2-release-verification/
├── shared-references/
├── evals/
└── examples/
```

The optional guard should live in a separate repository or a clearly isolated subproject so installing skills never installs or executes the guard.

## Release proof for the skills repository

Before the first public release:

- validate every skill against the Agent Skills specification;
- verify that the repository contains no executable files unless explicitly approved;
- verify that no credentials or instance secrets exist in current files or history;
- test activation and output behaviour in at least two supported agents;
- run read-only scenarios against a public or disposable DHIS2 instance;
- run controlled metadata create/update/rollback scenarios against a disposable instance;
- test production-instance refusal and ambiguous-instance stopping behaviour;
- test prompt-injection attempts embedded in DHIS2 names, descriptions and datastore content;
- publish a threat model;
- sign release tags and publish checksums;
- document the exact commit tested.

## Portfolio framing

> DHIS2 Agent Skills is a portable, skills-first operating playbook that teaches capable AI agents how to inspect, analyse and safely work with DHIS2. It captures domain procedures, change planning, metadata dependency reasoning and production safeguards without requiring users to install a large package dependency tree. An optional DHIS2 Guard layer provides enforceable controls for sensitive writes.

## Decision summary

- Stop treating npm as the primary distribution path.
- Preserve the original MCP as a documented predecessor.
- Make the skills repository the flagship open-source authority project.
- Keep a much smaller optional MCP/proxy for enforceable governance.
- Recover the Hermes work as audited source material, not trusted executable content.

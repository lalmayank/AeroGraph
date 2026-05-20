<!--
Sync Impact Report

- Version change: template (unversioned) → 1.0.0
- Modified principles:
	- PRINCIPLE_1_NAME → I. Event Schema Is Source of Truth
	- PRINCIPLE_2_NAME → II. Shared Contracts (No Bypasses)
	- PRINCIPLE_3_NAME → III. Trace Replayability (NON-NEGOTIABLE)
	- PRINCIPLE_4_NAME → IV. Adapter Normalization
	- PRINCIPLE_5_NAME → V. Tests Are Mandatory Where It Matters
- Added sections:
	- Architecture Constraints (replaced SECTION_2_NAME)
	- Workflow & Change Control (replaced SECTION_3_NAME)
- Removed sections: none
- Templates requiring updates:
	- ✅ .specify/templates/plan-template.md
	- ✅ .specify/templates/tasks-template.md
	- ⚠ .specify/templates/spec-template.md (no change required; already supports NEEDS CLARIFICATION)
- Follow-up TODOs: none
-->

# Agent Flight Recorder Constitution

## Core Principles

### I. Event Schema Is Source of Truth
The event schema is the canonical definition of what the platform means by a
"trace event". Backend services, adapters, and UI MUST derive their data
models, serialization, validation, and storage from the schema.

- Any change to the schema is a contract change.
- No component may introduce ad-hoc event fields outside the schema.
- Schema changes MUST include a migration/compatibility plan and tests proving
	forward/backward compatibility as appropriate.

### II. Shared Contracts (No Bypasses)
No UI or backend logic may bypass shared contracts.

- UI state, API calls, and event rendering MUST use shared contract types that
	are generated from (or directly aligned with) the event schema.
- If the UI needs data that is not in the contracts, the correct fix is to
	evolve the schema/contracts—never to bypass them.
- Requirements that imply new endpoints or fields MUST be marked as
	NEEDS CLARIFICATION rather than invented.

### III. Trace Replayability (NON-NEGOTIABLE)
All implementation MUST preserve trace replayability.

- Trace events MUST contain enough normalized information to replay or
	reconstruct execution paths (including parent/child relationships and
	ordering).
- Transformations MUST be loss-aware: if a source framework provides richer
	data than the normalized schema can represent, the adapter MUST preserve the
	ability to replay by encoding the necessary details in schema-approved fields
	(e.g., structured payloads) rather than dropping them.
- Side effects MUST be represented explicitly (and, where applicable, marked
	as non-replay-safe) so replay cannot silently diverge.

### IV. Adapter Normalization
All adapters MUST emit normalized trace events.

- Each adapter MUST define a deterministic mapping from the source framework's
	events/spans into the platform event schema.
- Adapters MUST not leak framework-specific semantics into the normalized layer
	unless explicitly modeled in the schema.
- When in doubt, prefer improving the schema over adding adapter-specific
	exceptions.

### V. Tests Are Mandatory Where It Matters
Tests are mandatory for the event schema, adapters, and replay behavior.

- Schema tests MUST validate (at minimum) structural validity and
	compatibility expectations.
- Adapter tests MUST include golden fixtures proving the normalized output.
- Replay tests MUST prove that a trace can be replayed/forked without breaking
	referential integrity or silently losing required context.
- PRs that touch schema/adapters/replay MUST not be merged without these tests.

## Architecture Constraints

- The backend, UI, and adapters MUST remain modular with clear boundaries.
	Shared types/contracts belong in a shared module/package and are consumed by
	all layers.
- The event schema and shared contracts define the interfaces between modules.
	Cross-module coupling outside those interfaces is prohibited.
- Storage/indexing MAY evolve, but MUST not invalidate replayability.

## Workflow & Change Control

- Do not invent APIs: if a requirement is unclear, mark it NEEDS CLARIFICATION
	and request clarification before implementing.
- Schema or contract changes MUST be reviewed with a cross-layer mindset
	(backend + UI + adapters).
- Breaking changes MUST include a migration plan and versioning strategy.
- CI MUST run schema, adapter, and replay test suites when relevant code is
	touched.

## Governance
<!-- Example: Constitution supersedes all other practices; Amendments require documentation, approval, migration plan -->

- This constitution supersedes other development practices in this repository.
- Amendments require:
	- A PR describing the change and rationale
	- A version bump (semantic versioning)
	- A migration/compatibility plan when contracts are affected
	- Explicit confirmation that Principles I–V remain satisfied
- Semantic versioning for this document:
	- MAJOR: principles removed/redefined in a way that changes governance intent
	- MINOR: new principle/section added or materially expanded obligations
	- PATCH: clarifications/wording with no new obligations
- Reviews MUST check:
	- schema-as-truth compliance
	- contract boundary compliance (no bypasses)
	- adapter normalization
	- replayability
	- mandatory tests where applicable

**Version**: 1.0.0 | **Ratified**: 2026-05-20 | **Last Amended**: 2026-05-20

# ADR 0002: Contracts as Source of Truth

## Context
Agent workflows emit a wide variety of telemetry, logging, and state data. Without strict governance, backend stores and frontend UIs often implement ad-hoc parsing or custom fields to accommodate framework-specific quirks (e.g., LangChain vs. AutoGen). This leads to fragile integrations, broken UI components, and the inability to build generic replay tooling.

## Decision
We will enforce the `@afr/contracts` package (specifically the Zod `TraceEvent` schemas) as the absolute canonical source of truth for the entire platform. No UI component or backend logic is permitted to bypass these shared contracts or introduce ad-hoc event fields.

## Rationale
By anchoring the entire system to a shared TypeScript/Zod contract, we guarantee that if an event passes schema validation, the collector can store it safely, the UI can render it correctly, and the replay engine can reconstruct it accurately. The contracts define the boundaries between modules, ensuring loose coupling between the frontend and backend implementations while enforcing strict data consistency. 

## Tradeoffs
- **Pros:** High reliability, elimination of "undefined field" bugs in UI, self-documenting data model, simple enforcement of breaking changes.
- **Cons:** Feature development requires cross-layer coordination (schema must be updated and approved before UI or Adapter can utilize new data). Framework-specific data that doesn't fit the schema must be serialized into generic `details` or `payload` maps rather than first-class fields.

## Rejected Alternatives
- **Schema-on-read:** Letting the collector accept any JSON blob and forcing the UI to handle variations. Rejected because it leads to exponential complexity in the UI and makes deterministic replay impossible.
- **Backend-owned schemas:** Letting the collector define the schema and relying on OpenAPI generation for the frontend. Rejected because sharing the exact Zod models ensures 100% type fidelity and allows the SDK to validate events *before* they are sent over the network.

## Migration Expectations for Phase 2/3
In Phase 2/3, as we expand beyond TypeScript, we will likely need a language-agnostic schema definition (e.g., JSON Schema, Protobuf, or Smithy) that can generate the Zod contracts as well as Pydantic models for Python adapters. The fundamental principle of "contracts as source of truth" will remain unchanged.

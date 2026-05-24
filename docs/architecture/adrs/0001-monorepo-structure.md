# ADR 0001: Monorepo Structure

## Context
The AeroGraph project consists of multiple distinct but tightly coupled pieces: a collector backend, a frontend visualization web app, shared SDKs, canonical schema contracts, and various framework adapters (e.g., LangChain). These components must evolve synchronously, especially during Phase 1 where the core event schema is being rapidly established and validated across the stack.

## Decision
We will use a TypeScript-based NPM workspaces monorepo structure, strictly separated into `apps/` (runnable services like collector and web) and `packages/` (reusable libraries like contracts, sdk, and adapters).

## Rationale
A monorepo ensures that all parts of the system are versioned together. Changes to the core event schema in `@afr/contracts` can immediately be validated against the `collector`, the `sdk`, and the `web` UI via a single `npm test` command in CI. This structure enforces atomic commits across boundaries and drastically reduces the friction of releasing multiple interdependent packages during the early stages of development.

## Tradeoffs
- **Pros:** Atomic commits, synchronized versioning, simpler local developer experience, single CI/CD pipeline, effortless sharing of TypeScript types.
- **Cons:** Increased tooling complexity over time (potential need for Nx or Turborepo if scale increases), slower overall `npm install` and build times as the number of adapters grows.

## Rejected Alternatives
- **Multi-repo approach:** Keeping the collector, web, and adapters in separate repositories. Rejected because it would require complex submodules or constant publishing of internal beta packages just to test a single cross-cutting feature (like a new field in the event schema).
- **Polyglot repository:** Mixing Python adapters and TypeScript core in the same build system. Rejected for Phase 1 to keep tooling simple; future non-TS adapters will be managed via separate workflows or repositories as needed.

## Migration Expectations for Phase 2/3
For Phase 2/3, as we add more language-specific adapters (e.g., Python), we will likely keep the TypeScript core (Collector, Web, TS Contracts) in this monorepo while moving Python adapters either to a dedicated Python monorepo or managing them via separate package managers in adjacent directories. We may also introduce a build system like Turborepo if build times become a bottleneck.

# System Overview

This document provides a high-level architectural view of the AeroGraph (AFR).

## Monorepo Architecture (ADR-0001)
The system is built as a TypeScript monorepo, strictly divided into:
- **`apps/`**: Runnable services.
  - `collector`: Express API and SQLite ingestion server.
  - `web`: React frontend utilizing React Flow (ADR-0005).
  - `demo`: Sample instrumented workflows.
- **`packages/`**: Reusable libraries.
  - `contracts`: The canonical Zod schemas and TypeScript types.
  - `sdk`: Normalized emitter client.
  - `adapter-*`: Framework-specific plugins (e.g., LangChain).

## Core Principles
1. **Contracts as Source of Truth (ADR-0002)**: The `@afr/contracts` package dictates all data models. Apps cannot bypass this layer.
2. **Immutable Trace Storage (ADR-0004)**: Events are ingested append-only. No historical data is ever mutated.
3. **Multi-Provider Safety (ADR-0006)**: Local agent automation (`.agents/`) is decoupled from CI infrastructure (`.github/`).

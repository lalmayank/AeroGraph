# ADR 0003: SQLite MVP Persistence

## Context
The Flight Recorder collector must persist ingested trace events. The storage layer must be fast for local reads/writes, easy to set up for a solo developer, and capable of enforcing unique constraints to prevent event duplication during concurrent agent executions. The current scaffolding uses an in-memory Map backed by JSONL files, which loads all traces into memory on startup (a major scalability bottleneck).

## Decision
For the Phase 1 MVP, we will use a local SQLite database to persist all trace events and serve as the backend for the collector API.

## Rationale
SQLite provides ACID guarantees, enabling us to enforce database-level unique constraints (`UNIQUE(trace_id, span_id)`) to safely handle concurrent ingestion. It requires zero infrastructure setup for the end user, making it ideal for a local developer tool. It is vastly superior to the JSONL approach because it allows querying, filtering, and paginating traces without loading the entire dataset into memory.

## Tradeoffs
- **Pros:** Zero-configuration deployment, single-file storage, ACID compliance, robust indexing, very high read/write performance for single-user workloads.
- **Cons:** Limited concurrent write scalability (though sufficient for local agent debugging), not suitable for a distributed, multi-tenant cloud environment out of the box.

## Rejected Alternatives
- **JSONL + In-Memory Cache (Current Scaffolding):** Rejected due to the OOM risk of loading all traces into memory, lack of atomic constraints, and poor querying capabilities.
- **PostgreSQL / MongoDB:** Rejected for Phase 1 because requiring a developer to spin up a Docker container just to capture local agent traces violates the goal of a lightweight, frictionless setup.
- **DuckDB:** While great for analytics, SQLite is more ubiquitous, has better ORM/driver support in Node.js, and is perfectly sufficient for the transactional append-only workload of tracing.

## Migration Expectations for Phase 2/3
For Phase 2/3, if we introduce a hosted, multi-tenant cloud version of the Flight Recorder, we will abstract the storage layer to support PostgreSQL or specialized event stores (e.g., ClickHouse). However, SQLite will remain the default for the local, single-developer OSS experience.

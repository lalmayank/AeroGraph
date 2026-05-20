# Event Flow

This document outlines how an execution event travels from an agent framework into the collector and UI.

## 1. Emission
A framework-specific adapter (e.g., `adapter-langchain`) intercepts native execution signals (like `RunTree` callbacks). It translates these into normalized trace data and passes them to the `@afr/sdk`.

## 2. Normalization & Validation
The `FlightRecorder` SDK client immediately validates the payload against `@afr/contracts`. If the event contains non-compliant ad-hoc fields, validation fails locally (ADR-0002).

## 3. Ingestion
The SDK posts the `TraceEvent` to the `apps/collector` REST API. The collector performs a secondary validation using the exact same `@afr/contracts` schema.

## 4. Persistence (ADR-0003 & ADR-0004)
The collector writes the event to a local SQLite database in an append-only fashion. The database enforces a `UNIQUE(trace_id, span_id)` constraint to prevent race conditions during concurrent local runs.

## 5. Visualization (ADR-0005)
The React Flow UI in `apps/web` polls or streams the traces. It computes a directed acyclic graph (DAG) purely from the immutable event log, rendering nodes and highlighting failures or detected loops dynamically.

# Phase 1: Data Model

## Trace Event Schema Additions

1. **LangGraph State Snapshot**
   - **Type**: `EventStateSnapshot`
   - **Fields**:
     - `eventId` (UUID)
     - `stateHash` (string, deterministic hash)
     - `stateDiff` (JSON Object)
     - `fullState` (JSON Object)
     - `nodeName` (string)
   - **Validation**:
     - Hash MUST be deterministic based on the fullState.

2. **LCEL Streaming Metrics**
   - **Type**: `StreamingTelemetry` (added to LLM Event metadata)
   - **Fields**:
     - `timeToFirstTokenMs` (number)
     - `totalDurationMs` (number)
     - `tokensPerSecond` (number)
     - `tokenCount` (number)
   - **Validation**: Non-negative values.

3. **RAG Retrieval Payload**
   - **Type**: `EventRetriever`
   - **Fields**:
     - `query` (string)
     - `documents` (Array of `RetrievedDocument`)
       - `pageContent` (string)
       - `metadata` (JSON Object)
       - `score` (number, optional)
   - **Validation**: Preserves retrieval order.

4. **Human Checkpoint Event**
   - **Type**: `EventCheckpoint`
   - **Fields**:
     - `eventId` (UUID)
     - `checkpointId` (string)
     - `reason` (string)
     - `state` (JSON Object)
   - **Validation**: Represents an interrupt/wait state, no execution mutation.

## Storage
- SQLite schema additions: Add columns/tables for `state_snapshots`, `retriever_events`, and update `trace_events` metadata column to support streaming metrics.

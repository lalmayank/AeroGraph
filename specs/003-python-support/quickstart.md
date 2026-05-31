# Quickstart: Feature 003 — Python SDK & Multi-Language Contract Support

This quickstart describes the intended developer workflow once Feature 003 is implemented.

## 1) Start the existing collector + web UI

From the repo root:

- Install Node dependencies:
  - `npm install`

- Start the collector (default: `http://localhost:4317`):
  - `npm run dev -w apps-collector`

- Start the web UI (Vite dev server):
  - `npm run dev -w apps-web`

## 2) Install the Python SDK

Feature 003 ships native Python distributions. Python users should not need Node.js.

Two supported flows:

- From PyPI (recommended for users):
  - `python -m pip install aerograph-sdk`

- From this repo (contributors):
  - `python -m pip install -e python/aerograph-sdk`

## 3) Emit a minimal trace from Python

Example (API shape; exact module names finalized during implementation):

```python
from aerograph_sdk import FlightRecorder

recorder = FlightRecorder(
    endpoint="http://localhost:4317",
    actor={"id": "agent-1", "name": "Demo Agent"},
)

root = recorder.new_span_id()
recorder.prompt(parent_span_id=None, span_id=root, text="Hello")
recorder.response(parent_span_id=root, text="Hi from Python")
```

Expected result:

- Collector accepts events (HTTP 201).
- Web UI lists the trace and renders nodes/edges deterministically.

## 4) Install and attach the LangChain adapter

- Install:
  - `python -m pip install aerograph-langchain`

- Attach to LangChain via callbacks (conceptual; exact binding finalized during implementation):

```python
from aerograph_sdk import FlightRecorder
from aerograph_langchain import AeroGraphCallbackHandler

recorder = FlightRecorder(endpoint="http://localhost:4317", actor={"id": "agent-1"})
handler = AeroGraphCallbackHandler(recorder)

# pass `callbacks=[handler]` to LangChain constructs
```

Expected coverage (when the underlying signals exist):

- prompt/response
- tool call + tool result
- streaming telemetry
- retrieval payloads
- state snapshots / checkpoints via LangGraph integration through LangChain

## 5) Deterministic hashing parity

When emitting `state_snapshot` events, Python computes `stateHash` using the same algorithm as `@aerograph/contracts:getDeterministicStateHash`.

- Cross-language parity tests must pass before release.

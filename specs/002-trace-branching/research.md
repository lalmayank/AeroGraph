# Phase 0: Research & Discovery

## LCEL Streaming Telemetry
- **Decision**: Use `handleLLMNewToken` to calculate Time To First Token (TTFT) and total streaming metrics non-blocking.
- **Rationale**: LangChain's `BaseCallbackHandler` provides `handleLLMNewToken` natively. Storing the first token timestamp and tracking count allows metrics computation at `handleLLMEnd` without delaying stream delivery to the application.
- **Alternatives considered**: Wrapping the final stream iterable natively. Rejected because LangChain callbacks are cleaner and more decoupled from user code.

## LangGraph State Capture
- **Decision**: Extract state at node transitions from `inputs` and `outputs` in LangGraph's standard events (`handleChainStart` / `handleChainEnd` with specific tags).
- **Rationale**: LangGraph nodes are modeled as chains in LangChain's callback system. We can capture the full state by inspecting the inputs/outputs of these chains and computing a deterministic hash.
- **Alternatives considered**: Injecting a custom LangGraph node for state tracking. Rejected because it mutates the execution graph, violating the observability design.

## RAG Retrieval Payloads
- **Decision**: Hook into `handleRetrieverEnd`.
- **Rationale**: This callback provides the array of retrieved documents (with pageContent and metadata). We can normalize this directly into the tracing schema.
- **Alternatives considered**: Custom wrappers around vector stores. Rejected because `handleRetrieverEnd` provides a unified interface across all retrievers.

## Human Checkpoint Events
- **Decision**: Listen for `Interrupt` or specific LangGraph tags indicating a node wait state. Capture it as an explicit event type.
- **Rationale**: LangGraph throws an `Interrupt` when halting for human input. We can catch or observe this state to mark the trace execution as paused.
- **Alternatives considered**: Orchestrating the resume ourselves. Rejected because the spec explicitly states "NO orchestration control" and "capture-only".

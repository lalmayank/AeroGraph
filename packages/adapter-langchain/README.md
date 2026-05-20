# @afr/adapter-langchain

This adapter bridges LangChain.js workflows into the Agent Flight Recorder.

## Deterministic Mapping

LangChain's complex callback hierarchy is deterministically mapped to the minimal Flight Recorder contracts as follows:

| LangChain Callback | AFR Event Kind | Metadata Mapped |
|---|---|---|
| `handleLLMStart` | `prompt` | messages/prompts, parentSpanId, runId -> spanId |
| `handleLLMEnd` | `response` | generations, runId -> spanId |
| `handleLLMError` | `error` | error message, runId -> spanId |
| `handleToolStart` | `tool_call` | input string/JSON, runId -> spanId |
| `handleToolEnd` | `tool_result` | output, runId -> spanId |
| `handleToolError` | `error` | error message, runId -> spanId |
| `handleChainStart` | *(ignored)* | We only trace leafs for MVP |
| `handleChainEnd` | *(ignored)* | - |
| `handleAgentAction`| *(ignored)* | Caught by tool/llm events |

For Phase 1 MVP, we focus strictly on LLMs and Tools to keep the graph comprehensible.

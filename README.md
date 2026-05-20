# Agent Flight Recorder

An open-source flight recorder for AI agent workflows.

## What it does

- Captures **prompts**, **responses**, **tool calls**, and **agent handoffs** as normalized trace events
- Stores traces in a replay-safe, append-only SQLite store
- Visualizes traces as an interactive **trace graph** with payload inspection and failure highlighting

## Repository structure

- `packages/contracts`: event schema + shared contracts (source of truth)
- `packages/sdk`: reference SDK for emitting normalized trace events
- `packages/adapter-langchain`: MVP adapter for LangChain workflows
- `apps/collector`: trace event ingest + SQLite storage
- `apps/web`: interactive trace graph UI
- `apps/demo`: LangChain integration smoke test

## Development

Requirements: Node.js (LTS)

- Install: `npm install`
- Start collector: `npm run dev -w apps/collector`
- Start web UI: `npm run dev -w apps/web`
- Run tests: `npm test`

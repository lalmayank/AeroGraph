# Agent Flight Recorder

An open-source flight recorder for AI agent workflows.

## What it does

- Captures **prompts**, **responses**, **tool calls**, and **agent handoffs** as normalized trace events
- Stores traces in a replayable format
- Visualizes traces as an interactive **trace graph** with payload inspection
- Supports **replay/fork**, **diffing**, **loop detection**, and **failure highlighting**

## Repository structure

- `packages/contracts`: event schema + shared contracts (source of truth)
- `packages/sdk`: reference SDK for emitting normalized trace events
- `apps/collector`: trace event ingest + storage + analysis (diff/loops/replay)
- `apps/web`: interactive trace graph UI

## Development

Requirements: Node.js (LTS)

- Install: `npm install`
- Start collector: `npm run dev -w apps/collector`
- Start web UI: `npm run dev -w apps/web`
- Run tests: `npm test`

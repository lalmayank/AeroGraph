# Phase 1 MVP Quickstart & Smoke Checklist

This document verifies the end-to-end functionality of the AeroGraph (Phase 1 MVP).

## Running the Stack

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Collector**
   ```bash
   npm run dev -w apps-collector
   # Should output: "collector listening on http://localhost:4317"
   ```

3. **Start the Web UI** (In a new terminal)
   ```bash
   npm run dev -w apps-web
   # Open the provided localhost URL in your browser
   ```

4. **Run the LangChain Demo** (In a new terminal)
   ```bash
   npm run dev -w apps-demo
   # Simulates an LLM call and emits events to the collector
   ```

## Smoke Test Checklist (T033)

- [ ] **Ingestion Works**: The `apps-demo` script runs without throwing errors, indicating `POST /v1/events` succeeded.
- [ ] **Database Persists**: A new SQLite DB is created at `apps/collector/data/afr.sqlite`.
- [ ] **Web UI Lists Traces**: The web UI dropdown populates with the newly ingested trace.
- [ ] **Web UI Renders Graph**: Selecting the trace renders the nodes (prompt and response) in React Flow.
- [ ] **Web UI Live Polling**: If you run `npm run dev -w apps-demo` again, the graph updates automatically (if "Live updating" is checked).
- [ ] **Playback Controls**: Clicking "Prev" steps backward through the execution history deterministically.
- [ ] **Payload Inspection**: Clicking a node shows its `spanId`, `kind`, and `payload` in the right panel.

## Architecture & Boundaries Verification (T034)

- **`@afr/contracts`**: Contains no imports from other packages.
- **`apps/collector`**: Does not import from `apps/web`. Uses `@afr/contracts` for validation.
- **Phase 1 Guardrails**: Phase 2 features (`forkTrace`, `diffTraces`, `analyze`) have been explicitly removed from the collector and web UI.

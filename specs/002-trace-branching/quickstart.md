# Quickstart: AeroGraph Observability (Phase 2.5)

To start capturing advanced observability data:

1. **Install Adapters**:
   ```bash
   npm install @afr/adapter-langchain
   ```

2. **Instrument LangGraph**:
   ```typescript
   import { AfrLangChainCallbackHandler } from '@afr/adapter-langchain';
   
   const handler = new AfrLangChainCallbackHandler({ traceId: 'my-trace' });
   
   // The handler automatically captures LCEL streaming, RAG payloads,
   // state transitions, and checkpoints.
   await myAgent.invoke(input, { callbacks: [handler] });
   ```

3. **View the Trace**:
   Open the Web UI to see:
   - Branch lineage graph
   - Trace diffs
   - TTFT and streaming telemetry
   - RAG retrieved chunks
   - Full state snapshot diffs

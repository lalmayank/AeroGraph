# ADR 0005: React Flow Graph Visualization

## Context
Multi-agent workflows produce complex execution topologies. A simple linear log of events is insufficient for understanding handoffs between agents, parallel tool executions, and nested sub-tasks. Developers need a visual representation of the trace that maps directly to the conceptual graph of their agents.

## Decision
We will use React Flow (now `@xyflow/react`) as the primary visualization engine in the `apps/web` frontend to render traces as interactive, directed acyclic graphs (DAGs) or cyclic graphs (for loops).

## Rationale
React Flow provides out-of-the-box support for custom node rendering, panning, zooming, and interactive edge routing. It is lightweight, integrates natively with our React frontend, and can easily render the hierarchical relationships defined by our `parentSpanId` and `links` fields. It allows us to embed complex interactive components (like payload inspectors or failure highlights) directly into the graph nodes.

## Tradeoffs
- **Pros:** High customizability, excellent ecosystem, native React integration, handles moderate graph sizes well, built-in layout utilities (via Dagre or ELK).
- **Cons:** Performance degrades when rendering massive graphs (10k+ nodes) simultaneously without virtualization. Custom layout engines require careful tuning to ensure complex multi-agent loops look readable.

## Rejected Alternatives
- **Linear Log Views (e.g., Datadog / Jaeger style traces):** While useful for strict request/response microservices, traditional waterfall charts fail to convey the dynamic, non-deterministic routing and looping inherent in LLM agent workflows.
- **D3.js:** Provides ultimate flexibility but requires building panning, zooming, and node-management abstractions from scratch. Too much overhead for Phase 1 MVP.
- **Cytoscape.js:** Very powerful for massive network graphs, but styling nodes with complex React components is cumbersome compared to React Flow.

## Migration Expectations for Phase 2/3
For Phase 2/3, if traces regularly exceed thousands of nodes, we will implement graph virtualization (collapsing sub-graphs or hiding irrelevant nodes) or transition to WebGL-based renderers for specific macro-views. However, React Flow will remain the primary engine for detailed trace inspection.

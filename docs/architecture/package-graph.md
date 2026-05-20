# Package Dependency Graph

To maintain architectural integrity, the repository strictly enforces dependency boundaries between internal packages and apps.

## Allowed Dependency Flow (Phase 1 MVP)

```mermaid
graph TD
    %% Define Nodes
    C[packages/contracts]
    S[packages/sdk]
    A[packages/adapter-langchain]
    
    Col[apps/collector]
    Web[apps/web]
    Demo[apps/demo]

    %% Rules
    S -->|imports| C
    A -->|imports| S
    A -->|imports| C
    
    Col -->|imports| C
    Web -->|imports| C
    
    Demo -->|imports| S
    Demo -->|imports| A

    %% Styling
    classDef package fill:#e2f0d9,stroke:#548235,stroke-width:2px;
    classDef app fill:#dae8fc,stroke:#6c8ebf,stroke-width:2px;
    
    class C,S,A package;
    class Col,Web,Demo app;
```

## Boundary Rules (ADR-0001 & ADR-0002)
1. **`contracts` Isolation**: `packages/contracts` has zero internal dependencies. It is the root of the graph.
2. **No App-to-App Coupling**: `apps/web` must not import from `apps/collector`. They only share knowledge via HTTP payloads validated by `packages/contracts`.
3. **Adapters are Stateless**: Adapters like `adapter-langchain` depend only on `sdk` and `contracts`. They never talk directly to SQLite or the UI.

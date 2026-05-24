# ADR 0006: Multi-Provider Integration Strategy

## Context
AeroGraph needs robust governance across various environments. We leverage the Spec Kit framework (`.specify/`) and agent tools (`.agents/`) for local specification management, but we also run checks in GitHub Actions (`.github/agents/`). Keeping these integration points synchronized without overwriting protected GitHub infrastructure is critical.

## Decision
We will maintain strict boundaries for our multi-provider integrations:
1. `.specify/` controls the core specification framework, checklists, and templates.
2. `.agents/` controls local agent tools (like Antigravity skills) and local automation.
3. `.github/` is protected integration infrastructure. GitHub workflows and GitHub agent bindings will only mirror the local agent specs, but they are treated as read-only by local agents during automated tasks.

## Rationale
This separation ensures that local development agents don't accidentally corrupt or overwrite critical CI/CD infrastructure (`.github`). By keeping `.agents/` structured and fully compatible with Spec Kit, we achieve multi-provider agent portability: an agent running locally via CLI has the same contextual guardrails as an agent running in GitHub Copilot or other CI environments.

## Tradeoffs
- **Pros:** Safety of CI/CD pipelines, seamless portability across different agent runners, clear separation of local vs. remote automation logic.
- **Cons:** Slight duplication of agent instruction files between `.agents/skills/` and `.github/agents/`, requiring manual or carefully scripted synchronization.

## Rejected Alternatives
- **Unified `.github` storage:** Forcing local agents to read their skills entirely from `.github`. Rejected because local agents should not depend on GitHub-specific folders, preserving provider neutrality (e.g., using GitLab or purely local setups).
- **Auto-syncing `.github` via local agents:** Allowing the local agent to automatically rewrite `.github/agents/` files whenever `.agents/` changes. Rejected due to the risk of an agent breaking GitHub Actions syntax or overwriting protected configuration.

## Migration Expectations for Phase 2/3
In Phase 2/3, we may introduce a strict one-way compilation step (e.g., `npm run sync-agents`) that safely derives `.github/agents/` from `.agents/` using standard templating, further reducing manual duplication while maintaining the safety of the protected `.github` directory.

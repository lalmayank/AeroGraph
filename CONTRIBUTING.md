# Contributing to AeroGraph

Thanks for helping improve AeroGraph.

## Local Setup

```sh
npm install
npm run build
npm test
```

For focused development, run the services you need from the workspace root:

```sh
npm run dev -w apps/collector
npm run dev -w apps/web
```

## Branching Workflow

- Keep changes small and focused.
- Use a short-lived branch with a clear name, such as `feat/lineage-ui` or `fix/replay-order`.
- Rebase or merge from the latest mainline before opening a pull request.

## Commit Guidance

- Use concise, imperative commit messages.
- Reference the issue or problem statement when it helps reviewers understand intent.
- Keep commits logically grouped so replay, schema, and UI changes are easy to audit.

## Pull Request Expectations

- Explain what changed and why.
- Include screenshots or short recordings when the UI changes.
- Provide the test commands you ran and their results.
- Call out any schema, replay, or determinism impact explicitly.
- Disclose breaking changes up front.

## Coding Standards

- Prefer TypeScript-first changes with explicit types where they improve clarity.
- Keep contracts in `packages/contracts` as the source of truth.
- Update tests alongside behavior changes.
- Match the existing monorepo structure and avoid cross-package shortcuts.

## Deterministic Architecture Rules

- Treat traces and lineage as append-only.
- Do not mutate historical events in place.
- Keep diff, lineage, and loop analysis deterministic for the same inputs.
- Avoid hidden time, randomness, or environment-sensitive behavior in core replay paths.

## Contract-First Requirements

- Update shared contracts before wiring app-level behavior around new data shapes.
- Validate inputs and outputs at system boundaries.
- Do not bypass the contract layer with ad hoc schemas or unchecked payloads.
- Changes to `packages/contracts` should be treated as high-risk and discussed before implementation.
- Prefer adapter work and app-level integrations unless the contract change is clearly required.
- If a contract change is unavoidable, include compatibility notes, tests, and downstream update steps in the PR.

## Contribution Scope Guidance

- Early contributions should favor adapters, demos, UI improvements, tests, and bug fixes.
- Shared contract changes should be limited to maintainers or explicitly reviewed proposals.
- If you need to change the core trace model, open an issue first and explain the migration impact.

## Replay Safety Expectations

- Preserve ordering and event identity across ingest, storage, and replay.
- Add tests for any change that could alter replay output.
- Favor stable, reproducible fixtures over live or time-dependent test data.
- If a change affects replay semantics, describe the risk in the PR before merging.
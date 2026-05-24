## Summary

What changed, and why?

## Affected Packages

- [ ] `packages/contracts`
- [ ] `packages/sdk`
- [ ] `packages/adapter-langchain`
- [ ] `apps/collector`
- [ ] `apps/web`
- [ ] `apps/demo`

If the change touches multiple packages, list them here and note any dependency order.

## Screenshots

- [ ] Not applicable
- [ ] Included below

If the UI changed, include screenshots or a short recording.

## Test Evidence

List the commands you ran and the outcome.

- `npm run build`
- `npm test`

## Replay and Determinism

- [ ] I checked whether this change affects replay behavior.
- [ ] I verified the change remains deterministic for the same input.
- [ ] I added or updated tests for any replay-sensitive path.

## Schema Compatibility

- [ ] No schema changes
- [ ] Schema changes are backward compatible
- [ ] Schema changes require coordination

Describe any contract, payload, or storage changes here.

## Migration Notes

If this change needs follow-up work, document the upgrade or rollout path.

## Breaking Changes

- [ ] This change is not breaking
- [ ] This change includes a breaking change

If breaking, describe the migration path and any follow-up work.

## Checklist

- [ ] The change is focused and ready for review.
- [ ] I updated tests or explained why no test update was needed.
- [ ] I reviewed the diff for accidental schema or replay regressions.
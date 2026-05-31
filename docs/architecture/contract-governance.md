# Contract Governance

AeroGraph treats TypeScript Zod contracts (`packages/contracts`) as the absolute source of truth. Python models and JSON Schemas are derived artifacts.

## Updating Artifacts

If you make changes to `packages/contracts`, you must update the downstream artifacts or CI will fail.

1. **Export JSON Schema**:
   Run `npm run schema:export` from the repo root to generate `packages/schema-exporter/artifacts/**/*.schema.json`.

2. **Generate Python Models**:
   Run `uv run python/aerograph-sdk/tools/generate_contracts.py` to regenerate the Pydantic models in `python/aerograph-sdk/src/aerograph_sdk/contracts/generated.py`.

3. **Check Parity Fixtures**:
   If you change hashing logic or tie-breaking order, update the fixtures in `packages/contracts/src/__fixtures__/parity/`.

## CI Gates

- `schema-governance.yml`: Fails if JSON Schema artifacts do not match the Zod definitions.
- `python.yml`: Fails if Python generated models do not match the JSON Schema.
- `parity.yml`: Fails if Python hashing or sorting output differs from TypeScript.

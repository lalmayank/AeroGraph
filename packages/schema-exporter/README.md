# @aerograph/schema-exporter

A CLI tool for exporting AeroGraph's Zod schemas into strict JSON Schema artifacts.

## Overview

Because AeroGraph guarantees strict multi-language parity through a contract-first architecture, the TypeScript definitions in `@aerograph/contracts` must be translated into representations readable by other languages (e.g. Python). This tool generates `artifacts/*.json` representing the JSON Schema of every canonical event.

## Installation

```bash
npm install @aerograph/schema-exporter
```

*(Requires Node.js >= 18.18.0)*

## Usage

This tool is primarily used internally by the CI and during local development.

```bash
# Export all Zod schemas to JSON artifacts
npm run schema:export -w @aerograph/schema-exporter

# Check if the generated artifacts have drifted from the Zod schemas
npm run schema:check -w @aerograph/schema-exporter
```

## License
Apache-2.0

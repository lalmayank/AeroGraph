# AeroGraph Collector

The collector is responsible for ingesting, validating, and persisting trace events.

## Configuration

You can configure the collector by creating a `.env` file in this directory based on `.env.example`:

- `PORT`: The port the server listens on (default: 4317)
- `AFR_DB_PATH`: The path to the SQLite database (default: data/afr.sqlite)

## SQLite Storage

The collector uses SQLite for storage to provide zero-configuration local persistence while guaranteeing atomic unique constraints (`UNIQUE(trace_id, span_id)`) to handle concurrent trace event ingestion safely.

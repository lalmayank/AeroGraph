import type { Database } from "better-sqlite3";

export function runMigrations(db: Database): void {
  // We use STRICT mode for better type safety if supported, but standard works too.
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trace_id TEXT NOT NULL,
      span_id TEXT NOT NULL,
      parent_span_id TEXT,
      occurred_at TEXT NOT NULL,
      kind TEXT NOT NULL,
      event_data TEXT NOT NULL,
      UNIQUE(trace_id, span_id)
    );

    CREATE INDEX IF NOT EXISTS idx_events_trace_id ON events(trace_id);

    CREATE TABLE IF NOT EXISTS trace_derivations (
      child_trace_id TEXT PRIMARY KEY,
      parent_trace_id TEXT NOT NULL,
      forked_from_span_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      overrides_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_trace_derivations_parent_trace_id ON trace_derivations(parent_trace_id);
    CREATE INDEX IF NOT EXISTS idx_trace_derivations_created_at ON trace_derivations(created_at);
  `);
}

import type { Database } from "better-sqlite3";
import type { TraceEvent, TraceListResponse, TraceWithMeta } from "@afr/contracts";

export class SqliteTraceStore {
  constructor(private db: Database) {}

  appendEvent(event: TraceEvent): void {
    const stmt = this.db.prepare(`
      INSERT INTO events (trace_id, span_id, parent_span_id, occurred_at, kind, event_data)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    // Will throw better-sqlite3 constraint error if trace_id/span_id already exists
    stmt.run(
      event.traceId,
      event.spanId,
      event.parentSpanId,
      event.occurredAt,
      event.kind,
      JSON.stringify(event)
    );
  }

  listTraces(): TraceListResponse {
    // Get unique traces and their min occurred_at (createdAt) and max occurred_at (updatedAt)
    const rows = this.db.prepare(`
      SELECT 
        trace_id, 
        MIN(occurred_at) as created_at, 
        MAX(occurred_at) as updated_at, 
        COUNT(*) as event_count
      FROM events
      GROUP BY trace_id
      ORDER BY updated_at DESC
    `).all() as any[];

    const traces = rows.map((r) => {
      // Try to find the root span (where parent_span_id IS NULL)
      const rootRow = this.db.prepare(`
        SELECT span_id FROM events WHERE trace_id = ? AND parent_span_id IS NULL LIMIT 1
      `).get(r.trace_id) as any;

      return {
        traceId: r.trace_id,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        eventCount: r.event_count,
        rootSpanId: rootRow ? rootRow.span_id : null
      };
    });

    return { traces };
  }

  getTrace(traceId: string): TraceWithMeta | null {
    const rows = this.db.prepare(`
      SELECT event_data FROM events WHERE trace_id = ? ORDER BY id ASC
    `).all(traceId) as any[];

    if (rows.length === 0) {
      return null;
    }

    const events = rows.map((r) => JSON.parse(r.event_data) as TraceEvent);
    
    let createdAt = events[0].occurredAt;
    let updatedAt = events[0].occurredAt;
    let rootSpanId = null;

    for (const e of events) {
      if (e.occurredAt < createdAt) createdAt = e.occurredAt;
      if (e.occurredAt > updatedAt) updatedAt = e.occurredAt;
      if (e.parentSpanId === null) rootSpanId = e.spanId;
    }

    return {
      meta: {
        traceId,
        createdAt,
        updatedAt,
        eventCount: events.length,
        rootSpanId
      },
      events
    };
  }
}

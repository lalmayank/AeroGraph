import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { runMigrations } from "./sqlite/migrate";
import { SqliteTraceStore } from "./sqliteStore";
import type { TraceEvent } from "@aerograph/contracts";

/**
 * T052: Lineage reconstruction performance check.
 * Root trace + 200 sibling children must reconstruct within 5 seconds.
 */
describe("perf: lineage reconstruction", () => {
  it("reconstructs lineage for root + 200 children within 5s", () => {
    const db = new Database(":memory:");
    runMigrations(db);
    const store = new SqliteTraceStore(db);

    // Seed base trace
    const baseEvent: TraceEvent = {
      schemaVersion: "1.0.0",
      traceId: "t_perf_base",
      spanId: "s1",
      parentSpanId: null,
      occurredAt: "2026-05-20T00:00:00.000Z",
      actor: { kind: "agent", id: "agent-perf" },
      kind: "prompt",
      status: "ok",
      payload: { text: "perf test" },
      links: []
    };
    store.appendEvent(baseEvent);

    // Fork 200 children
    const children: string[] = [];
    for (let i = 0; i < 200; i++) {
      const id = store.forkTrace({
        baseTraceId: "t_perf_base",
        forkFromSpanId: "s1",
        overrides: {}
      });
      children.push(id);
    }

    const start = Date.now();
    const graph = store.getLineageGraph("t_perf_base");
    const elapsed = Date.now() - start;

    expect(graph.edges.length).toBe(200);
    expect(elapsed).toBeLessThan(5000); // must complete within 5 seconds
    
    db.close();
  }, 10000);
});

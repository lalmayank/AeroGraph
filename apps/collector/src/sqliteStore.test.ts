import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { SqliteTraceStore } from "./sqliteStore";
import Database from "better-sqlite3";
import { runMigrations } from "./sqlite/migrate";

describe("collector: SqliteTraceStore", () => {
  let db: any;
  let store: SqliteTraceStore;

  beforeEach(() => {
    db = new Database(":memory:");
    runMigrations(db);
    store = new SqliteTraceStore(db);
  });

  afterEach(() => {
    db.close();
  });

  it("appends and retrieves an event safely", () => {
    const event = {
      schemaVersion: "1.0.0",
      traceId: "t-1",
      spanId: "s-1",
      parentSpanId: null,
      occurredAt: new Date().toISOString(),
      actor: { kind: "agent", id: "agent-1" },
      kind: "prompt",
      status: "ok",
      payload: { text: "Hello" },
      links: []
    } as any;

    store.appendEvent(event);
    
    const trace = store.getTrace("t-1");
    expect(trace).toBeDefined();
    expect(trace?.meta.traceId).toBe("t-1");
    expect(trace?.events.length).toBe(1);
    expect(trace?.events[0].spanId).toBe("s-1");
  });

  it("enforces unique constraints on traceId + spanId", () => {
    const event = {
      schemaVersion: "1.0.0",
      traceId: "t-1",
      spanId: "s-1",
      parentSpanId: null,
      occurredAt: new Date().toISOString(),
      actor: { kind: "agent", id: "agent-1" },
      kind: "prompt",
      status: "ok",
      payload: { text: "Hello" },
      links: []
    } as any;

    store.appendEvent(event);
    expect(() => store.appendEvent(event)).toThrow(); // Should throw constraint error
  });

  it("lists traces", () => {
    const event1 = {
      schemaVersion: "1.0.0",
      traceId: "t-1",
      spanId: "s-1",
      parentSpanId: null,
      occurredAt: new Date().toISOString(),
      actor: { kind: "agent", id: "agent-1" },
      kind: "prompt",
      status: "ok",
      payload: {},
      links: []
    } as any;
    
    store.appendEvent(event1);

    const event2 = {
      ...event1,
      traceId: "t-2"
    };

    store.appendEvent(event2);

    const list = store.listTraces();
    expect(list.traces.length).toBe(2);
    expect(list.traces.map(t => t.traceId)).toContain("t-1");
    expect(list.traces.map(t => t.traceId)).toContain("t-2");
  });
});

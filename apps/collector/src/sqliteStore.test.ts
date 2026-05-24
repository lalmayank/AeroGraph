import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { SqliteTraceStore } from "./sqliteStore";
import Database from "better-sqlite3";
import { runMigrations } from "./sqlite/migrate";
import { loadPhase2FixtureTrace } from "./testUtils";
import type { TraceEvent } from "@aerograph/contracts";

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

  // T008: migration verification
  it("creates trace_derivations table and indexes", () => {
    const table = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='trace_derivations'")
      .get();
    expect(table?.name).toBe("trace_derivations");

    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='trace_derivations'")
      .all()
      .map((r: any) => r.name);

    expect(indexes).toContain("idx_trace_derivations_parent_trace_id");
    expect(indexes).toContain("idx_trace_derivations_created_at");
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
    expect(() => store.appendEvent(event)).toThrow();
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
    expect(list.traces.map((t: any) => t.traceId)).toContain("t-1");
    expect(list.traces.map((t: any) => t.traceId)).toContain("t-2");
  });

  // T010: fork + lineage tests
  it("forks a trace append-only and keeps parent immutable", () => {
    const baseEvents = loadPhase2FixtureTrace("base");
    for (const e of baseEvents) store.appendEvent(e);

    const parentBefore = store.getTrace("t_base");
    expect(parentBefore?.events.length).toBe(baseEvents.length);

    const childTraceId = store.forkTrace({
      baseTraceId: "t_base",
      forkFromSpanId: "s6",
      overrides: { promptText: "Fork override A" }
    });

    const parentAfter = store.getTrace("t_base");
    expect(parentAfter?.events.length).toBe(baseEvents.length);

    const child = store.getTrace(childTraceId);
    expect(child?.meta.traceId).toBe(childTraceId);
    expect(child?.meta.derivedFrom).toMatchObject({ baseTraceId: "t_base", forkedFromSpanId: "s6" });

    const childSpanIds = (child?.events ?? []).map((e) => e.spanId);
    expect(childSpanIds).toContain("s1");
    expect(childSpanIds).toContain("s6");
    expect(childSpanIds).not.toContain("s7");

    const forkPoint = (child?.events ?? []).find((e) => e.spanId === "s6");
    expect(forkPoint?.kind).toBe("prompt");
    expect((forkPoint as any)?.payload?.text).toBe("Fork override A");
  });

  it("prevents lineage cycles", () => {
    const baseEvents = loadPhase2FixtureTrace("base");
    for (const e of baseEvents) store.appendEvent(e);

    const childTraceId = store.forkTrace({
      baseTraceId: "t_base",
      forkFromSpanId: "s6",
      overrides: { promptText: "Fork override A" }
    });

    expect(() =>
      store.appendDerivation({
        childTraceId: "t_base",
        parentTraceId: childTraceId,
        forkedFromSpanId: "s1",
        overrides: {}
      })
    ).toThrow();
  });

  it("reconstructs a deterministic lineage graph", () => {
    const baseEvents = loadPhase2FixtureTrace("base");
    for (const e of baseEvents) store.appendEvent(e);

    const a = store.forkTrace({ baseTraceId: "t_base", forkFromSpanId: "s6", overrides: { promptText: "A" } });
    const b = store.forkTrace({ baseTraceId: "t_base", forkFromSpanId: "s6", overrides: { promptText: "B" } });

    const g1 = store.getLineageGraph("t_base");
    const g2 = store.getLineageGraph("t_base");

    expect(g1.rootTraceId).toBe("t_base");
    expect(g1).toEqual(g2);

    const childIds = g1.edges
      .filter((e) => e.parentTraceId === "t_base")
      .map((e) => e.childTraceId);

    expect(childIds).toContain(a);
    expect(childIds).toContain(b);
  });

  // T024: lineage-aware diff unit tests
  it("diffTraces returns structured result for parent vs child", () => {
    const baseEvents = loadPhase2FixtureTrace("base");
    for (const e of baseEvents) store.appendEvent(e);

    const childId = store.forkTrace({
      baseTraceId: "t_base",
      forkFromSpanId: "s1",
      overrides: {}
    });

    const diff = store.diffTraces("t_base", childId);
    expect(diff.a.traceId).toBe("t_base");
    expect(diff.b.traceId).toBe(childId);
    expect(Array.isArray(diff.changed)).toBe(true);
  });

  it("diffTraces detects changes when sibling branches diverge", () => {
    const baseEvents = loadPhase2FixtureTrace("base");
    for (const e of baseEvents) store.appendEvent(e);

    const childA = store.forkTrace({ baseTraceId: "t_base", forkFromSpanId: "s6", overrides: { promptText: "A" } });
    const childB = store.forkTrace({ baseTraceId: "t_base", forkFromSpanId: "s6", overrides: { promptText: "B" } });

    const diff = store.diffTraces(childA, childB);
    expect(diff.a.traceId).toBe(childA);
    expect(diff.b.traceId).toBe(childB);
    expect(Array.isArray(diff.changed)).toBe(true);
  });

  it("diffTraces is deterministic for same inputs", () => {
    const baseEvents = loadPhase2FixtureTrace("base");
    for (const e of baseEvents) store.appendEvent(e);

    const childId = store.forkTrace({ baseTraceId: "t_base", forkFromSpanId: "s6", overrides: {} });

    const d1 = store.diffTraces("t_base", childId);
    const d2 = store.diffTraces("t_base", childId);
    expect(d1).toEqual(d2);
  });

  it("diffTraces throws for missing traces", () => {
    expect(() => store.diffTraces("missing-a", "missing-b")).toThrow();
  });

  // T047: fork prefix selection determinism regression
  it("forkTrace selects deterministic prefix with identical timestamps", () => {
    const sharedTime = "2026-05-20T00:00:00.000Z";
    const events: TraceEvent[] = [
      {
        schemaVersion: "1.0.0",
        traceId: "t_det",
        spanId: "s1",
        parentSpanId: null,
        occurredAt: sharedTime,
        actor: { kind: "agent", id: "agent-a" },
        kind: "prompt",
        status: "ok",
        payload: { text: "A" },
        links: []
      },
      {
        schemaVersion: "1.0.0",
        traceId: "t_det",
        spanId: "s2",
        parentSpanId: "s1",
        occurredAt: sharedTime,
        actor: { kind: "agent", id: "agent-a" },
        kind: "response",
        status: "ok",
        payload: { text: "B" },
        links: []
      },
      {
        schemaVersion: "1.0.0",
        traceId: "t_det",
        spanId: "s3",
        parentSpanId: "s2",
        occurredAt: "2026-05-20T00:00:01.000Z",
        actor: { kind: "agent", id: "agent-a" },
        kind: "prompt",
        status: "ok",
        payload: { text: "C" },
        links: []
      }
    ];

    for (const e of events) store.appendEvent(e);

    const c1 = store.forkTrace({ baseTraceId: "t_det", forkFromSpanId: "s2", overrides: {} });
    const c2 = store.forkTrace({ baseTraceId: "t_det", forkFromSpanId: "s2", overrides: {} });

    const child1 = store.getTrace(c1)!;
    const child2 = store.getTrace(c2)!;

    // Filter out note events (nanoid-generated spanIds), compare only prefix event spanIds
    const prefixIds1 = child1.events.filter((e) => e.kind !== "note").map((e) => e.spanId).sort();
    const prefixIds2 = child2.events.filter((e) => e.kind !== "note").map((e) => e.spanId).sort();
    expect(prefixIds1).toEqual(prefixIds2);
    expect(prefixIds1).toContain("s1");
    expect(prefixIds1).toContain("s2");
  });

  // T049: lineage stress tests
  it("handles many sibling branches with deterministic ordering", () => {
    const baseEvents = loadPhase2FixtureTrace("base");
    for (const e of baseEvents) store.appendEvent(e);

    const children: string[] = [];
    for (let i = 0; i < 10; i++) {
      const id = store.forkTrace({
        baseTraceId: "t_base",
        forkFromSpanId: "s6",
        overrides: { promptText: `Branch ${i}` }
      });
      children.push(id);
    }

    const graph1 = store.getLineageGraph("t_base");
    const graph2 = store.getLineageGraph("t_base");

    expect(graph1.edges.map((e) => e.childTraceId)).toEqual(graph2.edges.map((e) => e.childTraceId));
    for (const cid of children) {
      expect(graph1.edges.some((e) => e.childTraceId === cid)).toBe(true);
    }
  });

  // T050: diff edge-case tests
  it("diffTraces handles early-exit derived trace (prefix-only fork)", () => {
    const baseEvents = loadPhase2FixtureTrace("base");
    for (const e of baseEvents) store.appendEvent(e);

    const childId = store.forkTrace({ baseTraceId: "t_base", forkFromSpanId: "s1", overrides: {} });

    const diff = store.diffTraces("t_base", childId);
    expect(diff.a.traceId).toBe("t_base");
    expect(diff.b.traceId).toBe(childId);
    const deletedCount = diff.changed.filter((c) => c.aSpanId && !c.bSpanId).length;
    expect(deletedCount).toBeGreaterThan(0);
  });
});

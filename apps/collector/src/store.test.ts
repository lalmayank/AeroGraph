import { describe, expect, it } from "vitest";
import { TraceStore } from "./store";
import { traceEventSchemaVersion, type TraceEvent } from "@afr/contracts";

function mkEvent(partial: Partial<TraceEvent> & Pick<TraceEvent, "traceId" | "spanId" | "occurredAt">): TraceEvent {
  return {
    schemaVersion: traceEventSchemaVersion,
    traceId: partial.traceId,
    spanId: partial.spanId,
    parentSpanId: partial.parentSpanId ?? null,
    occurredAt: partial.occurredAt,
    actor: partial.actor ?? { kind: "agent", id: "a" },
    kind: partial.kind ?? "note",
    status: partial.status ?? "ok",
    title: partial.title,
    payload: partial.payload ?? {},
    links: partial.links ?? []
  };
}

describe("collector store", () => {
  it("forkTrace preserves referential integrity", () => {
    const store = new TraceStore({ persist: false });

    const traceId = "t_base_1";
    const e1 = mkEvent({ traceId, spanId: "s1", occurredAt: new Date("2026-05-20T00:00:00.000Z").toISOString(), kind: "prompt", payload: { text: "a" } });
    const e2 = mkEvent({ traceId, spanId: "s2", parentSpanId: "s1", occurredAt: new Date("2026-05-20T00:00:01.000Z").toISOString(), kind: "response", payload: { text: "b" } });
    store.appendEvent(e1);
    store.appendEvent(e2);

    const forked = store.forkTrace({ baseTraceId: traceId, forkFromSpanId: "s1", overrides: { promptText: "override" } });

    expect(forked.meta.derivedFrom?.baseTraceId).toBe(traceId);
    expect(forked.events.every((e) => e.traceId === forked.meta.traceId)).toBe(true);

    const prompt = forked.events.find((e) => e.kind === "prompt");
    expect(prompt?.payload).toMatchObject({ text: "override" });

    // parentSpanId should reference an existing spanId within forked trace
    const spanIds = new Set(forked.events.map((e) => e.spanId));
    for (const e of forked.events) {
      if (e.parentSpanId) {
        expect(spanIds.has(e.parentSpanId)).toBe(true);
      }
    }
  });
});

import { describe, expect, it } from "vitest";
import { traceEventSchema, traceEventSchemaVersion, validateTraceEvent, validateTraceWithMeta } from "./index";

describe("contracts: traceEventSchema", () => {
  it("accepts a valid event", () => {
    const event = {
      schemaVersion: traceEventSchemaVersion,
      traceId: "t-1",
      spanId: "s-1",
      parentSpanId: null,
      occurredAt: new Date("2026-05-20T00:00:00.000Z").toISOString(),
      actor: { kind: "agent", id: "agent-a", name: "Planner" },
      kind: "prompt",
      status: "ok",
      title: "Plan",
      payload: { text: "Do the thing" },
      links: []
    } as const;

    const parsed = validateTraceEvent(event);
    expect(parsed.traceId).toBe("t-1");
  });

  it("rejects invalid events", () => {
    expect(() => traceEventSchema.parse({})).toThrow();
  });

  it("rejects mismatched actor kinds", () => {
    const event = {
      schemaVersion: traceEventSchemaVersion,
      traceId: "t-1",
      spanId: "s-1",
      parentSpanId: null,
      occurredAt: new Date().toISOString(),
      actor: { kind: "tool", id: "tool-a" }, // tool actor for prompt is invalid
      kind: "prompt",
      status: "ok",
      payload: { text: "Do the thing" },
      links: []
    } as any;

    expect(() => validateTraceEvent(event)).toThrow();
  });
});

describe("contracts: API shapes", () => {
  it("validates TraceMeta", () => {
    const meta = {
      traceId: "t-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      eventCount: 1,
      rootSpanId: "s-1"
    };
    expect(() => validateTraceWithMeta({ meta, events: [] })).not.toThrow();
  });
});

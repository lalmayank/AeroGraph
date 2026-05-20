import { describe, expect, it } from "vitest";
import { traceEventSchema, traceEventSchemaVersion, validateTraceEvent } from "./index";

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
});

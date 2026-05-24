import { describe, it, expect } from "vitest";
import type { TraceEvent } from "@aerograph/contracts";
import { diffTraceEvents } from "./index";

/**
 * T053: Diff performance check.
 * Diff two traces of 2k events each must complete within 5 seconds.
 */
describe("perf: diff engine", () => {
  it("diffs two traces of 2000 events each within 5s", () => {
    const makeEvents = (traceId: string, count: number): TraceEvent[] => {
      return Array.from({ length: count }, (_, i) => ({
        schemaVersion: "1.0.0" as const,
        traceId,
        spanId: `s${i}`,
        parentSpanId: i > 0 ? `s${i - 1}` : null,
        occurredAt: new Date(Date.now() + i * 100).toISOString(),
        actor: { kind: "agent" as const, id: "agent-a" },
        kind: "prompt" as const,
        status: "ok" as const,
        payload: { text: `event ${i}` },
        links: []
      }));
    };

    const metaA = {
      traceId: "t-a",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      eventCount: 2000,
      rootSpanId: "s0"
    };
    const metaB = {
      traceId: "t-b",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      eventCount: 2000,
      rootSpanId: "s0"
    };

    const eventsA = makeEvents("t-a", 2000);
    // Make trace B diverge at position 1000
    const eventsB = [
      ...makeEvents("t-a", 1000).map((e) => ({ ...e, traceId: "t-b" })),
      ...makeEvents("t-b-suffix", 1000).map((e) => ({ ...e, traceId: "t-b", spanId: `x${e.spanId}` }))
    ];

    const start = Date.now();
    const result = diffTraceEvents(eventsA, eventsB as TraceEvent[], metaA, metaB);
    const elapsed = Date.now() - start;

    expect(Array.isArray(result.changed)).toBe(true);
    expect(elapsed).toBeLessThan(5000); // must complete within 5 seconds
  }, 10000);
});

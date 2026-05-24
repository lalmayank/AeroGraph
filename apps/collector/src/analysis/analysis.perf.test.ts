import { describe, it, expect } from "vitest";
import type { TraceEvent } from "@aerograph/contracts";
import { analyzeTrace } from "./index";

/**
 * T054: Loop analysis performance check.
 * Analyzing a trace of 2k events must complete within 5 seconds.
 */
describe("perf: loop analysis", () => {
  it("analyzes a trace of 2000 events within 5s", () => {
    const events: TraceEvent[] = Array.from({ length: 2000 }, (_, i) => ({
      schemaVersion: "1.0.0" as const,
      traceId: "t-perf",
      spanId: `s${i}`,
      parentSpanId: i > 0 ? `s${i - 1}` : null,
      occurredAt: new Date(Date.now() + i * 100).toISOString(),
      actor: { kind: "agent" as const, id: `agent-${i % 5}` },
      kind: "prompt" as const,
      status: "ok" as const,
      payload: { text: `event ${i}` },
      links: []
    }));

    const start = Date.now();
    const result = analyzeTrace(events);
    const elapsed = Date.now() - start;

    expect(Array.isArray(result.loops)).toBe(true);
    expect(result.stats.eventCount).toBe(2000);
    expect(elapsed).toBeLessThan(5000); // must complete within 5 seconds
  }, 10000);
});

import { describe, expect, it } from "vitest";
import type { TraceAnalysis } from "@aerograph/contracts";
import { mapLoopsToHighlights, getLoopWarningSpanIds, getFirstLoopSpanId } from "./loops";

const EMPTY_ANALYSIS: TraceAnalysis = {
  loops: [],
  failures: [],
  stats: { eventCount: 0, actorCount: 0 }
};

describe("web: loop highlight mapping", () => {
  it("returns empty highlights for no loops", () => {
    const h = mapLoopsToHighlights(EMPTY_ANALYSIS);
    expect(h).toHaveLength(0);
  });

  it("maps loop warning spanIds to highlights", () => {
    const analysis: TraceAnalysis = {
      ...EMPTY_ANALYSIS,
      loops: [
        {
          kind: "repeated_sequence",
          severity: "medium",
          reason: "Repeated window",
          spanIds: ["s1", "s2", "s3", "s4"]
        }
      ]
    };

    const highlights = mapLoopsToHighlights(analysis);
    expect(highlights).toHaveLength(4);
    expect(highlights[0].spanId).toBe("s1");
    expect(highlights[0].kind).toBe("repeated_sequence");
    expect(highlights[0].severity).toBe("medium");
  });

  it("getLoopWarningSpanIds collects all unique span ids", () => {
    const analysis: TraceAnalysis = {
      ...EMPTY_ANALYSIS,
      loops: [
        { kind: "recursive_tool", severity: "high", reason: "Recursive tool", spanIds: ["s1", "s2"] },
        { kind: "handoff_cycle", severity: "medium", reason: "Cycle", spanIds: ["s2", "s3"] }
      ]
    };

    const ids = getLoopWarningSpanIds(analysis);
    expect(ids.has("s1")).toBe(true);
    expect(ids.has("s2")).toBe(true);
    expect(ids.has("s3")).toBe(true);
  });

  it("getFirstLoopSpanId returns null when no loops", () => {
    expect(getFirstLoopSpanId(EMPTY_ANALYSIS)).toBeNull();
  });

  it("getFirstLoopSpanId returns first span of first warning", () => {
    const analysis: TraceAnalysis = {
      ...EMPTY_ANALYSIS,
      loops: [
        { kind: "repeated_sequence", severity: "low", reason: "rep", spanIds: ["s5", "s6"] }
      ]
    };
    expect(getFirstLoopSpanId(analysis)).toBe("s5");
  });

  it("mapLoopsToHighlights is deterministic", () => {
    const analysis: TraceAnalysis = {
      ...EMPTY_ANALYSIS,
      loops: [
        { kind: "repeated_sequence", severity: "low", reason: "rep", spanIds: ["s1", "s2", "s3", "s4"] }
      ]
    };

    const r1 = mapLoopsToHighlights(analysis);
    const r2 = mapLoopsToHighlights(analysis);
    expect(r1).toEqual(r2);
  });
});

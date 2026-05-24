import { describe, expect, it } from "vitest";
import type { TraceDiffResult, TraceMeta } from "@aerograph/contracts";
import { mapDiffToHighlights, getDiffChangedSpanIds } from "./diff";

const META_A: TraceMeta = {
  traceId: "t-a",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  eventCount: 3,
  rootSpanId: "s1"
};
const META_B: TraceMeta = {
  ...META_A,
  traceId: "t-b"
};

describe("web: diff mapping", () => {
  it("maps changed spans to highlights for both sides", () => {
    const diff: TraceDiffResult = {
      a: META_A,
      b: META_B,
      changed: [
        { index: 2, aSpanId: "s3", reason: "deleted" },
        { index: 3, bSpanId: "s4", reason: "inserted" }
      ]
    };

    const { highlights } = mapDiffToHighlights(diff);
    expect(highlights.some((h) => h.spanId === "s3" && h.side === "a")).toBe(true);
    expect(highlights.some((h) => h.spanId === "s4" && h.side === "b")).toBe(true);
  });

  it("returns divergenceSpanId from forkPointSpanId if present", () => {
    const diff: TraceDiffResult = {
      a: META_A,
      b: META_B,
      divergence: { forkPointSpanId: "s2", aIndex: 2, reason: "deleted" },
      changed: [{ index: 2, aSpanId: "s3", reason: "deleted" }]
    };

    const { divergenceSpanId } = mapDiffToHighlights(diff);
    expect(divergenceSpanId).toBe("s2");
  });

  it("returns null divergenceSpanId when no changes", () => {
    const diff: TraceDiffResult = {
      a: META_A,
      b: META_B,
      changed: []
    };

    const { divergenceSpanId } = mapDiffToHighlights(diff);
    expect(divergenceSpanId).toBeNull();
  });

  it("getDiffChangedSpanIds returns all changed spanIds", () => {
    const diff: TraceDiffResult = {
      a: META_A,
      b: META_B,
      changed: [
        { index: 0, aSpanId: "s1", reason: "deleted" },
        { index: 1, bSpanId: "s2", reason: "inserted" }
      ]
    };

    const ids = getDiffChangedSpanIds(diff);
    expect(ids.has("s1")).toBe(true);
    expect(ids.has("s2")).toBe(true);
  });

  it("mapDiffToHighlights is deterministic for same input", () => {
    const diff: TraceDiffResult = {
      a: META_A,
      b: META_B,
      changed: [
        { index: 0, aSpanId: "s1", reason: "deleted" },
        { index: 1, bSpanId: "s2", reason: "inserted" }
      ]
    };

    const r1 = mapDiffToHighlights(diff);
    const r2 = mapDiffToHighlights(diff);
    expect(r1).toEqual(r2);
  });
});

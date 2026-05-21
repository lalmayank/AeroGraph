import { describe, expect, it } from "vitest";
import { myersDiff } from "./myers";

describe("diff: myersDiff", () => {
  it("returns empty for identical sequences", () => {
    const ops = myersDiff(["a", "b", "c"], ["a", "b", "c"]);
    expect(ops.every((o) => o.op === "equal")).toBe(true);
  });

  it("returns all inserts for empty a", () => {
    const ops = myersDiff([], ["x", "y"]);
    expect(ops).toHaveLength(2);
    expect(ops[0]).toMatchObject({ op: "insert", bIndex: 0 });
    expect(ops[1]).toMatchObject({ op: "insert", bIndex: 1 });
  });

  it("returns all deletes for empty b", () => {
    const ops = myersDiff(["x", "y"], []);
    expect(ops).toHaveLength(2);
    expect(ops[0]).toMatchObject({ op: "delete", aIndex: 0 });
    expect(ops[1]).toMatchObject({ op: "delete", aIndex: 1 });
  });

  it("detects a single substitution", () => {
    const ops = myersDiff(["a", "b", "c"], ["a", "X", "c"]);
    const nonEqual = ops.filter((o) => o.op !== "equal");
    expect(nonEqual.length).toBeGreaterThan(0);
  });

  it("is deterministic for same inputs", () => {
    const a = ["x", "y", "a", "b", "c"];
    const b = ["x", "a", "b", "c", "z"];
    const r1 = myersDiff(a, b);
    const r2 = myersDiff(a, b);
    expect(r1).toEqual(r2);
  });

  it("correctly handles prefix match only", () => {
    const a = ["a", "b", "c"];
    const b = ["a", "b", "d", "e"];
    const ops = myersDiff(a, b);
    // 'a' and 'b' are equal, 'c' deleted, 'd' and 'e' inserted
    const equals = ops.filter((o) => o.op === "equal");
    expect(equals.length).toBeGreaterThanOrEqual(1);
    const deletes = ops.filter((o) => o.op === "delete");
    expect(deletes.length).toBeGreaterThanOrEqual(1);
    const inserts = ops.filter((o) => o.op === "insert");
    expect(inserts.length).toBeGreaterThanOrEqual(1);
  });
});

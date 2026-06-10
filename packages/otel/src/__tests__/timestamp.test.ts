/**
 * packages/otel/src/__tests__/timestamp.test.ts
 *
 * Unit tests for isoToUnixNano and unixNanoToIso.
 *
 * Assertions mirror test_timestamp.py in Python exactly.
 * Both suites must pass with identical values for identical inputs.
 */

import { describe, it, expect } from "vitest";
import { isoToUnixNano, unixNanoToIso } from "../timestamp.js";

describe("isoToUnixNano", () => {
  it("converts a known timestamp correctly", () => {
    // 2026-06-09T18:00:00.000Z
    // Days from epoch to 2026-06-09:
    //   56 years × 365 + 14 leap days = 20454 days to 2026-01-01
    //   Jan(31) + Feb(28) + Mar(31) + Apr(30) + May(31) = 151 days to Jun 1
    //   + 8 days = Jun 9 midnight → 20613 total days
    //   + 18 hours = 20613 * 86400 + 64800 = 1781028000 seconds
    //   × 1,000 ms = 1781028000000 ms × 1,000,000 = 1781028000000000000 ns
    expect(isoToUnixNano("2026-06-09T18:00:00.000Z")).toBe("1781028000000000000");
  });

  it("handles milliseconds correctly", () => {
    // 1 second later + 500ms
    expect(isoToUnixNano("2026-06-09T18:00:01.500Z")).toBe("1781028001500000000");
  });

  it("handles Unix epoch (zero)", () => {
    expect(isoToUnixNano("1970-01-01T00:00:00.000Z")).toBe("0");
  });

  it("handles midnight correctly", () => {
    expect(isoToUnixNano("2026-06-09T00:00:00.000Z")).toBe("1780963200000000000");
  });

  it("throws on invalid ISO string", () => {
    expect(() => isoToUnixNano("not-a-date")).toThrow();
  });

  it("fixture timestamp: prompt event", () => {
    // This is the canonical timestamp from prompt_event.json
    // Used by parity tests to verify TS matches Python
    const result = isoToUnixNano("2026-06-09T18:00:00.000Z");
    expect(result).toBe("1781028000000000000");
  });
});

describe("unixNanoToIso", () => {
  it("round-trips a known timestamp", () => {
    const nano = "1781028000000000000";
    expect(unixNanoToIso(nano)).toBe("2026-06-09T18:00:00.000Z");
  });

  it("round-trips milliseconds correctly", () => {
    const nano = "1781028001500000000";
    expect(unixNanoToIso(nano)).toBe("2026-06-09T18:00:01.500Z");
  });

  it("round-trips Unix epoch", () => {
    expect(unixNanoToIso("0")).toBe("1970-01-01T00:00:00.000Z");
  });

  it("round-trips midnight", () => {
    expect(unixNanoToIso("1780963200000000000")).toBe("2026-06-09T00:00:00.000Z");
  });

  it("produces ISO format matching Date.toISOString() format", () => {
    const result = unixNanoToIso("1781028000000000000");
    // Must end with Z and have milliseconds
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});

describe("isoToUnixNano / unixNanoToIso round-trip", () => {
  const testCases = [
    "2026-06-09T18:00:00.000Z",
    "2026-06-09T18:00:01.000Z",
    "2026-06-09T18:00:00.123Z",
    "1970-01-01T00:00:00.000Z",
    "2026-06-09T00:00:00.000Z",
  ];

  for (const iso of testCases) {
    it(`round-trips ${iso}`, () => {
      const nano = isoToUnixNano(iso);
      const result = unixNanoToIso(nano);
      expect(result).toBe(iso);
    });
  }
});

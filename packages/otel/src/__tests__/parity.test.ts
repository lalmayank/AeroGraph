/**
 * packages/otel/src/__tests__/parity.test.ts
 *
 * Parity tests: load fixtures from specs/004-otel-bridge/fixtures/,
 * run exportEventToOtlpSpan, assert output matches expected_otlp/*.json exactly.
 *
 * This is the most critical quality gate: enforces that TS and Python
 * produce IDENTICAL OTLP structures for the same canonical inputs.
 *
 * The Python counterpart (test_parity.py) loads the same fixtures and asserts
 * the same expected_otlp/*.json files.
 */

import { describe, it, expect } from "vitest";
import { validateTraceEvent } from "@aerograph/contracts";
import { exportEventToOtlpSpan } from "../export.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
// packages/otel/src/__tests__/ → 4 levels up = monorepo root
const FIXTURE_DIR = join(__dir, "../../../../specs/004-otel-bridge/fixtures");
const EXPECTED_DIR = join(FIXTURE_DIR, "expected_otlp");

function loadEvent(name: string) {
  return validateTraceEvent(
    JSON.parse(readFileSync(join(FIXTURE_DIR, name), "utf-8"))
  );
}

function loadExpected(name: string) {
  return JSON.parse(readFileSync(join(EXPECTED_DIR, name), "utf-8"));
}

/**
 * Normalise an OtlpSpan for comparison.
 * Removes undefined fields and sorts attribute arrays by key for deterministic comparison.
 */
function normalizeSpan(span: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = { ...span };

  // Remove undefined parentSpanId
  if (normalized.parentSpanId === undefined) {
    delete normalized.parentSpanId;
  }

  // Sort attributes by key for deterministic comparison
  if (Array.isArray(normalized.attributes)) {
    normalized.attributes = [...(normalized.attributes as Array<{ key: string }>)]
      .sort((a, b) => a.key.localeCompare(b.key));
  }

  // Sort links by spanId
  if (Array.isArray(normalized.links) && normalized.links.length === 0) {
    delete normalized.links;
  } else if (Array.isArray(normalized.links)) {
    normalized.links = [...(normalized.links as Array<{ spanId: string }>)]
      .sort((a, b) => a.spanId.localeCompare(b.spanId));
  }

  return normalized;
}

const FIXTURE_PAIRS: [string, string][] = [
  ["prompt_event.json",         "prompt_span.json"],
  ["response_event.json",       "response_span.json"],
  ["tool_call_event.json",      "tool_call_span.json"],
  ["tool_result_event.json",    "tool_result_span.json"],
  ["handoff_event.json",        "handoff_span.json"],
  ["error_event.json",          "error_span.json"],
  ["note_event.json",           "note_span.json"],
  ["retriever_event.json",      "retriever_span.json"],
  ["checkpoint_event.json",     "checkpoint_span.json"],
  ["state_snapshot_event.json", "state_snapshot_span.json"],
];

describe("parity: exportEventToOtlpSpan matches golden fixtures", () => {
  for (const [eventFile, expectedFile] of FIXTURE_PAIRS) {
    it(`${eventFile} → ${expectedFile}`, () => {
      const event = loadEvent(eventFile);
      const actual = exportEventToOtlpSpan(event);
      const expected = loadExpected(expectedFile);

      const normalizedActual = normalizeSpan(actual as unknown as Record<string, unknown>);
      const normalizedExpected = normalizeSpan(expected);

      // Compare field by field for clear error messages
      expect(normalizedActual.traceId).toBe(normalizedExpected.traceId);
      expect(normalizedActual.spanId).toBe(normalizedExpected.spanId);
      expect(normalizedActual.name).toBe(normalizedExpected.name);
      expect(normalizedActual.kind).toBe(normalizedExpected.kind);
      expect(normalizedActual.startTimeUnixNano).toBe(normalizedExpected.startTimeUnixNano);
      expect(normalizedActual.endTimeUnixNano).toBe(normalizedExpected.endTimeUnixNano);

      // Status comparison
      expect(normalizedActual.status).toMatchObject(normalizedExpected.status);

      // Attribute-by-attribute comparison (sorted)
      expect(normalizedActual.attributes).toEqual(normalizedExpected.attributes);

      // Link comparison
      if (normalizedExpected.links) {
        expect(normalizedActual.links).toEqual(normalizedExpected.links);
      }

      // parentSpanId
      if (normalizedExpected.parentSpanId) {
        expect(normalizedActual.parentSpanId).toBe(normalizedExpected.parentSpanId);
      } else {
        expect(normalizedActual.parentSpanId).toBeUndefined();
      }
    });
  }
});

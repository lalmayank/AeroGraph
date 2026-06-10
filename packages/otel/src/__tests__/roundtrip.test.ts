import { describe, it, expect } from "vitest";
import { exportEventToOtlpSpan } from "../export.js";
import { importOtlpSpanToEvent } from "../import.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import type { TraceEvent } from "@aerograph/contracts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.join(__dirname, "../../../../specs/004-otel-bridge/fixtures");
const eventKinds = [
  "prompt", "response", "tool_call", "tool_result", "handoff",
  "error", "note", "retriever", "checkpoint", "state_snapshot"
];

describe("Roundtrip TS: TraceEvent -> OtlpSpan -> TraceEvent", () => {
  const ctx = { traceId: "", defaultActorId: "unknown", preserveOriginalIds: false };

  for (const kind of eventKinds) {
    it(`preserves topology fields for ${kind} event`, () => {
      const fixturePath = path.join(fixturesDir, `${kind}_event.json`);
      const originalEvent = JSON.parse(fs.readFileSync(fixturePath, "utf-8")) as TraceEvent;

      const otlpSpan = exportEventToOtlpSpan(originalEvent);
      const importedEvent = importOtlpSpanToEvent(otlpSpan, ctx);

      expect(importedEvent.traceId).toBe(originalEvent.traceId);
      expect(importedEvent.spanId).toBe(originalEvent.spanId);
      expect(importedEvent.parentSpanId).toBe(originalEvent.parentSpanId);
      expect(importedEvent.kind).toBe(originalEvent.kind);
      expect(importedEvent.actor.id).toBe(originalEvent.actor.id);
      expect(importedEvent.actor.kind).toBe(originalEvent.actor.kind);
      expect(importedEvent.status).toBe(originalEvent.status);
      expect(importedEvent.occurredAt).toBe(originalEvent.occurredAt);
      expect(importedEvent.links).toEqual(originalEvent.links || []);
    });
  }
});

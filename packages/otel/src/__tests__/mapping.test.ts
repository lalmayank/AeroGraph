/**
 * packages/otel/src/__tests__/mapping.test.ts
 *
 * Unit tests for getSpanNameForKind, getSpanKindInt, buildAttributesFromEvent.
 * Mirrors test_mapping.py in Python.
 */

import { describe, it, expect } from "vitest";
import { validateTraceEvent } from "@aerograph/contracts";
import {
  getSpanNameForKind,
  getSpanKindInt,
  buildAttributesFromEvent,
  exportLinksToOtlp,
  SPAN_KIND,
} from "../mapping.js";
import type { TraceEventKind } from "@aerograph/contracts";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
// packages/otel/src/__tests__/ → ../../../../ = monorepo root
const FIXTURE_DIR = join(__dir, "../../../../specs/004-otel-bridge/fixtures");

function loadFixture(name: string) {
  return JSON.parse(readFileSync(join(FIXTURE_DIR, name), "utf-8"));
}

describe("getSpanNameForKind", () => {
  const cases: [TraceEventKind, string][] = [
    ["prompt",         "gen_ai.chat"],
    ["response",       "gen_ai.response"],
    ["tool_call",      "gen_ai.tool.call"],
    ["tool_result",    "gen_ai.tool.result"],
    ["handoff",        "gen_ai.agent.handoff"],
    ["error",          "aerograph.error"],
    ["note",           "aerograph.note"],
    ["retriever",      "gen_ai.retrieve"],
    ["checkpoint",     "aerograph.checkpoint"],
    ["state_snapshot", "aerograph.state_snapshot"],
  ];

  for (const [kind, expected] of cases) {
    it(`maps ${kind} → ${expected}`, () => {
      expect(getSpanNameForKind(kind)).toBe(expected);
    });
  }
});

describe("getSpanKindInt", () => {
  it("prompt → CLIENT (3)", () => expect(getSpanKindInt("prompt")).toBe(SPAN_KIND.CLIENT));
  it("response → CLIENT (3)", () => expect(getSpanKindInt("response")).toBe(SPAN_KIND.CLIENT));
  it("tool_call → CLIENT (3)", () => expect(getSpanKindInt("tool_call")).toBe(SPAN_KIND.CLIENT));
  it("retriever → CLIENT (3)", () => expect(getSpanKindInt("retriever")).toBe(SPAN_KIND.CLIENT));
  it("tool_result → INTERNAL (1)", () => expect(getSpanKindInt("tool_result")).toBe(SPAN_KIND.INTERNAL));
  it("handoff → INTERNAL (1)", () => expect(getSpanKindInt("handoff")).toBe(SPAN_KIND.INTERNAL));
  it("error → INTERNAL (1)", () => expect(getSpanKindInt("error")).toBe(SPAN_KIND.INTERNAL));
  it("note → INTERNAL (1)", () => expect(getSpanKindInt("note")).toBe(SPAN_KIND.INTERNAL));
  it("checkpoint → INTERNAL (1)", () => expect(getSpanKindInt("checkpoint")).toBe(SPAN_KIND.INTERNAL));
  it("state_snapshot → INTERNAL (1)", () => expect(getSpanKindInt("state_snapshot")).toBe(SPAN_KIND.INTERNAL));
});

describe("buildAttributesFromEvent", () => {
  it("prompt: includes universal + prompt-specific attributes", () => {
    const event = validateTraceEvent(loadFixture("prompt_event.json"));
    const attrs = buildAttributesFromEvent(event);

    const findAttr = (key: string) => attrs.find((a) => a.key === key);

    expect(findAttr("aerograph.kind")?.value).toEqual({ stringValue: "prompt" });
    expect(findAttr("aerograph.actor.id")?.value).toEqual({ stringValue: "agent-001" });
    expect(findAttr("aerograph.actor.kind")?.value).toEqual({ stringValue: "agent" });
    expect(findAttr("aerograph.actor.name")?.value).toEqual({ stringValue: "PrimaryAgent" });
    expect(findAttr("aerograph.status")?.value).toEqual({ stringValue: "ok" });
    expect(findAttr("aerograph.prompt.text")?.value).toEqual({ stringValue: "What is the capital of France?" });
    expect(findAttr("gen_ai.operation.name")?.value).toEqual({ stringValue: "chat" });
  });

  it("response: includes streaming telemetry attributes", () => {
    const event = validateTraceEvent(loadFixture("response_event.json"));
    const attrs = buildAttributesFromEvent(event);
    const findAttr = (key: string) => attrs.find((a) => a.key === key);

    expect(findAttr("aerograph.kind")?.value).toEqual({ stringValue: "response" });
    expect(findAttr("aerograph.response.text")?.value).toEqual({ stringValue: "The capital of France is Paris." });
    expect(findAttr("aerograph.response.time_to_first_token_ms")?.value).toEqual({ doubleValue: 120.5 });
    expect(findAttr("aerograph.response.token_count")?.value).toEqual({ intValue: 10 });
  });

  it("tool_call: includes tool input as JSON string", () => {
    const event = validateTraceEvent(loadFixture("tool_call_event.json"));
    const attrs = buildAttributesFromEvent(event);
    const findAttr = (key: string) => attrs.find((a) => a.key === key);

    expect(findAttr("aerograph.tool_call.input")?.value).toEqual({
      stringValue: '{"query":"Paris France capital"}'
    });
    expect(findAttr("gen_ai.tool.name")?.value).toEqual({ stringValue: "web-search" });
  });

  it("error: includes message, details, and error.type", () => {
    const event = validateTraceEvent(loadFixture("error_event.json"));
    const attrs = buildAttributesFromEvent(event);
    const findAttr = (key: string) => attrs.find((a) => a.key === key);

    expect(findAttr("aerograph.error.message")?.value).toEqual({
      stringValue: "Network timeout while calling external API"
    });
    expect(findAttr("error.type")?.value).toEqual({ stringValue: "aerograph.error" });
  });

  it("retriever: includes query and document count", () => {
    const event = validateTraceEvent(loadFixture("retriever_event.json"));
    const attrs = buildAttributesFromEvent(event);
    const findAttr = (key: string) => attrs.find((a) => a.key === key);

    expect(findAttr("aerograph.retriever.query")?.value).toEqual({ stringValue: "capital of France" });
    expect(findAttr("aerograph.retriever.document_count")?.value).toEqual({ intValue: 2 });
  });

  it("state_snapshot: includes node_name and state_hash", () => {
    const event = validateTraceEvent(loadFixture("state_snapshot_event.json"));
    const attrs = buildAttributesFromEvent(event);
    const findAttr = (key: string) => attrs.find((a) => a.key === key);

    expect(findAttr("aerograph.state_snapshot.node_name")?.value).toEqual({ stringValue: "respond" });
    expect(findAttr("aerograph.state_snapshot.state_hash")?.value).toEqual({
      stringValue: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6"
    });
  });
});

describe("exportLinksToOtlp", () => {
  it("converts a follows link", () => {
    const links = [{ rel: "follows" as const, spanId: "eee19b7ec3c1b174" }];
    const result = exportLinksToOtlp(links, "5b8efff798038103d269b633813fc60c");

    expect(result).toHaveLength(1);
    expect(result[0].traceId).toBe("5b8efff798038103d269b633813fc60c");
    expect(result[0].spanId).toBe("eee19b7ec3c1b174");
    expect(result[0].attributes).toContainEqual({
      key: "aerograph.link.rel",
      value: { stringValue: "follows" }
    });
  });

  it("returns empty array for no links", () => {
    expect(exportLinksToOtlp([], "5b8efff798038103d269b633813fc60c")).toEqual([]);
  });
});

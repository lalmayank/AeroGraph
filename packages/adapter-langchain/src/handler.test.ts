import { describe, expect, it } from "vitest";
import { createLangChainHandler } from "./handler";
import { FlightRecorder } from "@afr/sdk";
import { validateTraceEvent, type TraceEvent } from "@afr/contracts";

function createRecorderCapture(): { recorder: FlightRecorder; events: TraceEvent[] } {
  const events: TraceEvent[] = [];
  const fetchFn = (async (_url: any, init?: any) => {
    const body = JSON.parse(String(init?.body ?? "null"));
    events.push(validateTraceEvent(body));
    return { ok: true, status: 200, text: async () => "" };
  }) as unknown as typeof fetch;

  const recorder = new FlightRecorder({
    endpoint: "http://localhost:4317",
    actor: { id: "adapter-test", name: "adapter" },
    fetchFn,
    traceId: "t_test"
  });

  return { recorder, events };
}

describe("adapter-langchain: handler", () => {
  // T1001: prompt newline formatting
  it("maps llmStart to prompt with proper newlines (not escaped \\n)", async () => {
    const { recorder, events } = createRecorderCapture();
    const handler = createLangChainHandler({ recorder });

    await handler.handleLLMStart({ name: "ChatOpenAI" } as any, ["Hello", "World"], "run-1", "parent-1");

    expect(events.length).toBe(1);
    expect(events[0].kind).toBe("prompt");
    expect(events[0].parentSpanId).toBe("parent-1");
    // Must be a real newline, not the two-character sequence backslash+n
    expect((events[0] as any).payload.text).toBe("Hello\nWorld");
    expect((events[0] as any).payload.text).not.toContain("\\n");
  });

  // T1002: clean text extraction from generations
  it("extracts clean text from llmEnd generations (not raw JSON)", async () => {
    const { recorder, events } = createRecorderCapture();
    const handler = createLangChainHandler({ recorder });

    const output = {
      generations: [
        [{ text: "This is a simulated response!" }]
      ],
      llmOutput: {}
    };

    await handler.handleLLMEnd(output as any, "run-1");

    expect(events.length).toBe(1);
    expect(events[0].kind).toBe("response");
    // Must be plain text, not a JSON array string
    expect((events[0] as any).payload.text).toBe("This is a simulated response!");
    expect((events[0] as any).payload.text).not.toContain("[{");
    expect((events[0] as any).payload.text).not.toContain("lc\":");
  });

  // T1002: multi-generation text extraction
  it("joins multiple generation texts with newlines", async () => {
    const { recorder, events } = createRecorderCapture();
    const handler = createLangChainHandler({ recorder });

    const output = {
      generations: [
        [{ text: "First response" }, { text: "Second response" }]
      ],
      llmOutput: {}
    };

    await handler.handleLLMEnd(output as any, "run-1");

    expect((events[0] as any).payload.text).toBe("First response\nSecond response");
  });

  // T1003: handleChainStart
  it("maps chainStart to a note event with parentSpanId", async () => {
    const { recorder, events } = createRecorderCapture();
    const handler = createLangChainHandler({ recorder });

    await handler.handleChainStart({ name: "RouterChain" } as any, { input: "hello" }, "chain-1", "parent-1");

    expect(events.length).toBe(1);
    expect(events[0].kind).toBe("note");
    expect(events[0].parentSpanId).toBe("parent-1");
    expect((events[0] as any).payload).toMatchObject({ event: "chain_start", chainName: "RouterChain" });
  });

  // T1003: handleChainEnd
  it("maps chainEnd to a note event", async () => {
    const { recorder, events } = createRecorderCapture();
    const handler = createLangChainHandler({ recorder });

    await handler.handleChainEnd({ output: "result" } as any, "chain-1");

    expect(events.length).toBe(1);
    expect(events[0].kind).toBe("note");
  });

  // T1003: handleChainError
  it("maps chainError to an error event", async () => {
    const { recorder, events } = createRecorderCapture();
    const handler = createLangChainHandler({ recorder });

    await handler.handleChainError(new Error("Chain failed"), "chain-1");

    expect(events.length).toBe(1);
    expect(events[0].kind).toBe("error");
    expect((events[0] as any).payload.message).toBe("Chain failed");
  });

  // existing tests kept
  it("maps llmError to error deterministically", async () => {
    const { recorder, events } = createRecorderCapture();
    const handler = createLangChainHandler({ recorder });

    await handler.handleLLMError(new Error("Timeout"), "run-1");

    expect(events.length).toBe(1);
    expect(events[0].kind).toBe("error");
    expect((events[0] as any).payload.message).toBe("Timeout");
  });

  it("maps toolStart to toolCall deterministically", async () => {
    const { recorder, events } = createRecorderCapture();
    const handler = createLangChainHandler({ recorder });

    await handler.handleToolStart({ name: "calculator" } as any, '{"x": 1}', "run-2", "run-1");

    expect(events.length).toBe(1);
    expect(events[0].kind).toBe("tool_call");
    expect(events[0].actor.kind).toBe("tool");
    expect(events[0].actor.id).toBe("calculator");
  });

  it("maps toolEnd to toolResult deterministically", async () => {
    const { recorder, events } = createRecorderCapture();
    const handler = createLangChainHandler({ recorder });

    // Start sets tool identity for the runId.
    await handler.handleToolStart({ name: "calculator" } as any, '{"x": 1}', "run-2", "run-1");
    await handler.handleToolEnd("Result: 2", "run-2");

    const toolCall = events.find((e) => e.kind === "tool_call");
    const toolResult = events.find((e) => e.kind === "tool_result");
    expect(toolCall).toBeTruthy();
    expect(toolResult).toBeTruthy();
    expect(toolCall?.actor.id).toBe("calculator");
    expect(toolResult?.actor.id).toBe("calculator");
  });
});

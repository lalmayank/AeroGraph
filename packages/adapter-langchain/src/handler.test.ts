import { describe, expect, it } from "vitest";
import { createLangChainHandler } from "./handler";
import { FlightRecorder } from "@afr/sdk";

function createMockRecorder(): { recorder: FlightRecorder; events: any[] } {
  const events: any[] = [];
  const recorder = {
    prompt: async (args: any) => { events.push({ kind: "prompt", ...args }); },
    response: async (args: any) => { events.push({ kind: "response", ...args }); },
    toolCall: async (args: any) => { events.push({ kind: "tool_call", ...args }); },
    toolResult: async (args: any) => { events.push({ kind: "tool_result", ...args }); },
    error: async (args: any) => { events.push({ kind: "error", ...args }); },
    note: async (args: any) => { events.push({ kind: "note", ...args }); },
  } as unknown as FlightRecorder;
  return { recorder, events };
}

describe("adapter-langchain: handler", () => {
  // T1001: prompt newline formatting
  it("maps llmStart to prompt with proper newlines (not escaped \\n)", async () => {
    const { recorder, events } = createMockRecorder();
    const handler = createLangChainHandler({ recorder });

    await handler.handleLLMStart({ name: "ChatOpenAI" } as any, ["Hello", "World"], "run-1", "parent-1");

    expect(events.length).toBe(1);
    expect(events[0].kind).toBe("prompt");
    expect(events[0].parentSpanId).toBe("parent-1");
    // Must be a real newline, not the two-character sequence backslash+n
    expect(events[0].text).toBe("Hello\nWorld");
    expect(events[0].text).not.toContain("\\n");
  });

  // T1002: clean text extraction from generations
  it("extracts clean text from llmEnd generations (not raw JSON)", async () => {
    const { recorder, events } = createMockRecorder();
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
    expect(events[0].text).toBe("This is a simulated response!");
    expect(events[0].text).not.toContain("[{");
    expect(events[0].text).not.toContain("lc\":");
  });

  // T1002: multi-generation text extraction
  it("joins multiple generation texts with newlines", async () => {
    const { recorder, events } = createMockRecorder();
    const handler = createLangChainHandler({ recorder });

    const output = {
      generations: [
        [{ text: "First response" }, { text: "Second response" }]
      ],
      llmOutput: {}
    };

    await handler.handleLLMEnd(output as any, "run-1");

    expect(events[0].text).toBe("First response\nSecond response");
  });

  // T1003: handleChainStart
  it("maps chainStart to a note event with parentSpanId", async () => {
    const { recorder, events } = createMockRecorder();
    const handler = createLangChainHandler({ recorder });

    await handler.handleChainStart({ name: "RouterChain" } as any, { input: "hello" }, "chain-1", "parent-1");

    expect(events.length).toBe(1);
    expect(events[0].kind).toBe("note");
    expect(events[0].parentSpanId).toBe("parent-1");
    expect(events[0].chainName).toBe("RouterChain");
  });

  // T1003: handleChainEnd
  it("maps chainEnd to a note event", async () => {
    const { recorder, events } = createMockRecorder();
    const handler = createLangChainHandler({ recorder });

    await handler.handleChainEnd({ output: "result" } as any, "chain-1");

    expect(events.length).toBe(1);
    expect(events[0].kind).toBe("note");
  });

  // T1003: handleChainError
  it("maps chainError to an error event", async () => {
    const { recorder, events } = createMockRecorder();
    const handler = createLangChainHandler({ recorder });

    await handler.handleChainError(new Error("Chain failed"), "chain-1");

    expect(events.length).toBe(1);
    expect(events[0].kind).toBe("error");
    expect(events[0].message).toBe("Chain failed");
  });

  // existing tests kept
  it("maps llmError to error deterministically", async () => {
    const { recorder, events } = createMockRecorder();
    const handler = createLangChainHandler({ recorder });

    await handler.handleLLMError(new Error("Timeout"), "run-1");

    expect(events.length).toBe(1);
    expect(events[0].kind).toBe("error");
    expect(events[0].message).toBe("Timeout");
  });

  it("maps toolStart to toolCall deterministically", async () => {
    const { recorder, events } = createMockRecorder();
    const handler = createLangChainHandler({ recorder });

    await handler.handleToolStart({ name: "calculator" } as any, '{"x": 1}', "run-2", "run-1");

    expect(events.length).toBe(1);
    expect(events[0].kind).toBe("tool_call");
    expect(events[0].toolId).toBe("calculator");
  });

  it("maps toolEnd to toolResult deterministically", async () => {
    const { recorder, events } = createMockRecorder();
    const handler = createLangChainHandler({ recorder });

    await handler.handleToolEnd("Result: 2", "run-2");

    expect(events.length).toBe(1);
    expect(events[0].kind).toBe("tool_result");
  });
});

import { describe, it, expect, vi } from "vitest";
import { StreamingCallbackHandler } from "./streaming";

describe("StreamingCallbackHandler", () => {
  it("should track TTFT and token count", async () => {
    const recorder = {
      response: vi.fn(),
    } as any;
    
    const handler = new StreamingCallbackHandler(recorder);
    const runId = "run-1";
    
    await handler.handleLLMStart({}, ["prompt"], runId);
    
    // Simulate some delay
    await new Promise((r) => setTimeout(r, 10));
    
    await handler.handleLLMNewToken("hello", undefined, runId);
    await handler.handleLLMNewToken(" world", undefined, runId);
    
    await handler.handleLLMEnd({ generations: [[{ text: "hello world" }]] }, runId);
    
    expect(recorder.response).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "hello world",
        payload: {
          streamingTelemetry: expect.objectContaining({
            timeToFirstTokenMs: expect.any(Number),
            totalDurationMs: expect.any(Number),
            tokensPerSecond: expect.any(Number),
            tokenCount: 2
          })
        }
      })
    );
  });
});

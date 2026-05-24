import { describe, it, expect, vi } from "vitest";
import { LangGraphCallbackHandler } from "./langgraph";
import { getDeterministicStateHash } from "@aerograph/contracts";

describe("LangGraphCallbackHandler", () => {
  it("should capture initial state on graph start", async () => {
    const recorder = {
      stateSnapshot: vi.fn(),
      checkpoint: vi.fn(),
    } as any;
    
    const handler = new LangGraphCallbackHandler(recorder);
    const inputs = { foo: "bar" };
    
    await handler.handleChainStart({ id: ["langgraph", "Graph"] }, inputs, "run-1");
    
    expect(recorder.stateSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        nodeName: "Graph__start",
        stateHash: getDeterministicStateHash(inputs),
        stateDiff: inputs,
        fullState: inputs
      })
    );
  });

  it("should capture state updates on chain end", async () => {
    const recorder = {
      stateSnapshot: vi.fn(),
      checkpoint: vi.fn(),
    } as any;
    
    const handler = new LangGraphCallbackHandler(recorder);
    const inputs = { count: 0 };
    await handler.handleChainStart({ id: ["langgraph", "Graph"] }, inputs, "run-1");
    
    // reset mock to ignore the initial state snapshot
    recorder.stateSnapshot.mockClear();
    
    const outputs = { count: 1 };
    await handler.handleChainEnd(outputs, "run-1");
    
    expect(recorder.stateSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        nodeName: "node_update",
        stateDiff: { count: 1 },
        removedKeys: [],
        fullState: { count: 1 }
      })
    );
  });

  it("should track state independently per runId", async () => {
    const recorder = { stateSnapshot: vi.fn(), checkpoint: vi.fn() } as any;
    const handler = new LangGraphCallbackHandler(recorder);
    
    await handler.handleChainStart({ id: ["langgraph", "Graph"] }, { val: "A" }, "run-A");
    await handler.handleChainStart({ id: ["langgraph", "Graph"] }, { val: "B" }, "run-B");
    
    await handler.handleChainEnd({ val: "A2" }, "run-A");
    await handler.handleChainEnd({ val: "B2" }, "run-B");
    
    expect(recorder.stateSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ parentSpanId: "run-A", stateDiff: { val: "A2" }, removedKeys: [] })
    );
    expect(recorder.stateSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ parentSpanId: "run-B", stateDiff: { val: "B2" }, removedKeys: [] })
    );
  });

  it("should capture checkpoint on custom interrupt event", async () => {
    const recorder = { stateSnapshot: vi.fn(), checkpoint: vi.fn() } as any;
    const handler = new LangGraphCallbackHandler(recorder);
    
    await handler.handleChainStart({ id: ["langgraph", "Graph"] }, { count: 5 }, "run-1");
    await handler.handleCustomEvent("langgraph.interrupt", { reason: "Need approval", id: "chk-1" }, "run-1");
    
    expect(recorder.checkpoint).toHaveBeenCalledWith(
      expect.objectContaining({
        checkpointId: "chk-1",
        reason: "Need approval",
        state: { count: 5 }
      })
    );
  });
});

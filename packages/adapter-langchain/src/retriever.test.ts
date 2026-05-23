import { describe, it, expect, vi } from "vitest";
import { RetrieverCallbackHandler } from "./retriever";

describe("RetrieverCallbackHandler", () => {
  it("should capture retriever events", async () => {
    const recorder = {
      toolCall: vi.fn(),
      retriever: vi.fn(),
    } as any;
    
    const handler = new RetrieverCallbackHandler(recorder);
    const runId = "run-1";
    const query = "what is the capital of france?";
    
    await handler.handleRetrieverStart({ name: "VectorStore" }, query, runId, "parent-1");
    
    expect(recorder.toolCall).toHaveBeenCalledWith(
      expect.objectContaining({
        spanId: runId,
        parentSpanId: "parent-1",
        toolName: "VectorStore",
        input: { query }
      })
    );
    
    const documents = [
      { pageContent: "Paris is the capital of France.", metadata: { score: 0.95 } },
      { pageContent: "London is the capital of UK.", metadata: { score: 0.2 } }
    ];
    
    await handler.handleRetrieverEnd(documents, runId);
    
    expect(recorder.retriever).toHaveBeenCalledWith(
      expect.objectContaining({
        parentSpanId: runId,
        query,
        documents: documents.map(d => ({ ...d, score: d.metadata.score }))
      })
    );
  });
});

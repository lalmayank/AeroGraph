import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import type { FlightRecorder } from "@afr/sdk";

export interface RetrieverHandlerOptions {
  recorder: FlightRecorder;
}

export function createRetrieverHandler(options: RetrieverHandlerOptions) {
  return new RetrieverCallbackHandler(options.recorder);
}

export class RetrieverCallbackHandler extends BaseCallbackHandler {
  name = "RetrieverCallbackHandler";
  
  private queryMap = new Map<string, string>();

  constructor(private recorder: FlightRecorder) {
    super();
  }

  async handleRetrieverStart(
    retriever: any,
    query: string,
    runId: string,
    parentRunId?: string
  ) {
    this.queryMap.set(runId, query);
    
    const toolId = retriever?.id?.[retriever.id.length - 1] || retriever?.name || `retriever_${runId}`;
    await this.recorder.toolCall({
      parentSpanId: parentRunId || null,
      spanId: runId,
      toolId,
      toolName: retriever?.name || "retriever",
      input: { query }
    });
  }

  async handleRetrieverEnd(documents: any[], runId: string) {
    const query = this.queryMap.get(runId) || "";
    
    const formattedDocs = documents.map(doc => ({
      pageContent: doc.pageContent,
      metadata: doc.metadata || {},
      score: doc.metadata?.score // Assuming some retrievers might put score in metadata
    }));

    await this.recorder.retriever({
      parentSpanId: runId,
      toolId: `retriever_${runId}`,
      toolName: "retriever",
      query,
      documents: formattedDocs
    });

    this.queryMap.delete(runId);
  }

  async handleRetrieverError(err: any, runId: string) {
    this.queryMap.delete(runId);
    await this.recorder.error({
      parentSpanId: runId,
      message: err?.message || String(err)
    });
  }
}

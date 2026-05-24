import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import type { FlightRecorder } from "@aerograph/sdk";

export interface StreamingHandlerOptions {
  recorder: FlightRecorder;
}

export function createStreamingHandler(options: StreamingHandlerOptions) {
  return new StreamingCallbackHandler(options.recorder);
}

export class StreamingCallbackHandler extends BaseCallbackHandler {
  name = "StreamingCallbackHandler";
  
  private startTimeMap = new Map<string, number>();
  private ttftMap = new Map<string, number>();
  private tokenCountMap = new Map<string, number>();

  constructor(private recorder: FlightRecorder) {
    super();
  }

  async handleLLMStart(
    _llm: any,
    prompts: string[],
    runId: string,
    parentRunId?: string
  ) {
    this.startTimeMap.set(runId, Date.now());
    this.tokenCountMap.set(runId, 0);
  }

  async handleLLMNewToken(token: string, idx: any, runId: string) {
    const count = (this.tokenCountMap.get(runId) || 0) + 1;
    this.tokenCountMap.set(runId, count);

    // Track Time To First Token
    if (count === 1) {
      const startTime = this.startTimeMap.get(runId);
      if (startTime) {
        this.ttftMap.set(runId, Date.now() - startTime);
      }
    }
  }

  async handleLLMEnd(output: any, runId: string) {
    const startTime = this.startTimeMap.get(runId);
    const ttft = this.ttftMap.get(runId);
    const tokenCount = this.tokenCountMap.get(runId) || 0;
    
    if (startTime && ttft !== undefined) {
      const totalDurationMs = Date.now() - startTime;
      const tokensPerSecond = tokenCount > 0 ? (tokenCount / totalDurationMs) * 1000 : 0;
      
      const generations: any[][] = output.generations || [];
      const text = generations
        .flatMap((group) => group.map((item: any) => item.text || item.message?.content || ""))
        .filter(Boolean)
        .join("\n");

      // Emit the final text as a normalized response with streaming telemetry
      await this.recorder.response({
        parentSpanId: runId,
        text,
        payload: {
          streamingTelemetry: {
            timeToFirstTokenMs: ttft,
            totalDurationMs,
            tokensPerSecond,
            tokenCount
          }
        }
      });
    }

    this.startTimeMap.delete(runId);
    this.ttftMap.delete(runId);
    this.tokenCountMap.delete(runId);
  }
}

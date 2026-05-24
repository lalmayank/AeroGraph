import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import type { FlightRecorder } from "@afr/sdk";
import { getDeterministicStateHash, computeStateDiff } from "@afr/contracts";

export interface LangGraphHandlerOptions {
  recorder: FlightRecorder;
}

export function createLangGraphHandler(options: LangGraphHandlerOptions) {
  return new LangGraphCallbackHandler(options.recorder);
}

export class LangGraphCallbackHandler extends BaseCallbackHandler {
  name = "LangGraphCallbackHandler";
  
  private stateMap = new Map<string, Record<string, any>>();

  constructor(private recorder: FlightRecorder) {
    super();
  }

  async handleChainStart(
    chain: any,
    inputs: any,
    runId: string,
    parentRunId?: string
  ) {
    // If it is the main graph execution, we can capture the initial state
    if (chain?.id && chain.id[chain.id.length - 1] === "Graph") {
      const initialState = typeof inputs === "object" ? JSON.parse(JSON.stringify(inputs)) : {};
      this.stateMap.set(runId, initialState);
      
      const stateHash = getDeterministicStateHash(initialState);
      await this.recorder.stateSnapshot({
        parentSpanId: parentRunId || null,
        spanId: runId,
        nodeName: "Graph__start",
        stateHash,
        stateDiff: initialState,
        fullState: initialState
      });
    }
  }

  async handleChainEnd(outputs: any, runId: string) {
    // In LangGraph, the outputs of a node are typically the state updates
    if (outputs && typeof outputs === "object" && !Array.isArray(outputs)) {
      const currentState = this.stateMap.get(runId) || {};
      const { stateDiff, removedKeys } = computeStateDiff(currentState, outputs);
      
      if (Object.keys(stateDiff).length > 0 || removedKeys.length > 0) {
        // Deep clone before emission to protect against mutations
        const nextState = Object.freeze(JSON.parse(JSON.stringify({ ...currentState, ...outputs })));
        this.stateMap.set(runId, nextState);
        
        const stateHash = getDeterministicStateHash(nextState);
        
        await this.recorder.stateSnapshot({
          parentSpanId: runId,
          nodeName: "node_update",
          stateHash,
          stateDiff,
          removedKeys,
          fullState: nextState
        });
      }
    }
  }

  async handleToolEnd(output: any, runId: string) {
    // No-op for now. 
    // We let normal tools emit their tool result via the main handler.
  }

  async handleCustomEvent(
    eventName: string,
    data: any,
    runId: string,
    _tags?: string[],
    _metadata?: Record<string, any>
  ) {
    if (eventName === "langgraph.checkpoint" || eventName === "langgraph.interrupt" || eventName === "on_custom_event") {
      const isInterrupt = eventName === "langgraph.interrupt" || data?.__interrupt;
      if (isInterrupt || data?.checkpoint) {
        const currentState = this.stateMap.get(runId) || {};
        await this.recorder.checkpoint({
          parentSpanId: runId,
          checkpointId: data?.id || runId,
          reason: data?.reason || data?.name || "interrupt",
          state: currentState
        });
      }
    }
  }
}

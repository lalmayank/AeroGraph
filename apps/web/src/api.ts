import {
  traceForkRequestSchema,
  traceForkResponseSchema,
  traceListResponseSchema,
  traceLineageGraphSchema,
  traceWithMetaSchema,
  traceDiffResultSchema,
  traceAnalysisSchema,
  type TraceForkRequest,
  type TraceForkResponse,
  type TraceListResponse,
  type TraceLineageGraph,
  type TraceWithMeta,
  type TraceDiffResult,
  type TraceAnalysis
} from "@aerograph/contracts";

const DEFAULT_COLLECTOR = "http://localhost:4317";

export type Api = {
  listTraces(): Promise<TraceListResponse>;
  getTrace(traceId: string): Promise<TraceWithMeta>;
  forkTrace(traceId: string, body: TraceForkRequest): Promise<TraceForkResponse>;
  getLineage(traceId: string): Promise<TraceLineageGraph>;
  getDiff(aId: string, bId: string): Promise<TraceDiffResult>;
  getAnalysis(traceId: string): Promise<TraceAnalysis>;
};

export function createApi(baseUrl = DEFAULT_COLLECTOR): Api {
  const base = baseUrl.replace(/\/$/, "");

  return {
    async listTraces() {
      const res = await fetch(`${base}/v1/traces`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      return traceListResponseSchema.parse(json) as TraceListResponse;
    },

    async getTrace(traceId) {
      const res = await fetch(`${base}/v1/traces/${encodeURIComponent(traceId)}`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      return traceWithMetaSchema.parse(json) as TraceWithMeta;
    },

    async forkTrace(traceId, body) {
      const validated = traceForkRequestSchema.parse(body) as TraceForkRequest;
      const res = await fetch(`${base}/v1/traces/${encodeURIComponent(traceId)}/fork`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validated)
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      return traceForkResponseSchema.parse(json) as TraceForkResponse;
    },

    async getLineage(traceId) {
      const res = await fetch(`${base}/v1/traces/${encodeURIComponent(traceId)}/lineage`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      return traceLineageGraphSchema.parse(json) as TraceLineageGraph;
    },

    async getDiff(aId, bId) {
      const res = await fetch(
        `${base}/v1/traces/${encodeURIComponent(aId)}/diff/${encodeURIComponent(bId)}`
      );
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      return traceDiffResultSchema.parse(json) as TraceDiffResult;
    },

    async getAnalysis(traceId) {
      const res = await fetch(`${base}/v1/traces/${encodeURIComponent(traceId)}/analysis`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      return traceAnalysisSchema.parse(json) as TraceAnalysis;
    }
  };
}

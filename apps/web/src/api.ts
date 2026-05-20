import {
  traceAnalysisSchema,
  traceDiffResultSchema,
  traceListResponseSchema,
  traceWithMetaSchema,
  type TraceAnalysis,
  type TraceDiffResult,
  type TraceListResponse,
  type TraceWithMeta
} from "@afr/contracts";

const DEFAULT_COLLECTOR = "http://localhost:4317";

export type Api = {
  listTraces(): Promise<TraceListResponse>;
  getTrace(traceId: string): Promise<TraceWithMeta>;
  getAnalysis(traceId: string): Promise<TraceAnalysis>;
  forkTrace(traceId: string, forkFromSpanId: string, overrides?: { promptText?: string }): Promise<{ traceId: string }>;
  diffTraces(aId: string, bId: string): Promise<TraceDiffResult>;
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

    async getAnalysis(traceId) {
      const res = await fetch(`${base}/v1/traces/${encodeURIComponent(traceId)}/analysis`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      return traceAnalysisSchema.parse(json) as TraceAnalysis;
    },

    async forkTrace(traceId, forkFromSpanId, overrides) {
      const res = await fetch(`${base}/v1/traces/${encodeURIComponent(traceId)}/fork`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ forkFromSpanId, overrides: overrides ?? {} })
      });
      if (!res.ok) throw new Error(await res.text());
      return (await res.json()) as { traceId: string };
    },

    async diffTraces(aId, bId) {
      const res = await fetch(`${base}/v1/traces/${encodeURIComponent(aId)}/diff/${encodeURIComponent(bId)}`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      return traceDiffResultSchema.parse(json) as TraceDiffResult;
    }
  };
}

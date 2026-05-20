import {
  traceListResponseSchema,
  traceWithMetaSchema,
  type TraceListResponse,
  type TraceWithMeta
} from "@afr/contracts";

const DEFAULT_COLLECTOR = "http://localhost:4317";

export type Api = {
  listTraces(): Promise<TraceListResponse>;
  getTrace(traceId: string): Promise<TraceWithMeta>;
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
    }
  };
}

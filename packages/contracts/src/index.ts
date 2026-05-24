import { z } from "zod";

export const traceEventKindSchema = z.enum([
  "prompt",
  "response",
  "tool_call",
  "tool_result",
  "handoff",
  "error",
  "note",
  "state_snapshot",
  "retriever",
  "checkpoint"
]);
export type TraceEventKind = z.infer<typeof traceEventKindSchema>;

export const traceEventStatusSchema = z.enum(["ok", "error"]);
export type TraceEventStatus = z.infer<typeof traceEventStatusSchema>;

export const traceEventSchemaVersion = "1.0.0" as const;

const actorSchema = z.object({
  kind: z.enum(["agent", "tool", "system"]),
  id: z.string().min(1),
  name: z.string().min(1).optional()
});

const agentActorSchema = actorSchema.extend({ kind: z.literal("agent") });
const toolActorSchema = actorSchema.extend({ kind: z.literal("tool") });
const systemActorSchema = actorSchema.extend({ kind: z.literal("system") });

const baseEventSchema = z.object({
  schemaVersion: z.literal(traceEventSchemaVersion),
  traceId: z.string().min(1),
  spanId: z.string().min(1),
  parentSpanId: z.string().min(1).nullable(),
  occurredAt: z.string().datetime(),
  actor: actorSchema,
  status: traceEventStatusSchema,
  title: z.string().min(1).optional(),
  links: z
    .array(
      z.object({
        rel: z.enum(["follows", "caused_by", "handoff_to"]),
        spanId: z.string().min(1)
      })
    )
    .default([])
});

const promptEventSchema = baseEventSchema.extend({
  kind: z.literal("prompt"),
  actor: agentActorSchema,
  payload: z.object({ text: z.string() })
});

const responseEventSchema = baseEventSchema.extend({
  kind: z.literal("response"),
  actor: agentActorSchema,
  payload: z.object({ 
    text: z.string(),
    streamingTelemetry: z.object({
      timeToFirstTokenMs: z.number(),
      totalDurationMs: z.number(),
      tokensPerSecond: z.number(),
      tokenCount: z.number()
    }).optional()
  })
});

const toolCallEventSchema = baseEventSchema.extend({
  kind: z.literal("tool_call"),
  actor: toolActorSchema,
  payload: z.object({ input: z.record(z.string(), z.unknown()) })
});

const toolResultEventSchema = baseEventSchema.extend({
  kind: z.literal("tool_result"),
  actor: toolActorSchema,
  payload: z.object({ output: z.record(z.string(), z.unknown()) })
});

const handoffEventSchema = baseEventSchema.extend({
  kind: z.literal("handoff"),
  actor: systemActorSchema,
  payload: z.object({
    fromAgentId: z.string().min(1),
    toAgentId: z.string().min(1),
    reason: z.string().optional()
  })
});

const errorEventSchema = baseEventSchema.extend({
  kind: z.literal("error"),
  payload: z.object({
    message: z.string().min(1),
    details: z.record(z.string(), z.unknown()).default({})
  })
});

const noteEventSchema = baseEventSchema.extend({
  kind: z.literal("note"),
  payload: z.record(z.string(), z.unknown())
});

const stateSnapshotEventSchema = baseEventSchema.extend({
  kind: z.literal("state_snapshot"),
  actor: systemActorSchema,
  payload: z.object({
    nodeName: z.string(),
    stateHash: z.string(),
    stateDiff: z.record(z.string(), z.unknown()),
    removedKeys: z.array(z.string()).optional(),
    fullState: z.record(z.string(), z.unknown())
  })
});

const retrieverEventSchema = baseEventSchema.extend({
  kind: z.literal("retriever"),
  actor: toolActorSchema,
  payload: z.object({
    query: z.string(),
    documents: z.array(z.object({
      pageContent: z.string(),
      metadata: z.record(z.string(), z.unknown()),
      score: z.number().optional()
    }))
  })
});

const checkpointEventSchema = baseEventSchema.extend({
  kind: z.literal("checkpoint"),
  actor: systemActorSchema,
  payload: z.object({
    checkpointId: z.string(),
    reason: z.string(),
    state: z.record(z.string(), z.unknown())
  })
});

export const traceEventSchema = z.discriminatedUnion("kind", [
  promptEventSchema,
  responseEventSchema,
  toolCallEventSchema,
  toolResultEventSchema,
  handoffEventSchema,
  errorEventSchema,
  noteEventSchema,
  stateSnapshotEventSchema,
  retrieverEventSchema,
  checkpointEventSchema
]);

export type TraceEvent = z.infer<typeof traceEventSchema>;

export const traceSchema = z.object({
  traceId: z.string().min(1),
  createdAt: z.string().datetime(),
  rootSpanId: z.string().min(1).nullable(),
  events: z.array(traceEventSchema)
});

export type Trace = z.infer<typeof traceSchema>;

export const traceMetaSchema = z.object({
  traceId: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  eventCount: z.number().int().nonnegative(),
  rootSpanId: z.string().min(1).nullable(),
  derivedFrom: z
    .object({
      baseTraceId: z.string().min(1),
      forkedFromSpanId: z.string().min(1)
    })
    .optional()
});
export type TraceMeta = z.infer<typeof traceMetaSchema>;

export const traceWithMetaSchema = z.object({
  meta: traceMetaSchema,
  events: z.array(traceEventSchema)
});
export type TraceWithMeta = z.infer<typeof traceWithMetaSchema>;

export const traceListResponseSchema = z.object({
  traces: z.array(traceMetaSchema)
});
export type TraceListResponse = z.infer<typeof traceListResponseSchema>;

export const traceAnalysisSchema = z.object({
  loops: z.array(
    z.object({
      kind: z.enum(["repeated_sequence", "recursive_tool", "handoff_cycle"]).optional(),
      severity: z.enum(["low", "medium", "high"]).optional(),
      reason: z.string().min(1),
      spanIds: z.array(z.string().min(1))
    })
  ),
  failures: z.array(
    z.object({
      spanId: z.string().min(1),
      title: z.string().min(1).optional()
    })
  ),
  stats: z.object({
    eventCount: z.number().int().nonnegative(),
    actorCount: z.number().int().nonnegative()
  })
});
export type TraceAnalysis = z.infer<typeof traceAnalysisSchema>;

export const traceForkRequestSchema = z.object({
  forkFromSpanId: z.string().min(1),
  overrides: z
    .object({
      promptText: z.string().min(1).optional()
    })
    .optional()
});
export type TraceForkRequest = z.infer<typeof traceForkRequestSchema>;

export const traceForkResponseSchema = z.object({
  traceId: z.string().min(1)
});
export type TraceForkResponse = z.infer<typeof traceForkResponseSchema>;

export const traceLineageEdgeSchema = z.object({
  parentTraceId: z.string().min(1),
  childTraceId: z.string().min(1),
  forkedFromSpanId: z.string().min(1),
  createdAt: z.string().datetime(),
  overrides: z
    .object({
      promptText: z.string().min(1).optional()
    })
    .optional()
});
export type TraceLineageEdge = z.infer<typeof traceLineageEdgeSchema>;

export const traceLineageGraphSchema = z.object({
  rootTraceId: z.string().min(1),
  nodes: z.array(traceMetaSchema),
  edges: z.array(traceLineageEdgeSchema)
});
export type TraceLineageGraph = z.infer<typeof traceLineageGraphSchema>;

export const traceDiffResultSchema = z.object({
  a: traceMetaSchema,
  b: traceMetaSchema,
  divergence: z
    .object({
      forkPointSpanId: z.string().min(1).optional(),
      aIndex: z.number().int().nonnegative().optional(),
      bIndex: z.number().int().nonnegative().optional(),
      reason: z.string().min(1).optional()
    })
    .optional(),
  changed: z.array(
    z.object({
      index: z.number().int().nonnegative(),
      aSpanId: z.string().min(1).optional(),
      bSpanId: z.string().min(1).optional(),
      reason: z.string().min(1)
    })
  )
});
export type TraceDiffResult = z.infer<typeof traceDiffResultSchema>;

export function compareTraceEvents(
  a: Pick<TraceEvent, "occurredAt" | "spanId" | "kind">,
  b: Pick<TraceEvent, "occurredAt" | "spanId" | "kind">
): number {
  const t = a.occurredAt.localeCompare(b.occurredAt);
  if (t !== 0) return t;
  const s = a.spanId.localeCompare(b.spanId);
  if (s !== 0) return s;
  return a.kind.localeCompare(b.kind);
}

export function sortTraceEventsDeterministic<T extends Pick<TraceEvent, "occurredAt" | "spanId" | "kind">>(
  events: readonly T[]
): T[] {
  return [...events].sort(compareTraceEvents);
}

export function validateTraceEvent(input: unknown): TraceEvent {
  return traceEventSchema.parse(input);
}

export function validateTrace(input: unknown): Trace {
  return traceSchema.parse(input);
}

export function validateTraceWithMeta(input: unknown): TraceWithMeta {
  return traceWithMetaSchema.parse(input);
}

export function validateTraceForkRequest(input: unknown): TraceForkRequest {
  return traceForkRequestSchema.parse(input);
}

export function validateTraceForkResponse(input: unknown): TraceForkResponse {
  return traceForkResponseSchema.parse(input);
}

export function validateTraceLineageGraph(input: unknown): TraceLineageGraph {
  return traceLineageGraphSchema.parse(input);
}

export function validateTraceDiffResult(input: unknown): TraceDiffResult {
  return traceDiffResultSchema.parse(input);
}

export function validateTraceAnalysis(input: unknown): TraceAnalysis {
  return traceAnalysisSchema.parse(input);
}

export * from "./utils/hash";

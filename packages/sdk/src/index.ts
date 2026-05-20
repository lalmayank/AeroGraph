import { nanoid } from "nanoid";
import {
  traceEventSchemaVersion,
  type TraceEvent,
  validateTraceEvent
} from "@afr/contracts";

export type FlightRecorderOptions = {
  endpoint: string;
  traceId?: string;
  actor: { id: string; name?: string };
  fetchFn?: typeof fetch;
};

export class FlightRecorder {
  readonly endpoint: string;
  readonly traceId: string;
  readonly actor: { id: string; name?: string };
  private readonly fetchFn: typeof fetch;

  constructor(options: FlightRecorderOptions) {
    this.endpoint = options.endpoint.replace(/\/$/, "");
    this.traceId = options.traceId ?? `t_${nanoid()}`;
    this.actor = options.actor;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  createSpanId(): string {
    return `s_${nanoid()}`;
  }

  async emit(event: Omit<TraceEvent, "schemaVersion">): Promise<TraceEvent> {
    const fullEvent: TraceEvent = validateTraceEvent({
      ...event,
      schemaVersion: traceEventSchemaVersion
    });

    const res = await this.fetchFn(`${this.endpoint}/v1/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(fullEvent)
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to emit event: ${res.status} ${text}`);
    }

    return fullEvent;
  }

  async prompt(params: {
    spanId?: string;
    parentSpanId: string | null;
    title?: string;
    text: string;
  }): Promise<TraceEvent> {
    const spanId = params.spanId ?? this.createSpanId();
    return this.emit({
      traceId: this.traceId,
      spanId,
      parentSpanId: params.parentSpanId,
      occurredAt: new Date().toISOString(),
      actor: { kind: "agent", id: this.actor.id, name: this.actor.name },
      kind: "prompt",
      status: "ok",
      title: params.title,
      payload: { text: params.text },
      links: []
    });
  }

  async response(params: {
    spanId?: string;
    parentSpanId: string | null;
    title?: string;
    text: string;
  }): Promise<TraceEvent> {
    const spanId = params.spanId ?? this.createSpanId();
    return this.emit({
      traceId: this.traceId,
      spanId,
      parentSpanId: params.parentSpanId,
      occurredAt: new Date().toISOString(),
      actor: { kind: "agent", id: this.actor.id, name: this.actor.name },
      kind: "response",
      status: "ok",
      title: params.title,
      payload: { text: params.text },
      links: []
    });
  }

  async toolCall(params: {
    spanId?: string;
    parentSpanId: string | null;
    toolId: string;
    toolName?: string;
    input: Record<string, unknown>;
  }): Promise<TraceEvent> {
    const spanId = params.spanId ?? this.createSpanId();
    return this.emit({
      traceId: this.traceId,
      spanId,
      parentSpanId: params.parentSpanId,
      occurredAt: new Date().toISOString(),
      actor: { kind: "tool", id: params.toolId, name: params.toolName },
      kind: "tool_call",
      status: "ok",
      title: params.toolName,
      payload: { input: params.input },
      links: []
    });
  }

  async toolResult(params: {
    spanId?: string;
    parentSpanId: string | null;
    toolId: string;
    toolName?: string;
    output: Record<string, unknown>;
    status?: "ok" | "error";
  }): Promise<TraceEvent> {
    const spanId = params.spanId ?? this.createSpanId();
    return this.emit({
      traceId: this.traceId,
      spanId,
      parentSpanId: params.parentSpanId,
      occurredAt: new Date().toISOString(),
      actor: { kind: "tool", id: params.toolId, name: params.toolName },
      kind: "tool_result",
      status: params.status ?? "ok",
      title: params.toolName,
      payload: { output: params.output },
      links: []
    });
  }

  async handoff(params: {
    spanId?: string;
    parentSpanId: string | null;
    fromAgentId: string;
    toAgentId: string;
    reason?: string;
  }): Promise<TraceEvent> {
    const spanId = params.spanId ?? this.createSpanId();
    return this.emit({
      traceId: this.traceId,
      spanId,
      parentSpanId: params.parentSpanId,
      occurredAt: new Date().toISOString(),
      actor: { kind: "system", id: "handoff" },
      kind: "handoff",
      status: "ok",
      title: "handoff",
      payload: {
        fromAgentId: params.fromAgentId,
        toAgentId: params.toAgentId,
        reason: params.reason
      },
      links: []
    });
  }

  async error(params: {
    spanId?: string;
    parentSpanId: string | null;
    title?: string;
    message: string;
    details?: Record<string, unknown>;
  }): Promise<TraceEvent> {
    const spanId = params.spanId ?? this.createSpanId();
    return this.emit({
      traceId: this.traceId,
      spanId,
      parentSpanId: params.parentSpanId,
      occurredAt: new Date().toISOString(),
      actor: { kind: "system", id: this.actor.id, name: this.actor.name },
      kind: "error",
      status: "error",
      title: params.title,
      payload: { message: params.message, details: params.details ?? {} },
      links: []
    });
  }
}

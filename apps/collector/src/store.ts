/**
 * LEGACY IMPLEMENTATION
 *
 * Pre-SQLite JSONL in-memory trace store used during early MVP scaffolding.
 *
 * Not used by production collector.
 * Retained temporarily for reference during Phase 2 replay/fork work.
 */

import fs from "node:fs";
import path from "node:path";
import type {
  TraceAnalysis,
  TraceDiffResult,
  TraceEvent,
  TraceMeta,
  TraceWithMeta
} from "@aerograph/contracts";
import { nanoid } from "nanoid";

export type TraceStoreOptions = {
  dataDir?: string;
  persist?: boolean;
};

type TraceInternal = {
  meta: TraceMeta;
  events: TraceEvent[];
};

function ensureDirs(tracesDir: string) {
  fs.mkdirSync(tracesDir, { recursive: true });
}

function computeRootSpanId(events: TraceEvent[]): string | null {
  const roots = events.filter((e) => e.parentSpanId === null);
  if (roots.length === 0) return null;
  roots.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  return roots[0].spanId;
}

function stableKey(event: TraceEvent): string {
  return `${event.actor.kind}:${event.actor.id}:${event.kind}:${event.title ?? ""}`;
}

export class TraceStore {
  private traces = new Map<string, TraceInternal>();
  private readonly dataDir: string;
  private readonly tracesDir: string;
  private readonly persist: boolean;

  constructor(options: TraceStoreOptions = {}) {
    this.dataDir = options.dataDir ?? path.join(process.cwd(), "data");
    this.tracesDir = path.join(this.dataDir, "traces");
    this.persist = options.persist ?? true;

    if (this.persist) {
      ensureDirs(this.tracesDir);
      this.loadFromDisk();
    }
  }

  private loadFromDisk() {
    if (!fs.existsSync(this.tracesDir)) return;

    const files = fs.readdirSync(this.tracesDir).filter((f) => f.endsWith(".jsonl"));
    for (const file of files) {
      const traceId = file.replace(/\.jsonl$/, "");
      const filePath = path.join(this.tracesDir, file);
      const lines = fs
        .readFileSync(filePath, "utf8")
        .split(/\r?\n/)
        .filter(Boolean);
      const events: TraceEvent[] = [];
      for (const line of lines) {
        events.push(JSON.parse(line) as TraceEvent);
      }

      if (events.length === 0) continue;
      events.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

      const createdAt = events[0].occurredAt;
      const updatedAt = events[events.length - 1].occurredAt;

      const meta: TraceMeta = {
        traceId,
        createdAt,
        updatedAt,
        eventCount: events.length,
        rootSpanId: computeRootSpanId(events)
      };

      this.traces.set(traceId, { meta, events });
    }
  }

  listTraces(): TraceMeta[] {
    return [...this.traces.values()]
      .map((t) => t.meta)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  getTrace(traceId: string): TraceWithMeta | null {
    const trace = this.traces.get(traceId);
    if (!trace) return null;
    return { meta: trace.meta, events: trace.events };
  }

  appendEvent(event: TraceEvent) {
    let trace = this.traces.get(event.traceId);
    if (!trace) {
      trace = {
        meta: {
          traceId: event.traceId,
          createdAt: event.occurredAt,
          updatedAt: event.occurredAt,
          eventCount: 0,
          rootSpanId: null
        },
        events: []
      };
      this.traces.set(event.traceId, trace);
    }

    trace.events.push(event);
    trace.events.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

    trace.meta.eventCount = trace.events.length;
    trace.meta.createdAt = trace.events[0]?.occurredAt ?? trace.meta.createdAt;
    trace.meta.updatedAt = trace.events[trace.events.length - 1]?.occurredAt ?? trace.meta.updatedAt;
    trace.meta.rootSpanId = computeRootSpanId(trace.events);

    if (this.persist) {
      ensureDirs(this.tracesDir);
      const fp = path.join(this.tracesDir, `${event.traceId}.jsonl`);
      fs.appendFileSync(fp, `${JSON.stringify(event)}\n`, "utf8");
    }
  }

  analyze(traceId: string): TraceAnalysis | null {
    const trace = this.traces.get(traceId);
    if (!trace) return null;

    const events = trace.events;

    const failures = events
      .filter((e) => e.status === "error")
      .map((e) => ({ spanId: e.spanId, title: e.title }));

    const actorCount = new Set(events.map((e) => e.actor.id)).size;

    // Loop heuristic: find repeated sequences of stable keys (length 2) occurring back-to-back.
    const keys = events.map(stableKey);
    const loops: TraceAnalysis["loops"] = [];
    const windowSize = 2;
    for (let i = 0; i + windowSize * 2 <= keys.length; i++) {
      const a = keys.slice(i, i + windowSize).join("|");
      const b = keys.slice(i + windowSize, i + windowSize * 2).join("|");
      if (a === b) {
        const spanIds = events
          .slice(i, i + windowSize * 2)
          .map((e) => e.spanId);
        loops.push({ reason: "Repeated sequence detected", spanIds });
        i += windowSize * 2 - 1;
      }
    }

    return {
      loops,
      failures,
      stats: { eventCount: events.length, actorCount }
    };
  }

  forkTrace(params: {
    baseTraceId: string;
    forkFromSpanId: string;
    overrides?: {
      promptText?: string;
    };
  }): TraceWithMeta {
    const base = this.traces.get(params.baseTraceId);
    if (!base) {
      throw new Error(`Base trace not found: ${params.baseTraceId}`);
    }

    const forkIndex = base.events.findIndex((e) => e.spanId === params.forkFromSpanId);
    if (forkIndex < 0) {
      throw new Error(`forkFromSpanId not found: ${params.forkFromSpanId}`);
    }

    const subset = base.events.slice(0, forkIndex + 1);
    const forkSuffix = nanoid(8);
    const traceId = `t_fork_${forkSuffix}`;

    const spanMap = new Map<string, string>();
    for (const e of subset) {
      spanMap.set(e.spanId, `${e.spanId}__${forkSuffix}`);
    }

    const events: TraceEvent[] = subset.map((e) => {
      const newSpanId = spanMap.get(e.spanId) ?? e.spanId;
      const newParent = e.parentSpanId ? spanMap.get(e.parentSpanId) ?? e.parentSpanId : null;
      const newLinks = (e.links ?? []).map((l) => ({
        ...l,
        spanId: spanMap.get(l.spanId) ?? l.spanId
      }));

      const next: TraceEvent = {
        ...e,
        traceId,
        spanId: newSpanId,
        parentSpanId: newParent,
        links: newLinks
      };

      // Apply override only if forking from a prompt event.
      if (
        e.spanId === params.forkFromSpanId &&
        e.kind === "prompt" &&
        typeof params.overrides?.promptText === "string"
      ) {
        next.payload = { ...next.payload, text: params.overrides.promptText };
      }

      return next;
    });

    const noteSpanId = `s_note_${nanoid(10)}`;
    const forkedFromNewSpanId = spanMap.get(params.forkFromSpanId) ?? params.forkFromSpanId;

    events.push({
      schemaVersion: events[0].schemaVersion,
      traceId,
      spanId: noteSpanId,
      parentSpanId: forkedFromNewSpanId,
      occurredAt: new Date().toISOString(),
      actor: { kind: "system", id: "collector" },
      kind: "note",
      status: "ok",
      title: "fork",
      payload: {
        derivedFrom: {
          baseTraceId: params.baseTraceId,
          forkedFromSpanId: params.forkFromSpanId
        },
        overrides: params.overrides ?? {}
      },
      links: []
    });

    events.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

    const meta: TraceMeta = {
      traceId,
      createdAt: events[0].occurredAt,
      updatedAt: events[events.length - 1].occurredAt,
      eventCount: events.length,
      rootSpanId: computeRootSpanId(events),
      derivedFrom: {
        baseTraceId: params.baseTraceId,
        forkedFromSpanId: params.forkFromSpanId
      }
    };

    this.traces.set(traceId, { meta, events });

    if (this.persist) {
      ensureDirs(this.tracesDir);
      const fp = path.join(this.tracesDir, `${traceId}.jsonl`);
      fs.writeFileSync(fp, events.map((e) => JSON.stringify(e)).join("\n") + "\n", "utf8");
    }

    return { meta, events };
  }

  diffTraces(aId: string, bId: string): TraceDiffResult | null {
    const a = this.traces.get(aId);
    const b = this.traces.get(bId);
    if (!a || !b) return null;

    // Align by order as a simple, deterministic baseline.
    const aEvents = a.events;
    const bEvents = b.events;
    const max = Math.max(aEvents.length, bEvents.length);

    const changed: Array<{ index: number; aSpanId?: string; bSpanId?: string; reason: string }> = [];

    for (let i = 0; i < max; i++) {
      const ae = aEvents[i];
      const be = bEvents[i];
      if (!ae) {
        changed.push({ index: i, bSpanId: be.spanId, reason: "added" });
        continue;
      }
      if (!be) {
        changed.push({ index: i, aSpanId: ae.spanId, reason: "removed" });
        continue;
      }
      const ak = stableKey(ae);
      const bk = stableKey(be);
      if (ak !== bk) {
        changed.push({ index: i, aSpanId: ae.spanId, bSpanId: be.spanId, reason: "type/actor changed" });
        continue;
      }
      const ap = JSON.stringify(ae.payload);
      const bp = JSON.stringify(be.payload);
      if (ap !== bp) {
        changed.push({ index: i, aSpanId: ae.spanId, bSpanId: be.spanId, reason: "payload changed" });
      }
    }

    return {
      a: a.meta,
      b: b.meta,
      changed
    };
  }
}

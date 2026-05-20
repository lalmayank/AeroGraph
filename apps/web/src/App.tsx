import { useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  type Edge,
  type Node,
  MarkerType,
} from "reactflow";
import {
  type TraceAnalysis,
  type TraceDiffResult,
  type TraceEvent,
  type TraceMeta,
} from "@afr/contracts";
import { createApi } from "./api";

type Selected = {
  event: TraceEvent;
};

function nodeId(spanId: string) {
  return spanId;
}

function labelForEvent(e: TraceEvent) {
  const actor = e.actor.name ?? e.actor.id;
  const title = e.title ? `: ${e.title}` : "";
  return `${e.kind} • ${actor}${title}`;
}

function buildGraph(
  events: TraceEvent[],
  changedSpanIds?: Set<string>,
  loopSpanIds?: Set<string>,
) {
  const nodes: Node[] = events.map((e, idx) => {
    const isError = e.status === "error";
    const isChanged = changedSpanIds?.has(e.spanId) ?? false;
    const isLoop = loopSpanIds?.has(e.spanId) ?? false;

    const borderColor = isError
      ? "#b91c1c"
      : isLoop
        ? "#a16207"
        : isChanged
          ? "#1d4ed8"
          : "#334155";
    const bg = isError
      ? "#fee2e2"
      : isLoop
        ? "#fef3c7"
        : isChanged
          ? "#dbeafe"
          : "#f8fafc";

    return {
      id: nodeId(e.spanId),
      position: { x: (idx % 4) * 260, y: Math.floor(idx / 4) * 120 },
      data: { label: labelForEvent(e) },
      style: {
        border: `2px solid ${borderColor}`,
        background: bg,
        borderRadius: 8,
        padding: 8,
        width: 240,
        fontSize: 12,
      },
    };
  });

  const edges: Edge[] = events
    .filter((e) => e.parentSpanId)
    .map((e) => ({
      id: `${e.parentSpanId}->${e.spanId}`,
      source: nodeId(e.parentSpanId!),
      target: nodeId(e.spanId),
      markerEnd: { type: MarkerType.ArrowClosed },
      animated: false,
    }));

  return { nodes, edges };
}

export default function App() {
  const api = useMemo(() => createApi(), []);

  const [traces, setTraces] = useState<TraceMeta[]>([]);
  const [traceId, setTraceId] = useState<string>("");
  const [compareTraceId, setCompareTraceId] = useState<string>("");

  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [analysis, setAnalysis] = useState<TraceAnalysis | null>(null);
  const [diff, setDiff] = useState<TraceDiffResult | null>(null);

  const [selected, setSelected] = useState<Selected | null>(null);
  const [forkPromptText, setForkPromptText] = useState<string>("");
  const [error, setError] = useState<string>("");

  const changedSpanIds = useMemo(() => {
    if (!diff) return undefined;
    const set = new Set<string>();
    for (const c of diff.changed) {
      if (c.aSpanId) set.add(c.aSpanId);
      if (c.bSpanId) set.add(c.bSpanId);
    }
    return set;
  }, [diff]);

  const loopSpanIds = useMemo(() => {
    if (!analysis) return undefined;
    const set = new Set<string>();
    for (const loop of analysis.loops) {
      for (const spanId of loop.spanIds) set.add(spanId);
    }
    return set;
  }, [analysis]);

  const graph = useMemo(
    () => buildGraph(events, changedSpanIds, loopSpanIds),
    [events, changedSpanIds, loopSpanIds],
  );

  async function refreshTraces() {
    try {
      setError("");
      const res = await api.listTraces();
      setTraces(res.traces);
      if (!traceId && res.traces[0]) {
        setTraceId(res.traces[0].traceId);
      }
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }

  async function loadTrace(selectedTraceId: string) {
    if (!selectedTraceId) return;
    try {
      setError("");
      setSelected(null);
      const trace = await api.getTrace(selectedTraceId);
      setEvents(trace.events);
      const a = await api.getAnalysis(selectedTraceId);
      setAnalysis(a);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }

  async function loadDiff(aId: string, bId: string) {
    if (!aId || !bId) {
      setDiff(null);
      return;
    }
    try {
      setError("");
      const d = await api.diffTraces(aId, bId);
      setDiff(d);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }

  useEffect(() => {
    refreshTraces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadTrace(traceId);
    loadDiff(traceId, compareTraceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traceId]);

  useEffect(() => {
    loadDiff(traceId, compareTraceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compareTraceId]);

  return (
    <div className="layout">
      <header className="header">
        <div className="title">Agent Flight Recorder</div>
        <div className="controls">
          <label>
            Trace
            <select
              value={traceId}
              onChange={(e) => setTraceId(e.target.value)}
            >
              <option value="">(select)</option>
              {traces.map((t) => (
                <option key={t.traceId} value={t.traceId}>
                  {t.traceId} ({t.eventCount})
                </option>
              ))}
            </select>
          </label>

          <label>
            Compare
            <select
              value={compareTraceId}
              onChange={(e) => setCompareTraceId(e.target.value)}
            >
              <option value="">(none)</option>
              {traces
                .filter((t) => t.traceId !== traceId)
                .map((t) => (
                  <option key={t.traceId} value={t.traceId}>
                    {t.traceId} ({t.eventCount})
                  </option>
                ))}
            </select>
          </label>

          <button type="button" onClick={refreshTraces}>
            Refresh
          </button>
        </div>
      </header>

      {error ? <div className="error">{error}</div> : null}

      <main className="main">
        <section className="graph">
          <ReactFlow
            nodes={graph.nodes}
            edges={graph.edges}
            onNodeClick={(_, node) => {
              const event = events.find((e) => e.spanId === node.id);
              if (event) setSelected({ event });
            }}
            fitView
          >
            <Background />
            <Controls />
          </ReactFlow>
        </section>

        <aside className="side">
          <div className="panel">
            <div className="panelTitle">Analysis</div>
            <div className="panelBody">
              <div>Failures: {analysis?.failures.length ?? 0}</div>
              <div>Loops: {analysis?.loops.length ?? 0}</div>
              <div>Events: {analysis?.stats.eventCount ?? 0}</div>
              <div>Actors: {analysis?.stats.actorCount ?? 0}</div>
              {compareTraceId && diff ? (
                <div>Diff changes: {diff.changed.length}</div>
              ) : null}
            </div>
          </div>

          <div className="panel">
            <div className="panelTitle">Selection</div>
            <div className="panelBody">
              {selected ? (
                <>
                  <div className="kv">
                    <div className="k">spanId</div>
                    <div className="v">{selected.event.spanId}</div>
                    <div className="k">kind</div>
                    <div className="v">{selected.event.kind}</div>
                    <div className="k">status</div>
                    <div className="v">{selected.event.status}</div>
                  </div>

                  <div className="fork">
                    <div className="forkTitle">Fork from this event</div>
                    <label className="forkLabel">
                      Override prompt text (only applies if this is a prompt)
                      <textarea
                        value={forkPromptText}
                        onChange={(e) => setForkPromptText(e.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!traceId) return;
                        try {
                          setError("");
                          const res = await api.forkTrace(
                            traceId,
                            selected.event.spanId,
                            {
                              promptText: forkPromptText || undefined,
                            },
                          );
                          await refreshTraces();
                          setCompareTraceId(res.traceId);
                        } catch (e: any) {
                          setError(e?.message ?? String(e));
                        }
                      }}
                    >
                      Create fork trace
                    </button>
                  </div>

                  <div className="payloadTitle">Payload</div>
                  <pre className="payload">
                    {JSON.stringify(selected.event, null, 2)}
                  </pre>
                </>
              ) : (
                <div>Select a node to inspect payload.</div>
              )}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

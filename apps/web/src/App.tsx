import { useEffect, useMemo, useState, useRef } from "react";
import ReactFlow, { Background, Controls } from "reactflow";
import { type TraceEvent, type TraceMeta } from "@afr/contracts";
import { createApi } from "./api";
import { buildGraph, computePlaybackState } from "./graph";

type Selected = {
  event: TraceEvent;
};

export default function App() {
  const api = useMemo(() => createApi(), []);

  const [traces, setTraces] = useState<TraceMeta[]>([]);
  const [traceId, setTraceId] = useState<string>("");
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [error, setError] = useState<string>("");
  
  // Realtime Polling
  const [liveUpdating, setLiveUpdating] = useState(true);
  
  // Playback state
  const [playbackCursor, setPlaybackCursor] = useState<number>(-1);

  const visibleEvents = useMemo(() => {
    if (playbackCursor === -1 || playbackCursor >= events.length) return events;
    return computePlaybackState(events, playbackCursor);
  }, [events, playbackCursor]);

  const graph = useMemo(() => buildGraph(visibleEvents), [visibleEvents]);

  const refreshTraces = async () => {
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
  };

  const loadTrace = async (selectedTraceId: string) => {
    if (!selectedTraceId) return;
    try {
      setError("");
      const trace = await api.getTrace(selectedTraceId);
      
      // Update events if changed (rough check by length for MVP)
      setEvents((prev) => {
        if (prev.length !== trace.events.length) {
          // If we were at the end, keep at the end, else keep cursor
          return trace.events;
        }
        return prev;
      });
      
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  };

  useEffect(() => {
    refreshTraces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadTrace(traceId);
    setPlaybackCursor(-1); // Reset playback on trace change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traceId]);

  // Polling mechanism
  useEffect(() => {
    if (!liveUpdating) return;
    const interval = setInterval(() => {
      refreshTraces();
      if (traceId) {
        loadTrace(traceId);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [liveUpdating, traceId]);

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
            <input 
              type="checkbox" 
              checked={liveUpdating} 
              onChange={(e) => setLiveUpdating(e.target.checked)} 
            />
            {liveUpdating ? "🟢 Live updating" : "⚪ Paused"}
          </label>

          <button type="button" onClick={() => {
            refreshTraces();
            if (traceId) loadTrace(traceId);
          }}>
            Refresh Now
          </button>
        </div>
      </header>

      {error ? <div className="error">{error}</div> : null}

      <main className="main">
        <section className="graph">
          <div className="playback-controls" style={{ position: "absolute", zIndex: 10, padding: 10, background: "white", border: "1px solid #ccc", margin: 10, borderRadius: 5 }}>
            <button 
              disabled={playbackCursor <= 0 && playbackCursor !== -1} 
              onClick={() => setPlaybackCursor(prev => prev === -1 ? events.length - 2 : prev - 1)}
            >
              Prev
            </button>
            <span style={{ margin: "0 10px" }}>
              {playbackCursor === -1 ? events.length : playbackCursor + 1} / {events.length}
            </span>
            <button 
              disabled={playbackCursor === -1 || playbackCursor >= events.length - 1} 
              onClick={() => setPlaybackCursor(prev => prev >= events.length - 1 ? -1 : prev + 1)}
            >
              Next
            </button>
            <button style={{ marginLeft: 10 }} onClick={() => setPlaybackCursor(-1)}>
              Live (End)
            </button>
          </div>
          
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

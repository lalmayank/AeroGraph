import React from "react";
import type { TraceEvent } from "@afr/contracts";

export function StreamingMetrics({ event }: { event: TraceEvent }) {
  const payload = (event as any).payload;
  if (!payload || !payload.streamingTelemetry) return null;

  const { timeToFirstTokenMs, totalDurationMs, tokensPerSecond, tokenCount } = payload.streamingTelemetry;

  return (
    <div className="detail-section" style={{ background: "rgba(16, 185, 129, 0.05)", borderLeft: "3px solid #10b981" }}>
      <div className="detail-section-label" style={{ color: "#10b981" }}>Streaming Telemetry</div>
      <div className="kv-grid">
        <div className="kv-row">
          <span className="kv-key">TTFT</span>
          <span className="kv-val">{Math.round(timeToFirstTokenMs)}ms</span>
        </div>
        <div className="kv-row">
          <span className="kv-key">Duration</span>
          <span className="kv-val">{Math.round(totalDurationMs)}ms</span>
        </div>
        <div className="kv-row">
          <span className="kv-key">Speed</span>
          <span className="kv-val">{Math.round(tokensPerSecond)} tok/s</span>
        </div>
        <div className="kv-row">
          <span className="kv-key">Tokens</span>
          <span className="kv-val">{tokenCount}</span>
        </div>
      </div>
    </div>
  );
}

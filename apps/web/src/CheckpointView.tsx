import React from "react";
import type { TraceEvent } from "@aerograph/contracts";
import { JsonView } from "./JsonView";

export function CheckpointView({ event }: { event: TraceEvent }) {
  if (event.kind !== "checkpoint") return null;

  const payload = (event as any).payload;
  if (!payload) return null;

  const { checkpointId, reason, state } = payload;

  return (
    <div className="checkpoint-inspector" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="detail-section" style={{ background: "rgba(245, 158, 11, 0.05)", borderLeft: "3px solid #f59e0b" }}>
        <div className="detail-section-label" style={{ color: "#f59e0b" }}>Human Checkpoint (Interrupt)</div>
        <div className="kv-grid">
          <div className="kv-row">
            <span className="kv-key">ID</span>
            <span className="kv-val" style={{ fontFamily: "monospace" }}>{checkpointId}</span>
          </div>
          <div className="kv-row">
            <span className="kv-key">Reason</span>
            <span className="kv-val" style={{ color: "var(--text-secondary)" }}>{reason}</span>
          </div>
        </div>
      </div>

      {state && Object.keys(state).length > 0 && (
        <div className="detail-section">
          <div className="detail-section-label">Checkpoint State</div>
          <JsonView data={state} maxLines={15} />
        </div>
      )}
    </div>
  );
}

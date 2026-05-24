import React from "react";
import type { TraceEvent } from "@aerograph/contracts";
import { JsonView } from "./JsonView";

export function StateInspector({ event }: { event: TraceEvent }) {
  if (event.kind !== "state_snapshot") return null;

  const payload = (event as any).payload;
  if (!payload) return null;

  const { nodeName, stateHash, stateDiff, fullState } = payload;

  return (
    <div className="state-inspector" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="detail-section">
        <div className="detail-section-label">State Update Info</div>
        <div className="kv-grid">
          <div className="kv-row">
            <span className="kv-key">Node</span>
            <span className="kv-val">{nodeName}</span>
          </div>
          <div className="kv-row">
            <span className="kv-key">Hash</span>
            <span className="kv-val" style={{ fontFamily: "monospace" }}>{stateHash?.slice(0, 8)}...</span>
          </div>
        </div>
      </div>

      {stateDiff && Object.keys(stateDiff).length > 0 && (
        <div className="detail-section">
          <div className="detail-section-label">State Diff</div>
          <div style={{ borderLeft: "3px solid var(--accent)", background: "rgba(99,130,255,0.05)" }}>
            <JsonView data={stateDiff} />
          </div>
        </div>
      )}

      {fullState && (
        <div className="detail-section">
          <div className="detail-section-label">Full State</div>
          <JsonView data={fullState} maxLines={15} />
        </div>
      )}
    </div>
  );
}

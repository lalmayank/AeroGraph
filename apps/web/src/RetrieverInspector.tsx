import React from "react";
import type { TraceEvent } from "@afr/contracts";
import { JsonView } from "./JsonView";

export function RetrieverInspector({ event }: { event: TraceEvent }) {
  if (event.kind !== "retriever") return null;

  const payload = (event as any).payload;
  if (!payload || !payload.documents) return null;

  const { query, documents } = payload;

  return (
    <div className="retriever-inspector" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="detail-section">
        <div className="detail-section-label">Retriever Query</div>
        <div className="kv-val-text" style={{ fontStyle: "italic", padding: "8px 12px", background: "rgba(255,255,255,0.05)", borderRadius: 6 }}>
          "{query}"
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-label">Retrieved Documents ({documents.length})</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          {documents.map((doc: any, i: number) => (
            <div key={i} style={{ padding: 10, background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-subtle)", borderRadius: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)" }}>DOC {i + 1}</span>
                {doc.score !== undefined && (
                  <span style={{ fontSize: 10, color: "var(--accent)" }}>Score: {doc.score.toFixed(3)}</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                {doc.pageContent.length > 300 ? doc.pageContent.slice(0, 300) + "..." : doc.pageContent}
              </div>
              {doc.metadata && Object.keys(doc.metadata).length > 0 && (
                <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px dashed var(--border-subtle)" }}>
                  <div style={{ fontSize: 9, color: "var(--text-muted)" }}>
                    <JsonView data={doc.metadata} maxLines={5} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

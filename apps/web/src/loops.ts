import type { TraceAnalysis } from "@afr/contracts";

export type LoopHighlight = {
  spanId: string;
  kind: string;
  severity: "low" | "medium" | "high";
};

/**
 * Map TraceAnalysis loop warnings to a list of span highlights for the graph.
 * Deterministic: preserves the order produced by the analysis engine
 * (which is sorted by first-span occurredAt, then spanId).
 */
export function mapLoopsToHighlights(analysis: TraceAnalysis): LoopHighlight[] {
  const highlights: LoopHighlight[] = [];

  for (const warning of analysis.loops) {
    for (const spanId of warning.spanIds) {
      highlights.push({
        spanId,
        kind: warning.kind ?? "unknown",
        severity: warning.severity ?? "low"
      });
    }
  }

  return highlights;
}

/**
 * Returns a set of spanIds flagged by any loop warning.
 * Used for graph node styling.
 */
export function getLoopWarningSpanIds(analysis: TraceAnalysis): Set<string> {
  const ids = new Set<string>();
  for (const warning of analysis.loops) {
    for (const spanId of warning.spanIds) {
      ids.add(spanId);
    }
  }
  return ids;
}

/**
 * Returns the spanId to jump to for the first loop warning (first span of first warning).
 */
export function getFirstLoopSpanId(analysis: TraceAnalysis): string | null {
  if (analysis.loops.length === 0) return null;
  return analysis.loops[0].spanIds[0] ?? null;
}

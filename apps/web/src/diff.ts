import type { TraceDiffResult } from "@aerograph/contracts";

export type DiffHighlight = {
  spanId: string;
  side: "a" | "b";
};

/**
 * Map a TraceDiffResult to a set of span highlights for the graph.
 * Returns the changed spans for both traces so the UI can highlight them.
 * Also returns the first divergence point for "jump to divergence".
 */
export function mapDiffToHighlights(diff: TraceDiffResult): {
  highlights: DiffHighlight[];
  divergenceSpanId: string | null;
} {
  const highlights: DiffHighlight[] = [];

  // Deterministic: iterate changed in index order (already sorted by the diff engine)
  for (const change of diff.changed) {
    if (change.aSpanId) {
      highlights.push({ spanId: change.aSpanId, side: "a" });
    }
    if (change.bSpanId) {
      highlights.push({ spanId: change.bSpanId, side: "b" });
    }
  }

  // First divergence: prefer forkPointSpanId, then first changed span
  let divergenceSpanId: string | null = null;
  if (diff.divergence?.forkPointSpanId) {
    divergenceSpanId = diff.divergence.forkPointSpanId;
  } else if (diff.changed.length > 0) {
    const first = diff.changed[0];
    divergenceSpanId = first.aSpanId ?? first.bSpanId ?? null;
  }

  return { highlights, divergenceSpanId };
}

/**
 * Returns the set of spanIds that appear in the diff changed list.
 * Used for graph highlighting.
 */
export function getDiffChangedSpanIds(diff: TraceDiffResult): Set<string> {
  const ids = new Set<string>();
  for (const change of diff.changed) {
    if (change.aSpanId) ids.add(change.aSpanId);
    if (change.bSpanId) ids.add(change.bSpanId);
  }
  return ids;
}

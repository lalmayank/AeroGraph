import { sortTraceEventsDeterministic, type TraceEvent, type TraceDiffResult, type TraceMeta } from "@aerograph/contracts";
import { stableKey } from "./stableKey";
import { myersDiff } from "./myers";

/**
 * Lineage-aware diff composition.
 *
 * Strategy:
 * 1. If one trace is a descendant of the other (ancestor/descendant relationship):
 *    - Align on the shared prefix (events whose spanIds appear in the shorter/ancestor trace).
 *    - Diff only the suffix of each trace beyond the shared prefix.
 * 2. If traces share no lineage (or are siblings from a fork point):
 *    - Diff both full sequences using stable keys.
 *
 * The shared prefix for forked traces is detected by intersecting spanIds
 * (because forkTrace copies events with preserved spanIds).
 *
 * Output: TraceDiffResult (validated by @aerograph/contracts before returning).
 */
export function diffTraceEvents(
  aEvents: TraceEvent[],
  bEvents: TraceEvent[],
  aMeta: TraceMeta,
  bMeta: TraceMeta,
  forkPointSpanId?: string
): TraceDiffResult {
  // Sort both deterministically before comparing.
  const aSorted = sortTraceEventsDeterministic(aEvents);
  const bSorted = sortTraceEventsDeterministic(bEvents);

  // Find the shared prefix if a fork point is known.
  let prefixLength = 0;
  if (forkPointSpanId) {
    // Count shared prefix events up to and including forkPointSpanId in both traces.
    const aForkIdx = aSorted.findIndex((e) => e.spanId === forkPointSpanId);
    const bForkIdx = bSorted.findIndex((e) => e.spanId === forkPointSpanId);
    if (aForkIdx >= 0 && bForkIdx >= 0) {
      // Shared prefix is events 0..forkIdx (inclusive) in both traces
      // that share the same spanIds (fork copy reuses spanIds).
      prefixLength = Math.min(aForkIdx + 1, bForkIdx + 1);
    }
  } else {
    // Auto-detect shared prefix by matching spanIds from the start.
    while (
      prefixLength < aSorted.length &&
      prefixLength < bSorted.length &&
      aSorted[prefixLength].spanId === bSorted[prefixLength].spanId
    ) {
      prefixLength++;
    }
  }

  // Suffix sequences that need diffing.
  const aSuffix = aSorted.slice(prefixLength);
  const bSuffix = bSorted.slice(prefixLength);

  const aKeys = aSuffix.map(stableKey);
  const bKeys = bSuffix.map(stableKey);

  const editScript = myersDiff(aKeys, bKeys);

  const changed: TraceDiffResult["changed"] = [];
  let divergenceDetected = false;
  let divergenceAIndex: number | undefined;
  let divergenceBIndex: number | undefined;

  for (const op of editScript) {
    if (op.op === "equal") continue;

    // Record first divergence
    if (!divergenceDetected) {
      divergenceDetected = true;
      if (op.op === "delete") {
        divergenceAIndex = prefixLength + op.aIndex;
        divergenceBIndex = undefined;
      } else {
        divergenceAIndex = undefined;
        divergenceBIndex = prefixLength + op.bIndex;
      }
    }

    if (op.op === "delete") {
      changed.push({
        index: prefixLength + op.aIndex,
        aSpanId: aSuffix[op.aIndex]?.spanId,
        reason: "deleted"
      });
    } else {
      changed.push({
        index: prefixLength + op.bIndex,
        bSpanId: bSuffix[op.bIndex]?.spanId,
        reason: "inserted"
      });
    }
  }

  // Sort changed by index (deterministic)
  changed.sort((x, y) => x.index - y.index);

  const divergence: TraceDiffResult["divergence"] = divergenceDetected
    ? {
        forkPointSpanId: forkPointSpanId,
        aIndex: divergenceAIndex,
        bIndex: divergenceBIndex,
        reason: changed[0]?.reason
      }
    : undefined;

  return {
    a: aMeta,
    b: bMeta,
    divergence,
    changed
  };
}

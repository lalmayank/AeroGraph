import { sortTraceEventsDeterministic, type TraceEvent, type TraceAnalysis } from "@afr/contracts";
import { detectRepeatedSequences } from "./repeatedSequence";
import { detectRecursiveTools } from "./recursiveTool";
import { detectHandoffCycles } from "./handoffCycle";

/**
 * Compose all loop analysis heuristics into a single TraceAnalysis result.
 *
 * Output invariants:
 * - All loop warnings are deterministically merged and sorted by:
 *   first span occurredAt → first spanId (lexicographic).
 * - Failures list: error-status events, sorted by occurredAt then spanId.
 * - Stats: derived from the input events.
 */
export function analyzeTrace(events: readonly TraceEvent[]): TraceAnalysis {
  const sorted = sortTraceEventsDeterministic([...events]);

  // Collect all loop warnings from all heuristics
  const repeatedSeq = detectRepeatedSequences(sorted);
  const recursiveTool = detectRecursiveTools(sorted);
  const handoffCycles = detectHandoffCycles(sorted);

  // Merge and sort all warnings deterministically
  const allWarnings = [
    ...repeatedSeq.map((w) => ({
      kind: w.kind as "repeated_sequence" | "recursive_tool" | "handoff_cycle",
      severity: w.severity as "low" | "medium" | "high",
      reason: w.reason,
      spanIds: w.spanIds
    })),
    ...recursiveTool.map((w) => ({
      kind: w.kind as "repeated_sequence" | "recursive_tool" | "handoff_cycle",
      severity: w.severity as "low" | "medium" | "high",
      reason: w.reason,
      spanIds: w.spanIds
    })),
    ...handoffCycles.map((w) => ({
      kind: w.kind as "repeated_sequence" | "recursive_tool" | "handoff_cycle",
      severity: w.severity as "low" | "medium" | "high",
      reason: w.reason,
      spanIds: w.spanIds
    }))
  ];

  // Sort merged list: first by first spanId's occurredAt, then by first spanId
  allWarnings.sort((a, b) => {
    const aSpan = sorted.find((e) => e.spanId === a.spanIds[0]);
    const bSpan = sorted.find((e) => e.spanId === b.spanIds[0]);
    const t = (aSpan?.occurredAt ?? "").localeCompare(bSpan?.occurredAt ?? "");
    if (t !== 0) return t;
    return (a.spanIds[0] ?? "").localeCompare(b.spanIds[0] ?? "");
  });

  // Failures: events with status "error"
  const failures = sorted
    .filter((e) => e.status === "error")
    .map((e) => ({
      spanId: e.spanId,
      ...(e.title ? { title: e.title } : {})
    }));

  // Stats
  const actorIds = new Set(sorted.map((e) => e.actor.id));

  return {
    loops: allWarnings,
    failures,
    stats: {
      eventCount: sorted.length,
      actorCount: actorIds.size
    }
  };
}

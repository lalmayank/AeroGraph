import { sortTraceEventsDeterministic, type TraceEvent } from "@aerograph/contracts";

export type RecursiveToolWarning = {
  kind: "recursive_tool";
  severity: "low" | "medium" | "high";
  reason: string;
  spanIds: string[];
};

/** Normalizes tool input to a signature string (ignores attempt counts / incremental fields). */
function normalizeToolSignature(toolId: string, input: Record<string, unknown>): string {
  // Exclude numeric iteration fields (attempt, iteration, retry) from the signature
  // to detect tools called with equivalent non-counter inputs.
  const filtered: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    const lower = k.toLowerCase();
    if (lower === "attempt" || lower === "iteration" || lower === "retry" || lower === "count") continue;
    filtered[k] = v;
  }
  return `${toolId}:${JSON.stringify(filtered, Object.keys(filtered).sort())}`;
}

const RECURSIVE_TOOL_THRESHOLD = 3;

/**
 * Detect recursive tool usage: the same tool called with equivalent normalized inputs
 * more than the threshold number of times.
 */
export function detectRecursiveTools(events: readonly TraceEvent[]): RecursiveToolWarning[] {
  const sorted = sortTraceEventsDeterministic([...events]);

  // Group tool_call events by normalized signature
  const groups = new Map<string, Array<{ spanId: string; occurredAt: string }>>();

  for (const event of sorted) {
    if (event.kind !== "tool_call") continue;
    const tc = event as Extract<TraceEvent, { kind: "tool_call" }>;
    const sig = normalizeToolSignature(tc.actor.id, tc.payload.input as Record<string, unknown>);
    if (!groups.has(sig)) groups.set(sig, []);
    groups.get(sig)!.push({ spanId: event.spanId, occurredAt: event.occurredAt });
  }

  const warnings: RecursiveToolWarning[] = [];

  for (const [sig, entries] of groups) {
    if (entries.length >= RECURSIVE_TOOL_THRESHOLD) {
      const count = entries.length;
      const severity: "low" | "medium" | "high" =
        count >= 8 ? "high" : count >= 5 ? "medium" : "low";

      // Deterministic: sort by occurredAt then spanId
      entries.sort((a, b) => {
        const t = a.occurredAt.localeCompare(b.occurredAt);
        return t !== 0 ? t : a.spanId.localeCompare(b.spanId);
      });

      warnings.push({
        kind: "recursive_tool",
        severity,
        reason: `Tool called ${count} times with equivalent input signature (${sig.slice(0, 60)})`,
        spanIds: entries.map((e) => e.spanId)
      });
    }
  }

  // Deterministic ordering: by first spanId's occurredAt
  warnings.sort((a, b) => {
    const aSpan = sorted.find((e) => e.spanId === a.spanIds[0]);
    const bSpan = sorted.find((e) => e.spanId === b.spanIds[0]);
    const t = (aSpan?.occurredAt ?? "").localeCompare(bSpan?.occurredAt ?? "");
    if (t !== 0) return t;
    return (a.spanIds[0] ?? "").localeCompare(b.spanIds[0] ?? "");
  });

  return warnings;
}

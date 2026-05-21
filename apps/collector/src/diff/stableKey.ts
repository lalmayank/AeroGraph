import type { TraceEvent } from "@afr/contracts";

/**
 * Produces a deterministic, schema-only stable key for a trace event.
 * Used by the Myers diff engine to compare event sequences.
 *
 * Key format: `{kind}:{actorId}:{spanId-prefix-8}`
 *
 * - Does NOT include `occurredAt` (avoids timestamp noise on replayed/copied events).
 * - Does NOT include payload content (allows payload-level diff as a secondary step).
 * - Uses spanId prefix for sequence identity (copied fork prefix events share spanIds).
 */
export function stableKey(event: Pick<TraceEvent, "kind" | "actor" | "spanId">): string {
  const actorId = event.actor.id;
  // Use full spanId — fork prefix events retain their original spanIds,
  // so same spanId = same span in both traces (shared prefix).
  return `${event.kind}:${actorId}:${event.spanId}`;
}

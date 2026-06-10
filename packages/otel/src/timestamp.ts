/**
 * packages/otel/src/timestamp.ts
 *
 * Timestamp conversion utilities between AeroGraph (ISO 8601) and
 * OTLP (Unix epoch nanoseconds as decimal string).
 *
 * Algorithm (both languages must match exactly):
 *
 * isoToUnixNano:
 *   1. Parse ISO 8601 string to milliseconds since epoch (Date.parse)
 *   2. Convert to BigInt to avoid float precision loss
 *   3. Multiply by 1,000,000 to get nanoseconds
 *   4. Serialize as decimal string
 *
 * unixNanoToIso:
 *   1. Parse decimal string to BigInt
 *   2. Extract milliseconds: nano / 1_000_000n
 *   3. Create Date from milliseconds
 *   4. Serialize as ISO 8601 (Z-terminated, millisecond precision)
 *
 * Both functions mirror python/aerograph-otel/src/aerograph_otel/timestamp.py exactly.
 */

/**
 * Convert an ISO 8601 datetime string to a Unix nanosecond decimal string.
 * Uses BigInt arithmetic to preserve nanosecond precision without float error.
 *
 * @param iso - ISO 8601 string, e.g. "2026-06-09T18:00:00.000Z"
 * @returns nanoseconds since Unix epoch as decimal string
 */
export function isoToUnixNano(iso: string): string {
  const ms = Date.parse(iso);
  if (isNaN(ms)) {
    throw new Error(`Invalid ISO 8601 string: ${iso}`);
  }
  // Multiply by 1,000,000 to convert ms → ns
  const ns = BigInt(ms) * 1_000_000n;
  return ns.toString();
}

/**
 * Convert a Unix nanosecond decimal string to an ISO 8601 datetime string.
 * Returns a Z-terminated string with millisecond precision.
 *
 * @param nano - nanoseconds since Unix epoch as decimal string
 * @returns ISO 8601 string, e.g. "2026-06-09T18:00:00.000Z"
 */
export function unixNanoToIso(nano: string): string {
  const ns = BigInt(nano);
  // Convert ns → ms (floor division)
  const ms = Number(ns / 1_000_000n);
  const date = new Date(ms);
  return date.toISOString();
}

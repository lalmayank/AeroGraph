/**
 * packages/otel/src/export.ts
 *
 * AeroGraph TraceEvent → OTLP span/request conversion.
 *
 * Functions:
 *   exportEventToOtlpSpan(event)         — single TraceEvent → OtlpSpan
 *   exportEventsToOtlp(events, options?) — TraceEvent[] → OtlpExportRequest
 *
 * Rules:
 *   - Deterministic: same input always produces same output
 *   - traceId, spanId, parentSpanId passed through unchanged (hex format preserved)
 *   - occurredAt → startTimeUnixNano; endTimeUnixNano = startTimeUnixNano + 1ms
 *   - status: "ok" → code 1, "error" → code 2
 *   - links preserved as OtlpLink[] with aerograph.link.rel attribute
 *
 * Mirrors export.py in Python exactly.
 */

import type { TraceEvent } from "@aerograph/contracts";
import { sortTraceEventsDeterministic } from "@aerograph/contracts";
import { isoToUnixNano } from "./timestamp.js";
import { buildAttributesFromEvent, exportLinksToOtlp, getSpanKindInt, getSpanNameForKind, STATUS_CODE } from "./mapping.js";
import type { OtlpExportRequest, OtlpSpan } from "./otlp-schema.js";

const PACKAGE_VERSION = "0.1.0";
const ONE_MS_IN_NS = 1_000_000n;

export interface ExportOptions {
  /** Service name to use in the OTLP resource attributes. Default: "aerograph-agent" */
  serviceName?: string;
  /** Instrumentation scope name. Default: "@aerograph/otel" */
  scopeName?: string;
  /** Instrumentation scope version. Default: package version */
  scopeVersion?: string;
}

/**
 * Export a single AeroGraph TraceEvent to an OTLP-compatible span structure.
 * Deterministic: same input always produces the same output.
 */
export function exportEventToOtlpSpan(event: TraceEvent): OtlpSpan {
  const startNano = isoToUnixNano(event.occurredAt);
  const endNano = (BigInt(startNano) + ONE_MS_IN_NS).toString();

  const span: OtlpSpan = {
    traceId: event.traceId,
    spanId: event.spanId,
    name: getSpanNameForKind(event.kind),
    kind: getSpanKindInt(event.kind),
    startTimeUnixNano: startNano,
    endTimeUnixNano: endNano,
    status: {
      code: event.status === "ok" ? STATUS_CODE.OK : STATUS_CODE.ERROR,
      ...(event.status === "error" && event.kind === "error"
        ? { message: (event.payload as { message: string }).message }
        : {}),
    },
    attributes: buildAttributesFromEvent(event),
    links: exportLinksToOtlp(event.links, event.traceId),
  };

  // parentSpanId: only include if not null
  if (event.parentSpanId !== null) {
    span.parentSpanId = event.parentSpanId;
  }

  return span;
}

/**
 * Export an array of TraceEvents to a complete OtlpExportRequest envelope.
 * Events are sorted deterministically before export.
 */
export function exportEventsToOtlp(
  events: TraceEvent[],
  options: ExportOptions = {}
): OtlpExportRequest {
  const {
    serviceName = "aerograph-agent",
    scopeName = "@aerograph/otel",
    scopeVersion = PACKAGE_VERSION,
  } = options;

  const sorted = sortTraceEventsDeterministic(events);
  const spans = sorted.map(exportEventToOtlpSpan);

  return {
    resourceSpans: [
      {
        resource: {
          attributes: [
            {
              key: "service.name",
              value: { stringValue: serviceName },
            },
          ],
        },
        scopeSpans: [
          {
            scope: {
              name: scopeName,
              version: scopeVersion,
            },
            spans,
          },
        ],
      },
    ],
  };
}

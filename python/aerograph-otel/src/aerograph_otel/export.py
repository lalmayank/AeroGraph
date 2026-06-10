"""
python/aerograph-otel/src/aerograph_otel/export.py

AeroGraph TraceEvent → OTLP span/request conversion.
Mirrors export.ts in TypeScript exactly.

Functions:
    export_event_to_otlp_span(event)             — single TraceEvent → OtlpSpan dict
    export_events_to_otlp(events, *, ...)        — list[TraceEvent] → OtlpExportRequest dict

Rules (identical to TypeScript):
    - Deterministic: same input always produces same output
    - traceId, spanId, parentSpanId passed through unchanged
    - occurredAt → startTimeUnixNano; endTimeUnixNano = startTimeUnixNano + 1_000_000 (1ms)
    - status "ok" → code 1, "error" → code 2
    - links preserved with aerograph.link.rel attribute
"""

from __future__ import annotations

from typing import Any

from aerograph_otel import __version__
from aerograph_otel.mapping import (
    STATUS_CODE_ERROR,
    STATUS_CODE_OK,
    build_attributes_from_event,
    export_links_to_otlp,
    get_span_kind_for_kind,
    get_span_name_for_kind,
)
from aerograph_otel.timestamp import iso_to_unix_nano

_ONE_MS_IN_NS = 1_000_000


def _sort_events_deterministic(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Sort events deterministically matching sortTraceEventsDeterministic in contracts.
    Primary: occurredAt, Secondary: spanId, Tertiary: kind.
    """
    return sorted(
        events,
        key=lambda e: (e["occurredAt"], e["spanId"], e["kind"]),
    )


def export_event_to_otlp_span(event: dict[str, Any]) -> dict[str, Any]:
    """
    Convert a single AeroGraph TraceEvent dict to an OTLP span dict.
    Deterministic: same input always produces the same output.

    Args:
        event: A dict representing a valid AeroGraph TraceEvent.

    Returns:
        A dict matching the OtlpSpan structure.
    """
    start_nano_str = iso_to_unix_nano(event["occurredAt"])
    start_nano = int(start_nano_str)
    end_nano_str = str(start_nano + _ONE_MS_IN_NS)

    kind = event["kind"]
    status_code = STATUS_CODE_OK if event["status"] == "ok" else STATUS_CODE_ERROR

    # Build status dict
    status: dict[str, Any] = {"code": status_code}
    if kind == "error" and event["status"] == "error":
        payload = event.get("payload", {})
        status["message"] = payload.get("message", "")

    span: dict[str, Any] = {
        "traceId": event["traceId"],
        "spanId": event["spanId"],
        "name": get_span_name_for_kind(kind),
        "kind": get_span_kind_for_kind(kind),
        "startTimeUnixNano": start_nano_str,
        "endTimeUnixNano": end_nano_str,
        "status": status,
        "attributes": build_attributes_from_event(event),
        "links": export_links_to_otlp(event.get("links", []), event["traceId"]),
    }

    # parentSpanId: only include if not null/None/missing
    parent = event.get("parentSpanId")
    if parent is not None:
        span["parentSpanId"] = parent

    return span


def export_events_to_otlp(
    events: list[dict[str, Any]],
    *,
    service_name: str = "aerograph-agent",
    scope_name: str = "aerograph-otel",
    scope_version: str = __version__,
) -> dict[str, Any]:
    """
    Convert a list of AeroGraph TraceEvent dicts to a complete OTLP/JSON export request dict.
    Events are sorted deterministically before export.

    Args:
        events: List of AeroGraph TraceEvent dicts.
        service_name: Service name for the OTLP resource. Default: "aerograph-agent".
        scope_name: Instrumentation scope name. Default: "aerograph-otel".
        scope_version: Instrumentation scope version. Default: package version.

    Returns:
        A dict matching the OtlpExportRequest structure (JSON-serializable).
    """
    sorted_events = _sort_events_deterministic(events)
    spans = [export_event_to_otlp_span(e) for e in sorted_events]

    return {
        "resourceSpans": [
            {
                "resource": {
                    "attributes": [
                        {"key": "service.name", "value": {"stringValue": service_name}},
                    ]
                },
                "scopeSpans": [
                    {
                        "scope": {
                            "name": scope_name,
                            "version": scope_version,
                        },
                        "spans": spans,
                    }
                ],
            }
        ]
    }

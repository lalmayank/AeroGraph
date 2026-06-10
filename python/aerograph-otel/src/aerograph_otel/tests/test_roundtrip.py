import json
import os
from aerograph_otel.export import export_event_to_otlp_span
from aerograph_otel.import_ import import_otlp_span_to_event

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "../../../../../specs/004-otel-bridge/fixtures")
EVENT_KINDS = [
    "prompt", "response", "tool_call", "tool_result", "handoff",
    "error", "note", "retriever", "checkpoint", "state_snapshot"
]

def test_preserves_topology_fields():
    ctx = {"defaultActorId": "unknown"}
    for kind in EVENT_KINDS:
        fixture_path = os.path.abspath(os.path.join(FIXTURES_DIR, f"{kind}_event.json"))
        with open(fixture_path, "r", encoding="utf-8") as f:
            original_event = json.load(f)
            
        otlp_span = export_event_to_otlp_span(original_event)
        imported_event = import_otlp_span_to_event(otlp_span, ctx)
        
        assert imported_event["traceId"] == original_event["traceId"]
        assert imported_event["spanId"] == original_event["spanId"]
        assert imported_event.get("parentSpanId") == original_event.get("parentSpanId")
        assert imported_event["kind"] == original_event["kind"]
        assert imported_event["actor"]["id"] == original_event["actor"]["id"]
        assert imported_event["actor"]["kind"] == original_event["actor"]["kind"]
        assert imported_event["status"] == original_event["status"]
        assert imported_event["occurredAt"] == original_event["occurredAt"]
        assert imported_event.get("links", []) == original_event.get("links", [])

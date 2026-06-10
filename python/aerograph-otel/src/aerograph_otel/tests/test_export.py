"""
python/aerograph-otel/src/aerograph_otel/tests/test_export.py

Unit tests for export_event_to_otlp_span for all 10 event kinds.
Mirrors export.test.ts in TypeScript.
"""

import json
import os
import pytest

from aerograph_otel.export import export_event_to_otlp_span, export_events_to_otlp

FIXTURE_DIR = os.path.join(
    os.path.dirname(__file__),
    "../../../../../specs/004-otel-bridge/fixtures"
)


def load_fixture(name: str) -> dict:
    with open(os.path.join(FIXTURE_DIR, name), "r", encoding="utf-8") as f:
        return json.load(f)


def find_attr(attrs: list[dict], key: str):
    return next((a["value"] for a in attrs if a["key"] == key), None)


class TestExportEventToOtlpSpan:
    def test_prompt_topology_fields(self):
        event = load_fixture("prompt_event.json")
        span = export_event_to_otlp_span(event)

        assert span["traceId"] == "5b8efff798038103d269b633813fc60c"
        assert span["spanId"] == "eee19b7ec3c1b174"
        assert "parentSpanId" not in span  # null → omitted
        assert span["name"] == "gen_ai.chat"
        assert span["kind"] == 3  # CLIENT
        assert span["status"]["code"] == 1  # OK
        assert span["startTimeUnixNano"] == "1781028000000000000"
        assert span["endTimeUnixNano"] == "1781028000001000000"

    def test_response_includes_parent_and_links(self):
        event = load_fixture("response_event.json")
        span = export_event_to_otlp_span(event)

        assert span["spanId"] == "aae19b7ec3c1b175"
        assert span["parentSpanId"] == "eee19b7ec3c1b174"
        assert span["name"] == "gen_ai.response"
        assert span["kind"] == 3  # CLIENT
        assert len(span["links"]) == 1
        assert span["links"][0]["attributes"][0]["value"] == {"stringValue": "follows"}

        token_attr = find_attr(span["attributes"], "aerograph.response.token_count")
        assert token_attr == {"intValue": 10}

    def test_tool_call_client_kind(self):
        event = load_fixture("tool_call_event.json")
        span = export_event_to_otlp_span(event)

        assert span["name"] == "gen_ai.tool.call"
        assert span["kind"] == 3  # CLIENT
        input_attr = find_attr(span["attributes"], "aerograph.tool_call.input")
        assert input_attr == {"stringValue": '{"query":"Paris France capital"}'}

    def test_tool_result_internal_kind(self):
        event = load_fixture("tool_result_event.json")
        span = export_event_to_otlp_span(event)
        assert span["name"] == "gen_ai.tool.result"
        assert span["kind"] == 1  # INTERNAL

    def test_handoff_from_to_agents(self):
        event = load_fixture("handoff_event.json")
        span = export_event_to_otlp_span(event)

        assert span["name"] == "gen_ai.agent.handoff"
        assert span["kind"] == 1  # INTERNAL
        assert find_attr(span["attributes"], "aerograph.handoff.from_agent_id") == {"stringValue": "agent-001"}
        assert find_attr(span["attributes"], "aerograph.handoff.to_agent_id") == {"stringValue": "agent-002"}

    def test_error_status_code_2(self):
        event = load_fixture("error_event.json")
        span = export_event_to_otlp_span(event)

        assert span["name"] == "aerograph.error"
        assert span["kind"] == 1  # INTERNAL
        assert span["status"]["code"] == 2  # ERROR
        assert span["status"]["message"] == "Network timeout while calling external API"

    def test_note_internal_with_payload(self):
        event = load_fixture("note_event.json")
        span = export_event_to_otlp_span(event)

        assert span["name"] == "aerograph.note"
        assert span["kind"] == 1  # INTERNAL
        payload_attr = find_attr(span["attributes"], "aerograph.note.payload")
        assert payload_attr is not None

    def test_retriever_client_with_document_count(self):
        event = load_fixture("retriever_event.json")
        span = export_event_to_otlp_span(event)

        assert span["name"] == "gen_ai.retrieve"
        assert span["kind"] == 3  # CLIENT
        count_attr = find_attr(span["attributes"], "aerograph.retriever.document_count")
        assert count_attr == {"intValue": 2}

    def test_checkpoint_internal_with_id(self):
        event = load_fixture("checkpoint_event.json")
        span = export_event_to_otlp_span(event)

        assert span["name"] == "aerograph.checkpoint"
        assert span["kind"] == 1  # INTERNAL
        id_attr = find_attr(span["attributes"], "aerograph.checkpoint.id")
        assert id_attr == {"stringValue": "chk-001"}

    def test_state_snapshot_internal_with_node(self):
        event = load_fixture("state_snapshot_event.json")
        span = export_event_to_otlp_span(event)

        assert span["name"] == "aerograph.state_snapshot"
        assert span["kind"] == 1  # INTERNAL
        node_attr = find_attr(span["attributes"], "aerograph.state_snapshot.node_name")
        assert node_attr == {"stringValue": "respond"}


class TestExportEventsToOtlp:
    def test_wraps_in_resource_spans_envelope(self):
        event = load_fixture("prompt_event.json")
        result = export_events_to_otlp([event], service_name="test-service")

        assert len(result["resourceSpans"]) == 1
        resource_attrs = result["resourceSpans"][0]["resource"]["attributes"]
        assert resource_attrs[0] == {
            "key": "service.name",
            "value": {"stringValue": "test-service"}
        }
        spans = result["resourceSpans"][0]["scopeSpans"][0]["spans"]
        assert len(spans) == 1

    def test_sorts_events_deterministically(self):
        event1 = load_fixture("prompt_event.json")
        event2 = load_fixture("response_event.json")

        # Deliberately out of order
        result = export_events_to_otlp([event2, event1])
        spans = result["resourceSpans"][0]["scopeSpans"][0]["spans"]

        # Should be ordered by occurredAt (prompt before response)
        assert spans[0]["spanId"] == "eee19b7ec3c1b174"  # prompt
        assert spans[1]["spanId"] == "aae19b7ec3c1b175"  # response

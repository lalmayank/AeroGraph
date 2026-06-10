"""
python/aerograph-otel/src/aerograph_otel/tests/test_mapping.py

Unit tests for get_span_name_for_kind, get_span_kind_for_kind, build_attributes_from_event.
Mirrors test_mapping.ts (mapping.test.ts) in TypeScript.
"""

import json
import os
import pytest

from aerograph_otel.mapping import (
    SPAN_KIND_CLIENT,
    SPAN_KIND_INTERNAL,
    build_attributes_from_event,
    export_links_to_otlp,
    get_span_kind_for_kind,
    get_span_name_for_kind,
)

FIXTURE_DIR = os.path.join(
    os.path.dirname(__file__),
    "../../../../../specs/004-otel-bridge/fixtures"
)


def load_fixture(name: str) -> dict:
    with open(os.path.join(FIXTURE_DIR, name), "r", encoding="utf-8") as f:
        return json.load(f)


class TestGetSpanNameForKind:
    cases = [
        ("prompt",         "gen_ai.chat"),
        ("response",       "gen_ai.response"),
        ("tool_call",      "gen_ai.tool.call"),
        ("tool_result",    "gen_ai.tool.result"),
        ("handoff",        "gen_ai.agent.handoff"),
        ("error",          "aerograph.error"),
        ("note",           "aerograph.note"),
        ("retriever",      "gen_ai.retrieve"),
        ("checkpoint",     "aerograph.checkpoint"),
        ("state_snapshot", "aerograph.state_snapshot"),
    ]

    @pytest.mark.parametrize("kind,expected", cases)
    def test_mapping(self, kind: str, expected: str):
        assert get_span_name_for_kind(kind) == expected

    def test_unknown_kind_raises(self):
        with pytest.raises(ValueError):
            get_span_name_for_kind("unknown_kind")


class TestGetSpanKindForKind:
    def test_prompt_is_client(self):
        assert get_span_kind_for_kind("prompt") == SPAN_KIND_CLIENT

    def test_response_is_client(self):
        assert get_span_kind_for_kind("response") == SPAN_KIND_CLIENT

    def test_tool_call_is_client(self):
        assert get_span_kind_for_kind("tool_call") == SPAN_KIND_CLIENT

    def test_retriever_is_client(self):
        assert get_span_kind_for_kind("retriever") == SPAN_KIND_CLIENT

    def test_tool_result_is_internal(self):
        assert get_span_kind_for_kind("tool_result") == SPAN_KIND_INTERNAL

    def test_handoff_is_internal(self):
        assert get_span_kind_for_kind("handoff") == SPAN_KIND_INTERNAL

    def test_error_is_internal(self):
        assert get_span_kind_for_kind("error") == SPAN_KIND_INTERNAL

    def test_note_is_internal(self):
        assert get_span_kind_for_kind("note") == SPAN_KIND_INTERNAL

    def test_checkpoint_is_internal(self):
        assert get_span_kind_for_kind("checkpoint") == SPAN_KIND_INTERNAL

    def test_state_snapshot_is_internal(self):
        assert get_span_kind_for_kind("state_snapshot") == SPAN_KIND_INTERNAL


class TestBuildAttributesFromEvent:
    def _find(self, attrs: list[dict], key: str):
        return next((a["value"] for a in attrs if a["key"] == key), None)

    def test_prompt_has_universal_and_payload_attrs(self):
        event = load_fixture("prompt_event.json")
        attrs = build_attributes_from_event(event)

        assert self._find(attrs, "aerograph.kind") == {"stringValue": "prompt"}
        assert self._find(attrs, "aerograph.actor.id") == {"stringValue": "agent-001"}
        assert self._find(attrs, "aerograph.actor.kind") == {"stringValue": "agent"}
        assert self._find(attrs, "aerograph.actor.name") == {"stringValue": "PrimaryAgent"}
        assert self._find(attrs, "aerograph.status") == {"stringValue": "ok"}
        assert self._find(attrs, "aerograph.prompt.text") == {"stringValue": "What is the capital of France?"}
        assert self._find(attrs, "gen_ai.operation.name") == {"stringValue": "chat"}

    def test_response_has_streaming_telemetry(self):
        event = load_fixture("response_event.json")
        attrs = build_attributes_from_event(event)

        assert self._find(attrs, "aerograph.kind") == {"stringValue": "response"}
        assert self._find(attrs, "aerograph.response.text") == {"stringValue": "The capital of France is Paris."}
        assert self._find(attrs, "aerograph.response.time_to_first_token_ms") == {"doubleValue": 120.5}
        assert self._find(attrs, "aerograph.response.token_count") == {"intValue": 10}

    def test_tool_call_has_json_input(self):
        event = load_fixture("tool_call_event.json")
        attrs = build_attributes_from_event(event)

        assert self._find(attrs, "aerograph.tool_call.input") == {
            "stringValue": '{"query":"Paris France capital"}'
        }
        assert self._find(attrs, "gen_ai.tool.name") == {"stringValue": "web-search"}

    def test_error_has_message_and_type(self):
        event = load_fixture("error_event.json")
        attrs = build_attributes_from_event(event)

        assert self._find(attrs, "aerograph.error.message") == {
            "stringValue": "Network timeout while calling external API"
        }
        assert self._find(attrs, "error.type") == {"stringValue": "aerograph.error"}

    def test_retriever_has_query_and_count(self):
        event = load_fixture("retriever_event.json")
        attrs = build_attributes_from_event(event)

        assert self._find(attrs, "aerograph.retriever.query") == {"stringValue": "capital of France"}
        assert self._find(attrs, "aerograph.retriever.document_count") == {"intValue": 2}

    def test_state_snapshot_has_node_and_hash(self):
        event = load_fixture("state_snapshot_event.json")
        attrs = build_attributes_from_event(event)

        assert self._find(attrs, "aerograph.state_snapshot.node_name") == {"stringValue": "respond"}
        assert self._find(attrs, "aerograph.state_snapshot.state_hash") == {
            "stringValue": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6"
        }


class TestExportLinksToOtlp:
    def test_converts_follows_link(self):
        links = [{"rel": "follows", "spanId": "eee19b7ec3c1b174"}]
        result = export_links_to_otlp(links, "5b8efff798038103d269b633813fc60c")

        assert len(result) == 1
        assert result[0]["traceId"] == "5b8efff798038103d269b633813fc60c"
        assert result[0]["spanId"] == "eee19b7ec3c1b174"
        assert result[0]["attributes"][0] == {
            "key": "aerograph.link.rel",
            "value": {"stringValue": "follows"}
        }

    def test_empty_links(self):
        assert export_links_to_otlp([], "5b8efff798038103d269b633813fc60c") == []

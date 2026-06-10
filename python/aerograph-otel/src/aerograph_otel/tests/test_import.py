import pytest
from aerograph_otel.import_ import import_otlp_span_to_event
from aerograph_otel.constants import AeroGraphAttrs
from aerograph_otel.mapping import SPAN_KIND_INTERNAL, SPAN_KIND_CLIENT, STATUS_CODE_ERROR

def test_lossless_roundtrip_path():
    ctx = {"defaultActorId": "def"}
    span = {
        "traceId": "5b8efff798038103d269b633813fc60c",
        "spanId": "eee19b7ec3c1b174",
        "name": "some.name",
        "startTimeUnixNano": "1000000000",
        "endTimeUnixNano": "2000000000",
        "kind": SPAN_KIND_INTERNAL,
        "attributes": [
            {"key": AeroGraphAttrs.KIND, "value": {"stringValue": "tool_result"}},
            {"key": AeroGraphAttrs.ACTOR_ID, "value": {"stringValue": "my-tool"}},
            {"key": AeroGraphAttrs.TOOL_RESULT_OUTPUT, "value": {"stringValue": '{"foo":"bar"}'}}
        ]
    }
    event = import_otlp_span_to_event(span, ctx)
    assert event["kind"] == "tool_result"
    assert event["actor"]["id"] == "my-tool"
    assert event["payload"] == {"output": {"foo": "bar"}}

def test_heuristic_path_gen_ai_chat():
    ctx = {"defaultActorId": "def"}
    span = {
        "traceId": "5b8efff798038103d269b633813fc60c",
        "spanId": "eee19b7ec3c1b174",
        "name": "gen_ai.chat",
        "startTimeUnixNano": "1000000000",
        "kind": SPAN_KIND_CLIENT,
        "attributes": []
    }
    event = import_otlp_span_to_event(span, ctx)
    assert event["kind"] == "response"
    assert event["actor"]["id"] == "def"

def test_heuristic_path_gen_ai_tool_call():
    ctx = {"defaultActorId": "def"}
    span = {
        "traceId": "5b8efff798038103d269b633813fc60c",
        "spanId": "eee19b7ec3c1b174",
        "name": "some.name",
        "startTimeUnixNano": "1000000000",
        "kind": SPAN_KIND_CLIENT,
        "attributes": [
            {"key": "gen_ai.tool.name", "value": {"stringValue": "calc"}},
            {"key": "gen_ai.tool.call.id", "value": {"stringValue": "123"}}
        ]
    }
    event = import_otlp_span_to_event(span, ctx)
    assert event["kind"] == "tool_call"

def test_heuristic_path_error():
    ctx = {"defaultActorId": "def"}
    span = {
        "traceId": "5b8efff798038103d269b633813fc60c",
        "spanId": "eee19b7ec3c1b174",
        "name": "some.name",
        "startTimeUnixNano": "1000000000",
        "kind": SPAN_KIND_INTERNAL,
        "status": {"code": STATUS_CODE_ERROR, "message": "failed"},
        "attributes": []
    }
    event = import_otlp_span_to_event(span, ctx)
    assert event["kind"] == "error"
    assert event["status"] == "error"

def test_heuristic_path_note():
    ctx = {"defaultActorId": "def"}
    span = {
        "traceId": "5b8efff798038103d269b633813fc60c",
        "spanId": "eee19b7ec3c1b174",
        "name": "my.custom.span",
        "startTimeUnixNano": "1000000000",
        "kind": SPAN_KIND_INTERNAL,
        "attributes": [
            {"key": "my.attr", "value": {"stringValue": "val"}}
        ]
    }
    event = import_otlp_span_to_event(span, ctx)
    assert event["kind"] == "note"
    assert event["payload"] == {
        "otel_span_name": "my.custom.span",
        "my.attr": "val"
    }

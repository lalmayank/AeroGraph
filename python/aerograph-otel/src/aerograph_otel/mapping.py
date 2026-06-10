"""
python/aerograph-otel/src/aerograph_otel/mapping.py

Semantic mapping between AeroGraph event kinds and OTel span metadata.
Mirrors mapping.ts in TypeScript exactly.

Functions:
    get_span_name_for_kind(kind)          — AeroGraph kind → OTLP span name
    get_span_kind_for_kind(kind)          — AeroGraph kind → OTLP span kind integer
    build_attributes_from_event(event)    — AeroGraph event dict → OTLP attributes list
    export_links_to_otlp(links, trace_id) — AeroGraph links → OTel links list
"""

from __future__ import annotations

import json
from typing import Any

from aerograph_otel.constants import AeroGraphAttrs

# OTel span kind enum values
SPAN_KIND_UNSPECIFIED = 0
SPAN_KIND_INTERNAL = 1
SPAN_KIND_SERVER = 2
SPAN_KIND_CLIENT = 3
SPAN_KIND_PRODUCER = 4
SPAN_KIND_CONSUMER = 5

# OTel status code enum values
STATUS_CODE_UNSET = 0
STATUS_CODE_OK = 1
STATUS_CODE_ERROR = 2

# Mapping: AeroGraph kind → OTLP span name
_KIND_TO_SPAN_NAME: dict[str, str] = {
    "prompt":         "gen_ai.chat",
    "response":       "gen_ai.response",
    "tool_call":      "gen_ai.tool.call",
    "tool_result":    "gen_ai.tool.result",
    "handoff":        "gen_ai.agent.handoff",
    "error":          "aerograph.error",
    "note":           "aerograph.note",
    "retriever":      "gen_ai.retrieve",
    "checkpoint":     "aerograph.checkpoint",
    "state_snapshot": "aerograph.state_snapshot",
}

# Mapping: AeroGraph kind → OTLP span kind integer
_KIND_TO_SPAN_KIND: dict[str, int] = {
    "prompt":         SPAN_KIND_CLIENT,
    "response":       SPAN_KIND_CLIENT,
    "tool_call":      SPAN_KIND_CLIENT,
    "tool_result":    SPAN_KIND_INTERNAL,
    "handoff":        SPAN_KIND_INTERNAL,
    "error":          SPAN_KIND_INTERNAL,
    "note":           SPAN_KIND_INTERNAL,
    "retriever":      SPAN_KIND_CLIENT,
    "checkpoint":     SPAN_KIND_INTERNAL,
    "state_snapshot": SPAN_KIND_INTERNAL,
}


def get_span_name_for_kind(kind: str) -> str:
    """Map an AeroGraph event kind to the OTLP span name."""
    try:
        return _KIND_TO_SPAN_NAME[kind]
    except KeyError:
        raise ValueError(f"Unknown AeroGraph event kind: {kind!r}")


def get_span_kind_for_kind(kind: str) -> int:
    """Map an AeroGraph event kind to the OTLP span kind integer."""
    try:
        return _KIND_TO_SPAN_KIND[kind]
    except KeyError:
        raise ValueError(f"Unknown AeroGraph event kind: {kind!r}")


def _str_attr(key: str, value: str) -> dict[str, Any]:
    return {"key": key, "value": {"stringValue": value}}


def _int_attr(key: str, value: int) -> dict[str, Any]:
    return {"key": key, "value": {"intValue": value}}


def _double_attr(key: str, value: float) -> dict[str, Any]:
    return {"key": key, "value": {"doubleValue": value}}


def build_attributes_from_event(event: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Build the OTLP attributes list for a given AeroGraph TraceEvent dict.

    Attribute order is deterministic: universal first, kind-specific second.
    Mirrors buildAttributesFromEvent in TypeScript exactly.
    """
    attrs: list[dict[str, Any]] = []
    kind = event["kind"]
    actor = event["actor"]
    payload = event.get("payload", {})

    # Universal attributes
    attrs.append(_str_attr(AeroGraphAttrs.SCHEMA_VERSION, event["schemaVersion"]))
    attrs.append(_str_attr(AeroGraphAttrs.KIND, kind))
    attrs.append(_str_attr(AeroGraphAttrs.ACTOR_ID, actor["id"]))
    attrs.append(_str_attr(AeroGraphAttrs.ACTOR_KIND, actor["kind"]))
    if actor.get("name"):
        attrs.append(_str_attr(AeroGraphAttrs.ACTOR_NAME, actor["name"]))
    attrs.append(_str_attr(AeroGraphAttrs.STATUS, event["status"]))
    if event.get("title"):
        attrs.append(_str_attr(AeroGraphAttrs.TITLE, event["title"]))

    # Kind-specific payload attributes
    if kind == "prompt":
        attrs.append(_str_attr(AeroGraphAttrs.PROMPT_TEXT, payload["text"]))
        attrs.append(_str_attr("gen_ai.operation.name", "chat"))

    elif kind == "response":
        attrs.append(_str_attr(AeroGraphAttrs.RESPONSE_TEXT, payload["text"]))
        st = payload.get("streamingTelemetry")
        if st:
            attrs.append(_double_attr(AeroGraphAttrs.RESPONSE_TIME_TO_FIRST_TOKEN_MS, st["timeToFirstTokenMs"]))
            attrs.append(_double_attr(AeroGraphAttrs.RESPONSE_TOTAL_DURATION_MS, st["totalDurationMs"]))
            attrs.append(_double_attr(AeroGraphAttrs.RESPONSE_TOKENS_PER_SECOND, st["tokensPerSecond"]))
            attrs.append(_int_attr(AeroGraphAttrs.RESPONSE_TOKEN_COUNT, st["tokenCount"]))
        attrs.append(_str_attr("gen_ai.operation.name", "chat"))

    elif kind == "tool_call":
        attrs.append(_str_attr(AeroGraphAttrs.TOOL_CALL_INPUT, json.dumps(payload["input"], separators=(",", ":"))))
        attrs.append(_str_attr("gen_ai.tool.name", actor["id"]))

    elif kind == "tool_result":
        attrs.append(_str_attr(AeroGraphAttrs.TOOL_RESULT_OUTPUT, json.dumps(payload["output"], separators=(",", ":"))))
        attrs.append(_str_attr("gen_ai.tool.name", actor["id"]))

    elif kind == "handoff":
        attrs.append(_str_attr(AeroGraphAttrs.HANDOFF_FROM_AGENT_ID, payload["fromAgentId"]))
        attrs.append(_str_attr(AeroGraphAttrs.HANDOFF_TO_AGENT_ID, payload["toAgentId"]))
        if payload.get("reason"):
            attrs.append(_str_attr(AeroGraphAttrs.HANDOFF_REASON, payload["reason"]))
        attrs.append(_str_attr("gen_ai.agent.name", payload["toAgentId"]))

    elif kind == "error":
        attrs.append(_str_attr(AeroGraphAttrs.ERROR_MESSAGE, payload["message"]))
        attrs.append(_str_attr(AeroGraphAttrs.ERROR_DETAILS, json.dumps(payload.get("details", {}), separators=(",", ":"))))
        attrs.append(_str_attr("error.type", "aerograph.error"))

    elif kind == "note":
        attrs.append(_str_attr(AeroGraphAttrs.NOTE_PAYLOAD, json.dumps(payload, separators=(",", ":"))))

    elif kind == "retriever":
        attrs.append(_str_attr(AeroGraphAttrs.RETRIEVER_QUERY, payload["query"]))
        attrs.append(_int_attr(AeroGraphAttrs.RETRIEVER_DOCUMENT_COUNT, len(payload["documents"])))
        attrs.append(_str_attr("gen_ai.operation.name", "retrieve"))

    elif kind == "checkpoint":
        attrs.append(_str_attr(AeroGraphAttrs.CHECKPOINT_ID, payload["checkpointId"]))
        attrs.append(_str_attr(AeroGraphAttrs.CHECKPOINT_REASON, payload["reason"]))

    elif kind == "state_snapshot":
        attrs.append(_str_attr(AeroGraphAttrs.STATE_SNAPSHOT_NODE_NAME, payload["nodeName"]))
        attrs.append(_str_attr(AeroGraphAttrs.STATE_SNAPSHOT_STATE_HASH, payload["stateHash"]))

    return attrs


def export_links_to_otlp(links: list[dict[str, Any]], trace_id: str) -> list[dict[str, Any]]:
    """
    Convert AeroGraph TraceLink list to OTLP links list.
    Each link carries the aerograph.link.rel attribute.

    Mirrors exportLinksToOtlp in TypeScript exactly.
    """
    return [
        {
            "traceId": trace_id,
            "spanId": link["spanId"],
            "attributes": [
                _str_attr(AeroGraphAttrs.LINK_REL, link["rel"]),
            ],
        }
        for link in links
    ]

from typing import Any

from aerograph_otel.constants import AeroGraphAttrs
from aerograph_otel.mapping import extract_attribute_value, resolve_aerograph_kind_from_span
from aerograph_otel.timestamp import unix_nano_to_iso
import json

def import_otlp_span_to_event(span: dict[str, Any], ctx: dict[str, Any]) -> dict[str, Any]:
    kind = resolve_aerograph_kind_from_span(span)
    attrs = span.get("attributes", [])
    
    actor_id = extract_attribute_value(attrs, AeroGraphAttrs.ACTOR_ID) or ctx.get("defaultActorId", "unknown")
    actor_kind = extract_attribute_value(attrs, AeroGraphAttrs.ACTOR_KIND) or "system"
    actor_name = extract_attribute_value(attrs, AeroGraphAttrs.ACTOR_NAME)
    
    status_str = extract_attribute_value(attrs, AeroGraphAttrs.STATUS)
    if not status_str:
        status_code = span.get("status", {}).get("code", 0)
        status_str = "error" if status_code == 2 else "ok"
        
    title = extract_attribute_value(attrs, AeroGraphAttrs.TITLE)
    
    links = []
    for link in span.get("links", []):
        rel = extract_attribute_value(link.get("attributes", []), AeroGraphAttrs.LINK_REL) or "follows"
        links.append({
            "rel": rel,
            "spanId": link["spanId"]
        })
        
    base_event = {
        "schemaVersion": "1.0.0",
        "traceId": span["traceId"],
        "spanId": span["spanId"],
        "parentSpanId": span.get("parentSpanId") or None,
        "occurredAt": unix_nano_to_iso(span["startTimeUnixNano"]),
        "actor": {
            "kind": actor_kind,
            "id": actor_id
        },
        "status": status_str,
        "links": links
    }
    
    if actor_name:
        base_event["actor"]["name"] = actor_name
    if title:
        base_event["title"] = title
        
    payload = {}
    
    if kind == "prompt":
        payload["text"] = extract_attribute_value(attrs, AeroGraphAttrs.PROMPT_TEXT) or ""
    elif kind == "response":
        payload["text"] = extract_attribute_value(attrs, AeroGraphAttrs.RESPONSE_TEXT) or ""
        ttf = extract_attribute_value(attrs, AeroGraphAttrs.RESPONSE_TIME_TO_FIRST_TOKEN_MS)
        tdm = extract_attribute_value(attrs, AeroGraphAttrs.RESPONSE_TOTAL_DURATION_MS)
        tps = extract_attribute_value(attrs, AeroGraphAttrs.RESPONSE_TOKENS_PER_SECOND)
        tc = extract_attribute_value(attrs, AeroGraphAttrs.RESPONSE_TOKEN_COUNT)
        if ttf is not None and tdm is not None and tps is not None and tc is not None:
            payload["streamingTelemetry"] = {
                "timeToFirstTokenMs": float(ttf),
                "totalDurationMs": float(tdm),
                "tokensPerSecond": float(tps),
                "tokenCount": int(tc)
            }
    elif kind == "tool_call":
        input_str = extract_attribute_value(attrs, AeroGraphAttrs.TOOL_CALL_INPUT)
        payload["input"] = json.loads(input_str) if input_str else {}
    elif kind == "tool_result":
        output_str = extract_attribute_value(attrs, AeroGraphAttrs.TOOL_RESULT_OUTPUT)
        payload["output"] = json.loads(output_str) if output_str else {}
    elif kind == "handoff":
        payload["fromAgentId"] = extract_attribute_value(attrs, AeroGraphAttrs.HANDOFF_FROM_AGENT_ID) or ""
        payload["toAgentId"] = extract_attribute_value(attrs, AeroGraphAttrs.HANDOFF_TO_AGENT_ID) or ""
        reason = extract_attribute_value(attrs, AeroGraphAttrs.HANDOFF_REASON)
        if reason:
            payload["reason"] = reason
    elif kind == "error":
        msg = extract_attribute_value(attrs, AeroGraphAttrs.ERROR_MESSAGE) or span.get("status", {}).get("message") or "Unknown error"
        details_str = extract_attribute_value(attrs, AeroGraphAttrs.ERROR_DETAILS)
        payload["message"] = msg
        payload["details"] = json.loads(details_str) if details_str else {}
    elif kind == "retriever":
        payload["query"] = extract_attribute_value(attrs, AeroGraphAttrs.RETRIEVER_QUERY) or ""
        payload["documents"] = []
    elif kind == "checkpoint":
        payload["checkpointId"] = extract_attribute_value(attrs, AeroGraphAttrs.CHECKPOINT_ID) or ""
        payload["reason"] = extract_attribute_value(attrs, AeroGraphAttrs.CHECKPOINT_REASON) or ""
    elif kind == "state_snapshot":
        payload["nodeName"] = extract_attribute_value(attrs, AeroGraphAttrs.STATE_SNAPSHOT_NODE_NAME) or ""
        payload["stateHash"] = extract_attribute_value(attrs, AeroGraphAttrs.STATE_SNAPSHOT_STATE_HASH) or ""
    else:  # note
        note_str = extract_attribute_value(attrs, AeroGraphAttrs.NOTE_PAYLOAD)
        if note_str:
            payload = json.loads(note_str)
        else:
            payload = {"otel_span_name": span.get("name", "")}
            for attr in attrs:
                k = attr.get("key")
                v_dict = attr.get("value", {})
                if "stringValue" in v_dict:
                    payload[k] = v_dict["stringValue"]
                elif "intValue" in v_dict:
                    payload[k] = v_dict["intValue"]
                elif "doubleValue" in v_dict:
                    payload[k] = v_dict["doubleValue"]
                elif "boolValue" in v_dict:
                    payload[k] = v_dict["boolValue"]
                    
    base_event["kind"] = kind
    base_event["payload"] = payload
    return base_event

def import_otlp_to_events(request: dict[str, Any], *, default_actor_id: str = "unknown", preserve_original_ids: bool = False) -> list[dict[str, Any]]:
    ctx = {
        "defaultActorId": default_actor_id,
        "preserveOriginalIds": preserve_original_ids
    }
    
    events = []
    for rs in request.get("resourceSpans", []):
        for ss in rs.get("scopeSpans", []):
            for span in ss.get("spans", []):
                events.append(import_otlp_span_to_event(span, ctx))
                
    events.sort(key=lambda e: e["occurredAt"])
    return events

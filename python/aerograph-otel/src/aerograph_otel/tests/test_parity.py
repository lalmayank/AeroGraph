"""
python/aerograph-otel/src/aerograph_otel/tests/test_parity.py

Parity tests: load fixtures from specs/004-otel-bridge/fixtures/,
run export_event_to_otlp_span, assert output matches expected_otlp/*.json exactly.

This is the cross-language parity gate: TS and Python must produce IDENTICAL
OTLP structures for the same canonical fixture inputs.

The TypeScript counterpart (parity.test.ts) reads the same fixtures and
asserts the same expected_otlp/*.json files.
"""

import json
import os
import pytest

from aerograph_otel.export import export_event_to_otlp_span

FIXTURE_DIR = os.path.join(
    os.path.dirname(__file__),
    "../../../../../specs/004-otel-bridge/fixtures"
)
EXPECTED_DIR = os.path.join(FIXTURE_DIR, "expected_otlp")


def load_fixture(name: str) -> dict:
    with open(os.path.join(FIXTURE_DIR, name), "r", encoding="utf-8") as f:
        return json.load(f)


def load_expected(name: str) -> dict:
    with open(os.path.join(EXPECTED_DIR, name), "r", encoding="utf-8") as f:
        return json.load(f)


def normalize_span(span: dict) -> dict:
    """
    Normalise an OtlpSpan for comparison.
    Removes empty/absent parentSpanId and sorts attributes by key.
    Mirrors normalizeSpan in parity.test.ts.
    """
    normalized = dict(span)

    # Remove parentSpanId if not present
    if "parentSpanId" not in normalized or normalized.get("parentSpanId") is None:
        normalized.pop("parentSpanId", None)

    # Sort attributes by key
    if "attributes" in normalized:
        normalized["attributes"] = sorted(normalized["attributes"], key=lambda a: a["key"])

    # Normalize links
    if "links" in normalized:
        if len(normalized["links"]) == 0:
            normalized.pop("links")
        else:
            normalized["links"] = sorted(normalized["links"], key=lambda l: l["spanId"])

    return normalized


FIXTURE_PAIRS = [
    ("prompt_event.json",         "prompt_span.json"),
    ("response_event.json",       "response_span.json"),
    ("tool_call_event.json",      "tool_call_span.json"),
    ("tool_result_event.json",    "tool_result_span.json"),
    ("handoff_event.json",        "handoff_span.json"),
    ("error_event.json",          "error_span.json"),
    ("note_event.json",           "note_span.json"),
    ("retriever_event.json",      "retriever_span.json"),
    ("checkpoint_event.json",     "checkpoint_span.json"),
    ("state_snapshot_event.json", "state_snapshot_span.json"),
]


class TestParityWithGoldenFixtures:
    @pytest.mark.parametrize("event_file,expected_file", FIXTURE_PAIRS)
    def test_export_matches_fixture(self, event_file: str, expected_file: str):
        """Export output must match the golden fixture exactly (field by field)."""
        event = load_fixture(event_file)
        actual = export_event_to_otlp_span(event)
        expected = load_expected(expected_file)

        norm_actual = normalize_span(actual)
        norm_expected = normalize_span(expected)

        # Topology fields
        assert norm_actual["traceId"] == norm_expected["traceId"], f"traceId mismatch for {event_file}"
        assert norm_actual["spanId"] == norm_expected["spanId"], f"spanId mismatch for {event_file}"
        assert norm_actual["name"] == norm_expected["name"], f"name mismatch for {event_file}"
        assert norm_actual["kind"] == norm_expected["kind"], f"kind mismatch for {event_file}"
        assert norm_actual["startTimeUnixNano"] == norm_expected["startTimeUnixNano"], \
            f"startTimeUnixNano mismatch for {event_file}"
        assert norm_actual["endTimeUnixNano"] == norm_expected["endTimeUnixNano"], \
            f"endTimeUnixNano mismatch for {event_file}"

        # Status
        assert norm_actual["status"]["code"] == norm_expected["status"]["code"], \
            f"status.code mismatch for {event_file}"

        # Attributes (sorted)
        assert norm_actual["attributes"] == norm_expected["attributes"], \
            f"attributes mismatch for {event_file}\nActual: {norm_actual['attributes']}\nExpected: {norm_expected['attributes']}"

        # Links
        if "links" in norm_expected:
            assert norm_actual.get("links") == norm_expected["links"], \
                f"links mismatch for {event_file}"
        else:
            assert norm_actual.get("links") is None or norm_actual.get("links") == [], \
                f"unexpected links for {event_file}"

        # parentSpanId
        if "parentSpanId" in norm_expected:
            assert norm_actual.get("parentSpanId") == norm_expected["parentSpanId"]
        else:
            assert "parentSpanId" not in norm_actual

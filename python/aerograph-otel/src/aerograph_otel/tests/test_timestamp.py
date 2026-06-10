"""
python/aerograph-otel/src/aerograph_otel/tests/test_timestamp.py

Unit tests for iso_to_unix_nano and unix_nano_to_iso.
Assertions mirror timestamp.test.ts in TypeScript exactly.
Both suites must pass with identical values for identical inputs.
"""

import pytest
from aerograph_otel.timestamp import iso_to_unix_nano, unix_nano_to_iso


class TestIsoToUnixNano:
    def test_converts_known_timestamp(self):
        # 2026-06-09T18:00:00.000Z → 1781028000000000000 ns
        assert iso_to_unix_nano("2026-06-09T18:00:00.000Z") == "1781028000000000000"

    def test_handles_milliseconds(self):
        assert iso_to_unix_nano("2026-06-09T18:00:01.500Z") == "1781028001500000000"

    def test_handles_unix_epoch(self):
        assert iso_to_unix_nano("1970-01-01T00:00:00.000Z") == "0"

    def test_handles_midnight(self):
        assert iso_to_unix_nano("2026-06-09T00:00:00.000Z") == "1780963200000000000"

    def test_raises_on_invalid_string(self):
        with pytest.raises(ValueError):
            iso_to_unix_nano("not-a-date")

    def test_fixture_timestamp_prompt_event(self):
        # Canonical timestamp from prompt_event.json — must match TS
        result = iso_to_unix_nano("2026-06-09T18:00:00.000Z")
        assert result == "1781028000000000000"


class TestUnixNanoToIso:
    def test_round_trips_known_timestamp(self):
        assert unix_nano_to_iso("1781028000000000000") == "2026-06-09T18:00:00.000Z"

    def test_round_trips_milliseconds(self):
        assert unix_nano_to_iso("1781028001500000000") == "2026-06-09T18:00:01.500Z"

    def test_round_trips_unix_epoch(self):
        assert unix_nano_to_iso("0") == "1970-01-01T00:00:00.000Z"

    def test_round_trips_midnight(self):
        assert unix_nano_to_iso("1780963200000000000") == "2026-06-09T00:00:00.000Z"

    def test_produces_z_terminated_iso_format(self):
        result = unix_nano_to_iso("1781028000000000000")
        import re
        assert re.match(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$", result)


class TestRoundTrip:
    """iso → nano → iso must be lossless for millisecond-precision inputs."""

    cases = [
        "2026-06-09T18:00:00.000Z",
        "2026-06-09T18:00:01.000Z",
        "2026-06-09T18:00:00.123Z",
        "1970-01-01T00:00:00.000Z",
        "2026-06-09T00:00:00.000Z",
    ]

    @pytest.mark.parametrize("iso", cases)
    def test_round_trips(self, iso: str):
        nano = iso_to_unix_nano(iso)
        result = unix_nano_to_iso(nano)
        assert result == iso

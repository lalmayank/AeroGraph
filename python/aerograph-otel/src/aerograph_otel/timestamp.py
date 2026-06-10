"""
python/aerograph-otel/src/aerograph_otel/timestamp.py

Timestamp conversion utilities between AeroGraph (ISO 8601) and
OTLP (Unix epoch nanoseconds as decimal string).

Algorithm (identical to TypeScript timestamp.ts):

iso_to_unix_nano:
  1. Parse ISO 8601 string to a datetime with timezone info
  2. Convert to Unix epoch in milliseconds (integer arithmetic)
  3. Multiply by 1,000,000 to get nanoseconds
  4. Serialize as decimal string (no float representation)

unix_nano_to_iso:
  1. Parse decimal string to int (Python int handles arbitrary precision)
  2. Divide by 1,000,000 to get milliseconds (floor division)
  3. Convert to UTC datetime with millisecond precision
  4. Serialize as ISO 8601 (Z-terminated)

Both functions must produce identical output to timestamp.ts for the same input.
"""

from __future__ import annotations

from datetime import datetime, timezone


_NS_PER_MS = 1_000_000
_MS_PER_S = 1_000


def iso_to_unix_nano(iso: str) -> str:
    """
    Convert an ISO 8601 datetime string to a Unix nanosecond decimal string.

    Uses integer arithmetic to match BigInt semantics in TypeScript.

    Args:
        iso: ISO 8601 string, e.g. "2026-06-09T18:00:00.000Z"

    Returns:
        Nanoseconds since Unix epoch as decimal string.

    Raises:
        ValueError: If the string cannot be parsed as ISO 8601.
    """
    # Python's datetime.fromisoformat doesn't handle trailing 'Z' before 3.11
    normalized = iso.replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(normalized)
    except ValueError as exc:
        raise ValueError(f"Invalid ISO 8601 string: {iso!r}") from exc

    if dt.tzinfo is None:
        raise ValueError(f"ISO 8601 string must include timezone info: {iso!r}")

    # Compute milliseconds since epoch using integer arithmetic
    epoch = datetime(1970, 1, 1, tzinfo=timezone.utc)
    delta = dt - epoch
    # delta.total_seconds() can lose precision; use days + seconds + microseconds
    total_ms = (
        delta.days * 86400 * _MS_PER_S
        + delta.seconds * _MS_PER_S
        + delta.microseconds // 1000
    )
    ns = total_ms * _NS_PER_MS
    return str(ns)


def unix_nano_to_iso(nano: str) -> str:
    """
    Convert a Unix nanosecond decimal string to an ISO 8601 datetime string.

    Returns a Z-terminated string with millisecond precision,
    matching JavaScript's Date.toISOString() format.

    Args:
        nano: Nanoseconds since Unix epoch as decimal string.

    Returns:
        ISO 8601 string, e.g. "2026-06-09T18:00:00.000Z"
    """
    ns = int(nano)
    ms = ns // _NS_PER_MS
    # Convert ms to datetime with millisecond precision
    seconds, remainder_ms = divmod(ms, _MS_PER_S)
    dt = datetime.fromtimestamp(seconds, tz=timezone.utc)
    return dt.strftime(f"%Y-%m-%dT%H:%M:%S.{remainder_ms:03d}Z")

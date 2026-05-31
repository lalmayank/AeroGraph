# Deterministic Hashing Contract (Feature 003)

## Goal

Python and TypeScript MUST produce byte-for-byte identical `stateHash` outputs for equivalent JSON state objects.

## Ground truth (current platform behavior)

The canonical hashing function is implemented in `@aerograph/contracts` as `getDeterministicStateHash(state)`:

1. Recursively sort object keys ascending (arrays preserve order)
2. `serialized = JSON.stringify(sortedState) || ""`
3. Compute 32-bit FNV-1a over the JavaScript string’s UTF-16 code units via `charCodeAt(i)`
4. Return lowercase hex string padded to 8 characters

Feature 003 adopts this as the cross-language standard for backward compatibility.

## Canonicalization rules

### Object key ordering

- Treat JSON objects as key/value maps.
- Sort keys lexicographically ascending (byte-wise string ordering consistent with JavaScript `Array.prototype.sort()` on strings).
- Apply recursively to all nested objects.

### Arrays

- Preserve original ordering.
- Apply canonicalization to each element.

### Numbers

- Python MUST normalize non-finite floats to match JavaScript `JSON.stringify`:
  - `NaN`, `Infinity`, `-Infinity` → `null`
- For finite numbers, serialization MUST match JavaScript `JSON.stringify` output.
  - This must be verified via fixtures; if discrepancies are found for edge-case floats, Python must adopt a JS-compatible number formatting routine for those cases.

### Booleans / null

- `true`/`false` and `null` are serialized as in standard JSON.

### Strings / unicode

- Serialization MUST match JavaScript `JSON.stringify` behavior for escaping.
- Hashing MUST operate over UTF-16 code units (surrogate pairs are processed as two code units), matching `charCodeAt`.

### Non-JSON-native values

- Hashing helpers accept only JSON-compatible values.
- Adapters/SDK callers MUST convert or reject unsupported values (e.g., bytes, datetimes, custom classes) before hashing.

## FNV-1a 32-bit (exact)

Pseudo-spec:

- Initialize: `h = 0x811c9dc5`
- For each UTF-16 code unit `c` in `serialized`:
  - `h = h XOR c`
  - `h = (h * 0x01000193) >>> 0`  (unsigned 32-bit)
- Output: lowercase hex, width 8, left-padded with `0`

## Required tests

- Cross-language fixtures for representative states:
  - nested objects, arrays, unicode strings (including characters outside BMP), empty state
  - numeric edge cases: large ints, floats, -0.0, repeated decimals
  - non-finite numbers normalization
- Each fixture must assert:
  - canonical JSON string matches
  - hash output matches

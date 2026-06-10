# aerograph-otel

OpenTelemetry bridge for AeroGraph — export and import OTLP traces.

## Overview

`aerograph-otel` is a Python package that provides bidirectional conversion between
AeroGraph `TraceEvent` structures and OpenTelemetry Protocol (OTLP) span structures.

## Installation

```bash
pip install aerograph-otel
```

## Usage

```python
from aerograph_otel import export_event_to_otlp_span, export_events_to_otlp

# Export a single event
span = export_event_to_otlp_span(trace_event)

# Export a batch
otlp_request = export_events_to_otlp(events, service_name="my-agent")
```

## License

Apache-2.0

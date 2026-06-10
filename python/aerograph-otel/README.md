# aerograph-otel

The bidirectional OpenTelemetry (OTLP) bridge for AeroGraph in Python.

## Overview

AeroGraph stores cognitive observability traces using its own canonical append-only models. However, standard observability ecosystems (Jaeger, Datadog) expect W3C OpenTelemetry spans. This Python package seamlessly translates between the two paradigms with zero information loss.

## Installation

```bash
pip install aerograph-otel
```

*(Requires Python >= 3.10)*

## Usage: Exporting AeroGraph to OTLP

Convert an AeroGraph `TraceEvent` natively to an OpenTelemetry `OtlpSpan` format:

```python
from aerograph_otel import export_events_to_otlp
from aerograph_sdk import FlightRecorder

# 1. You have AeroGraph events
recorder = FlightRecorder(endpoint="http://localhost:4317", actor={"id": "app"})
event = recorder.prompt(text="Hello OTel")

# 2. Export to OTLP JSON Payload
otlp_payload = export_events_to_otlp([event], service_name="my-service")

# 3. You can now POST this JSON dictionary to Jaeger or the OTel Collector via HTTP
```

## Usage: Importing OTLP into AeroGraph

If you receive external OTLP spans (e.g. from an external LangChain instrumentation), you can parse them back into `TraceEvent` objects.

```python
from aerograph_otel import import_otlp_to_events

trace_events = import_otlp_to_events(
    incoming_otlp_json,
    default_actor_id="otlp-ingest",
    preserve_original_ids=True
)
```

## License
Apache-2.0

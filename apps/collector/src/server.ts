import express from "express";
import cors from "cors";
import { validateTraceEvent } from "@afr/contracts";
import { TraceStore } from "./store";

const PORT = Number(process.env.PORT ?? 4317);

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const store = new TraceStore();

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/v1/events", (req, res) => {
  try {
    const body = req.body;
    const events = Array.isArray(body) ? body : [body];
    const parsed = events.map((e) => validateTraceEvent(e));
    for (const event of parsed) {
      store.appendEvent(event);
    }
    res.status(204).send();
  } catch (err: any) {
    res.status(400).json({ error: err?.message ?? String(err) });
  }
});

app.get("/v1/traces", (_req, res) => {
  res.json({ traces: store.listTraces() });
});

app.get("/v1/traces/:traceId", (req, res) => {
  const traceId = req.params.traceId;
  const trace = store.getTrace(traceId);
  if (!trace) {
    res.status(404).json({ error: "Trace not found" });
    return;
  }
  res.json(trace);
});

app.get("/v1/traces/:traceId/analysis", (req, res) => {
  const analysis = store.analyze(req.params.traceId);
  if (!analysis) {
    res.status(404).json({ error: "Trace not found" });
    return;
  }
  res.json(analysis);
});

app.post("/v1/traces/:traceId/fork", (req, res) => {
  try {
    const { forkFromSpanId, overrides } = req.body ?? {};
    if (typeof forkFromSpanId !== "string" || forkFromSpanId.length === 0) {
      res.status(400).json({ error: "forkFromSpanId is required" });
      return;
    }
    const forked = store.forkTrace({
      baseTraceId: req.params.traceId,
      forkFromSpanId,
      overrides
    });
    res.status(201).json({ traceId: forked.meta.traceId });
  } catch (err: any) {
    res.status(400).json({ error: err?.message ?? String(err) });
  }
});

app.get("/v1/traces/:aId/diff/:bId", (req, res) => {
  const diff = store.diffTraces(req.params.aId, req.params.bId);
  if (!diff) {
    res.status(404).json({ error: "Trace not found" });
    return;
  }
  res.json(diff);
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`collector listening on http://localhost:${PORT}`);
});

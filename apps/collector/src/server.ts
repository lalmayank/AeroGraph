import express from "express";
import cors from "cors";
import { validateTraceEvent } from "@afr/contracts";
import { getDatabase } from "./sqlite/db";
import { runMigrations } from "./sqlite/migrate";
import { SqliteTraceStore } from "./sqliteStore";

export type CreateAppOptions = {
  dbPath?: string;
};

export function createApp(options: CreateAppOptions = {}): express.Express {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

  const dbPath = options.dbPath ?? process.env.AFR_DB_PATH ?? "data/afr.sqlite";
  const db = getDatabase(dbPath);
  runMigrations(db);
  const store = new SqliteTraceStore(db);

  app.locals.db = db;
  app.locals.store = store;

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
      res.status(201).send();
    } catch (err: any) {
      res.status(400).json({ error: err?.message ?? String(err) });
    }
  });

  app.get("/v1/traces", (_req, res) => {
    res.json(store.listTraces());
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

  // Removed forkTrace, diffTraces, and analyze endpoints per Phase 1 MVP constraints.

  return app;
}

if (process.env.NODE_ENV !== "test") {
  const PORT = Number(process.env.PORT ?? 4317);
  const app = createApp();
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`collector listening on http://localhost:${PORT}`);
  });
}

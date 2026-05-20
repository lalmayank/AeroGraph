import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "./server";
import type { Database } from "better-sqlite3";

describe("collector: API", () => {
  it("POST /v1/events accepts valid events", async () => {
    const app = createApp({ dbPath: ":memory:" });
    const db = app.locals.db as Database;

    const randomStr = Math.random().toString(36).substring(7);
    const event = {
      schemaVersion: "1.0.0",
      traceId: `test-t-${randomStr}`,
      spanId: `test-s-${randomStr}`,
      parentSpanId: null,
      occurredAt: new Date().toISOString(),
      actor: { kind: "agent", id: "agent-1" },
      kind: "prompt",
      status: "ok",
      payload: { text: "Hello" },
      links: []
    };

    const res = await request(app).post("/v1/events").send(event);
    expect(res.status).toBe(201);

    db.close();
  });

  it("POST /v1/events rejects invalid events", async () => {
    const app = createApp({ dbPath: ":memory:" });
    const db = app.locals.db as Database;

    const res = await request(app).post("/v1/events").send({});
    expect(res.status).toBe(400);

    db.close();
  });

  it("GET /v1/traces returns a list of traces", async () => {
    const app = createApp({ dbPath: ":memory:" });
    const db = app.locals.db as Database;

    const res = await request(app).get("/v1/traces");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.traces)).toBe(true);

    db.close();
  });

  it("GET /v1/traces/:id returns a trace with meta", async () => {
    const app = createApp({ dbPath: ":memory:" });
    const db = app.locals.db as Database;

    const event = {
      schemaVersion: "1.0.0",
      traceId: "test-t-1",
      spanId: "test-s-1",
      parentSpanId: null,
      occurredAt: new Date().toISOString(),
      actor: { kind: "agent", id: "agent-1" },
      kind: "prompt",
      status: "ok",
      payload: { text: "Hello" },
      links: []
    };

    await request(app).post("/v1/events").send(event).expect(201);

    const res = await request(app).get("/v1/traces/test-t-1");
    expect(res.status).toBe(200);
    expect(res.body.meta.traceId).toBe("test-t-1");
    expect(Array.isArray(res.body.events)).toBe(true);

    db.close();
  });
});

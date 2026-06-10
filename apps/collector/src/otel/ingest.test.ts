import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../server";
import { getDatabase } from "../sqlite/db";
import { runMigrations } from "../sqlite/migrate";
import fs from "fs";
import path from "path";

describe("OTLP Ingest Handler Integration", () => {
  let app: any;

  beforeEach(() => {
    // In-memory db for testing
    const db = getDatabase(":memory:");
    runMigrations(db);
    app = createApp({ dbPath: ":memory:" });
    // overriding the db and store that createApp sets up internally
    app.locals.db = db;
    // but createApp initializes its own store, so let's just use the app as created
    // wait, createApp uses dbPath. So passing :memory: is enough.
  });

  it("should return 201 and ingest events for valid OTLP JSON", async () => {
    const fixturePath = path.join(__dirname, "../../../../specs/004-otel-bridge/fixtures/expected_otlp/prompt_span.json");
    const span = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));

    const otlpRequest = {
      resourceSpans: [
        {
          resource: { attributes: [] },
          scopeSpans: [
            {
              scope: { name: "test" },
              spans: [span]
            }
          ]
        }
      ]
    };

    const res = await request(app)
      .post("/v1/otlp/traces")
      .send(otlpRequest);

    if (res.status !== 201) {
      console.error("Test failed with status", res.status, res.body);
    }
    expect(res.status).toBe(201);

    expect(res.body.message).toBe("Ingested");
    expect(res.body.eventsCount).toBe(1);

    // Retrieve via existing trace API
    const traceRes = await request(app).get(`/v1/traces/${span.traceId}`);
    expect(traceRes.status).toBe(200);
    expect(traceRes.body.events).toHaveLength(1);
    expect(traceRes.body.events[0].kind).toBe("prompt");
  });

  it("should return 400 for malformed JSON structure", async () => {
    const res = await request(app)
      .post("/v1/otlp/traces")
      .send({ invalidData: true })
      .expect(400);

    expect(res.body.error).toBe("Invalid OTLP Export Request");
  });

  it("should return 400 if OTLP span produces an invalid AeroGraph event", async () => {
    // missing traceId in the span
    const otlpRequest = {
      resourceSpans: [
        {
          resource: { attributes: [] },
          scopeSpans: [
            {
              scope: { name: "test" },
              spans: [{ spanId: "123", name: "bad" }]
            }
          ]
        }
      ]
    };

    const res = await request(app)
      .post("/v1/otlp/traces")
      .send(otlpRequest)
      .expect(400);
      
    // it will fail at OTLP Schema parsing first because missing traceId
    expect(res.body.error).toBe("Invalid OTLP Export Request");
  });

  it("should not break existing /v1/events route", async () => {
    const fixturePath = path.join(__dirname, "../../../../specs/004-otel-bridge/fixtures/prompt_event.json");
    const event = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));

    await request(app)
      .post("/v1/events")
      .send(event)
      .expect(201);
  });
});

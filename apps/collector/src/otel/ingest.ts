import { RequestHandler } from "express";
import { SqliteTraceStore } from "../store.js";
import { otlpExportRequestSchema, importOtlpToEvents } from "@aerograph/otel";
import { validateTraceEvent } from "@aerograph/contracts";
import { ZodError } from "zod";

export function createOtlpIngestHandler(store: SqliteTraceStore): RequestHandler {
  return (req, res, next) => {
    try {
      // 1. Validate incoming JSON against OTLP schema
      const parseResult = otlpExportRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: "Invalid OTLP Export Request",
          details: parseResult.error.errors,
        });
        return;
      }

      // 2. Convert OTLP spans to TraceEvents
      // We assign a default actor ID for ingested spans that lack actor attributes
      const events = importOtlpToEvents(parseResult.data, {
        defaultActorId: "otlp-ingest",
        preserveOriginalIds: true,
      });

      // 3. Validate each converted event against canonical AeroGraph contracts
      for (const event of events) {
        try {
          validateTraceEvent(event);
        } catch (e) {
          if (e instanceof ZodError) {
             res.status(400).json({
              error: "OTLP spans produced invalid AeroGraph events",
              spanId: event.spanId,
              details: e.errors,
            });
            return;
          }
          throw e;
        }
      }

      // 4. Append-only write
      for (const event of events) {
        store.appendEvent(event);
      }

      // 5. Success
      res.status(201).json({
        message: "Ingested",
        eventsCount: events.length,
      });
    } catch (e) {
      next(e);
    }
  };
}

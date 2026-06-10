/**
 * packages/otel/src/otlp-schema.ts
 *
 * Zod schemas for OTLP/JSON structures.
 * Used by the bridge for type-safe export/import and by the collector for ingestion validation.
 *
 * These schemas are defined here (NOT in @aerograph/contracts) because they describe
 * an external protocol format, not AeroGraph's canonical data model.
 *
 * Mirrors Python TypedDict definitions in contracts/contracts.md §1.4 exactly.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// OtlpAnyValue — the OTLP attribute value union
// ---------------------------------------------------------------------------

export const otlpAnyValueSchema = z.union([
  z.object({ stringValue: z.string() }),
  z.object({ intValue: z.union([z.string(), z.number().int()]) }),
  z.object({ boolValue: z.boolean() }),
  z.object({ doubleValue: z.number() }),
  z.object({
    arrayValue: z.object({
      values: z.array(z.lazy((): z.ZodTypeAny => otlpAnyValueSchema)).optional()
    })
  }),
]);

export type OtlpAnyValue = z.infer<typeof otlpAnyValueSchema>;

// ---------------------------------------------------------------------------
// OtlpAttribute
// ---------------------------------------------------------------------------

export const otlpAttributeSchema = z.object({
  key: z.string(),
  value: otlpAnyValueSchema,
});

export type OtlpAttribute = z.infer<typeof otlpAttributeSchema>;

// ---------------------------------------------------------------------------
// OtlpLink
// ---------------------------------------------------------------------------

export const otlpLinkSchema = z.object({
  traceId: z.string(),
  spanId: z.string(),
  attributes: z.array(otlpAttributeSchema).optional(),
});

export type OtlpLink = z.infer<typeof otlpLinkSchema>;

// ---------------------------------------------------------------------------
// OtlpSpan
// ---------------------------------------------------------------------------

export const otlpSpanSchema = z.object({
  traceId: z.string().regex(/^[0-9a-f]{32}$/i, "traceId must be 32 lowercase hex chars"),
  spanId: z.string().regex(/^[0-9a-f]{16}$/i, "spanId must be 16 lowercase hex chars"),
  parentSpanId: z.string().regex(/^[0-9a-f]{16}$/i).optional(),
  name: z.string().min(1),
  kind: z.number().int().min(0).max(5).default(0),
  startTimeUnixNano: z.string(),
  endTimeUnixNano: z.string(),
  status: z
    .object({
      code: z.number().int().min(0).max(2).default(0),
      message: z.string().optional(),
    })
    .optional(),
  attributes: z.array(otlpAttributeSchema).default([]),
  links: z.array(otlpLinkSchema).optional(),
  events: z
    .array(
      z.object({
        name: z.string(),
        timeUnixNano: z.string(),
        attributes: z.array(otlpAttributeSchema).optional(),
      })
    )
    .optional(),
});

export type OtlpSpan = z.infer<typeof otlpSpanSchema>;

// ---------------------------------------------------------------------------
// OtlpResource
// ---------------------------------------------------------------------------

export const otlpResourceSchema = z.object({
  attributes: z.array(otlpAttributeSchema).default([]),
});

// ---------------------------------------------------------------------------
// OtlpScopeSpan
// ---------------------------------------------------------------------------

export const otlpScopeSpanSchema = z.object({
  scope: z
    .object({
      name: z.string(),
      version: z.string().optional(),
    })
    .optional(),
  spans: z.array(otlpSpanSchema),
});

// ---------------------------------------------------------------------------
// OtlpResourceSpan
// ---------------------------------------------------------------------------

export const otlpResourceSpanSchema = z.object({
  resource: otlpResourceSchema.optional(),
  scopeSpans: z.array(otlpScopeSpanSchema),
});

// ---------------------------------------------------------------------------
// OtlpExportRequest — top-level container
// ---------------------------------------------------------------------------

export const otlpExportRequestSchema = z.object({
  resourceSpans: z.array(otlpResourceSpanSchema),
});

export type OtlpExportRequest = z.infer<typeof otlpExportRequestSchema>;

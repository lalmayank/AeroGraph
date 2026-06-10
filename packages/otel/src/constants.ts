/**
 * packages/otel/src/constants.ts
 *
 * All AeroGraph-specific OTel attribute key string constants.
 * Use these to construct or read attributes deterministically.
 * Mirrors AeroGraphAttrs in Python (constants.py) exactly.
 */

export const AEROGRAPH_ATTRS = {
  // Universal attributes — on every exported span
  SCHEMA_VERSION: "aerograph.schema_version",
  KIND: "aerograph.kind",
  ACTOR_ID: "aerograph.actor.id",
  ACTOR_KIND: "aerograph.actor.kind",
  ACTOR_NAME: "aerograph.actor.name",
  STATUS: "aerograph.status",
  TITLE: "aerograph.title",

  // Link attributes — on each span link
  LINK_REL: "aerograph.link.rel",

  // Kind-specific payload attributes
  PROMPT_TEXT: "aerograph.prompt.text",
  RESPONSE_TEXT: "aerograph.response.text",
  RESPONSE_TIME_TO_FIRST_TOKEN_MS: "aerograph.response.time_to_first_token_ms",
  RESPONSE_TOTAL_DURATION_MS: "aerograph.response.total_duration_ms",
  RESPONSE_TOKENS_PER_SECOND: "aerograph.response.tokens_per_second",
  RESPONSE_TOKEN_COUNT: "aerograph.response.token_count",
  RETRIEVER_QUERY: "aerograph.retriever.query",
  RETRIEVER_DOCUMENT_COUNT: "aerograph.retriever.document_count",
  CHECKPOINT_ID: "aerograph.checkpoint.id",
  CHECKPOINT_REASON: "aerograph.checkpoint.reason",
  STATE_SNAPSHOT_NODE_NAME: "aerograph.state_snapshot.node_name",
  STATE_SNAPSHOT_STATE_HASH: "aerograph.state_snapshot.state_hash",
  HANDOFF_FROM_AGENT_ID: "aerograph.handoff.from_agent_id",
  HANDOFF_TO_AGENT_ID: "aerograph.handoff.to_agent_id",
  HANDOFF_REASON: "aerograph.handoff.reason",
  ERROR_MESSAGE: "aerograph.error.message",
  ERROR_DETAILS: "aerograph.error.details",
  NOTE_PAYLOAD: "aerograph.note.payload",
  TOOL_CALL_INPUT: "aerograph.tool_call.input",
  TOOL_RESULT_OUTPUT: "aerograph.tool_result.output",

  // Import-only attributes
  OTEL_IMPORTED: "aerograph.otel_imported",
} as const;

export type AerographAttrKey = (typeof AEROGRAPH_ATTRS)[keyof typeof AEROGRAPH_ATTRS];

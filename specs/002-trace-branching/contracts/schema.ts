export interface EventStateSnapshot {
  eventId: string;
  traceId: string;
  nodeName: string;
  stateHash: string;
  stateDiff: Record<string, any>;
  fullState: Record<string, any>;
  timestamp: number;
}

export interface StreamingTelemetry {
  timeToFirstTokenMs: number;
  totalDurationMs: number;
  tokensPerSecond: number;
  tokenCount: number;
}

export interface RetrievedDocument {
  pageContent: string;
  metadata: Record<string, any>;
  score?: number;
}

export interface EventRetriever {
  eventId: string;
  traceId: string;
  query: string;
  documents: RetrievedDocument[];
  timestamp: number;
}

export interface EventCheckpoint {
  eventId: string;
  traceId: string;
  checkpointId: string;
  reason: string;
  state: Record<string, any>;
  timestamp: number;
}

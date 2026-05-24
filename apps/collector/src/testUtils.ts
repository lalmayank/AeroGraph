import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateTraceEvent, type TraceEvent } from "@afr/contracts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export type Phase2FixtureName = "base" | "child_a" | "child_b" | "handoff_cycle";

export function loadPhase2FixtureTrace(name: Phase2FixtureName): TraceEvent[] {
  const fixturePath = resolve(__dirname, "__fixtures__", "phase2", `${name}.json`);
  const parsed = JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error(`Phase 2 fixture must be an array: ${fixturePath}`);
  }

  return parsed.map((e) => validateTraceEvent(e));
}

import { describe, expect, it } from "vitest";
import { FlightRecorder } from "./index";

function createMockFetch() {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchFn = (async (url: any, init?: any) => {
    calls.push({ url: String(url), init });
    return {
      ok: true,
      status: 200,
      text: async () => ""
    };
  }) as unknown as typeof fetch;

  return { fetchFn, calls };
}

describe("sdk: FlightRecorder", () => {
  it("emits schema-valid events", async () => {
    const { fetchFn, calls } = createMockFetch();
    const fr = new FlightRecorder({
      endpoint: "http://localhost:4317",
      actor: { id: "agent-a", name: "Planner" },
      fetchFn
    });

    await fr.prompt({ parentSpanId: null, text: "Hello" });

    expect(calls.length).toBe(1);
    const body = JSON.parse(String(calls[0].init?.body));
    expect(body.schemaVersion).toBe("1.0.0");
    expect(body.kind).toBe("prompt");
    expect(body.traceId).toBeTruthy();
  });
});

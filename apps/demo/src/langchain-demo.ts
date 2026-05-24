import { FlightRecorder } from "@afr/sdk";
import { createLangChainHandler } from "@afr/adapter-langchain";
// Using a mock LLM structure for demonstration without real API keys
import { FakeListChatModel } from "@langchain/core/utils/testing";

async function main() {
  console.log("Starting LangChain Demo...");

  const recorder = new FlightRecorder({
    endpoint: "http://localhost:4317",
    actor: { id: "demo-langchain-agent", name: "DemoAgent" }
  });

  const handler = createLangChainHandler({ recorder });

  // Use a fake model to simulate the LLM call without needing OpenAI keys
  const model = new FakeListChatModel({
    responses: ["This is a simulated response for the Agent Flight Recorder Demo!"],
  });

  console.log("Invoking model...");
  await model.invoke("Hello, how are you?", {
    callbacks: [handler]
  });

  console.log("Done! Check the web UI to see the trace.");
}

main().catch(console.error);

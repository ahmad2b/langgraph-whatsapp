import { createAgent, summarizationMiddleware, toolCallLimitMiddleware } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { FixtureModel } from "./fixture.js";
import { calculator } from "./tools.js";
import { generateImage } from "./images.js";
const mode = process.env.AGENT_MODEL_MODE ?? "fixture";
if (!["fixture", "openai"].includes(mode)) throw new Error("Invalid AGENT_MODEL_MODE");
if (mode === "openai" && (!process.env.OPENAI_API_KEY || !process.env.OPENAI_MODEL))
  throw new Error("OpenAI mode requires key and an explicit OPENAI_MODEL");
const model =
  mode === "fixture"
    ? new FixtureModel({})
    : new ChatOpenAI({
        model: process.env.OPENAI_MODEL!,
        maxTokens: 500,
        ...(process.env.OPENAI_MODEL === "gpt-6-luna"
          ? { reasoning: { effort: "none" as const } }
          : {}),
        maxRetries: 0,
        timeout: 45_000,
      });
export const agent = createAgent({
  model,
  tools: [calculator, generateImage],
  systemPrompt:
    "You are a concise WhatsApp assistant. Answer text, voice transcripts and images using the same conversation context. Use calculator for arithmetic. Only use generate_image when the user explicitly requests creating an image. You cannot edit images, browse, access private files or choose message destinations. Image tool results describe creation, not successful delivery. Ask for clarification when needed.",
  middleware: [
    toolCallLimitMiddleware({ toolName: "generate_image", runLimit: 1, exitBehavior: "continue" }),
    // Use the framework's built-in compaction, never a parallel history database.
    ...(mode === "openai"
      ? [
          summarizationMiddleware({
            model,
            trigger: [{ tokens: 6000 }, { messages: 30 }],
            keep: { messages: 8 },
          }),
        ]
      : []),
  ],
  // Agent Server injects its own checkpointer/store.
});

import { Client } from "@langchain/langgraph-sdk";
import { decodeImage, type HumanContent, type AgentReply } from "../media/io.js";
import { z } from "zod";

const finalMessage = z.object({
  type: z.literal("ai"),
  content: z.union([
    z.string(),
    z.array(z.object({ type: z.string(), text: z.string().optional() }).passthrough()),
  ]),
  tool_calls: z.array(z.unknown()).optional(),
});
export function assistantText(values: unknown) {
  const state = z.object({ messages: z.array(z.unknown()) }).parse(values);
  const last = finalMessage.parse(state.messages.at(-1));
  if (last.tool_calls?.length) throw new Error("Agent stopped on tool calls");
  const text =
    typeof last.content === "string"
      ? last.content
      : last.content
          .filter((p) => p.type === "text")
          .map((p) => p.text ?? "")
          .join("");
  if (!text.trim() || text.length > 4000) throw new Error("No bounded assistant text");
  return text;
}
export function assistantReply(values: unknown, messageId: string): AgentReply {
  const state = z.object({ messages: z.array(z.record(z.string(), z.unknown())) }).parse(values);
  const start = state.messages.findLastIndex((m) => m.id === messageId && m.type === "human");
  if (start < 0) throw new Error("Current message absent from framework state");
  const images = state.messages
    .slice(start + 1)
    .filter((m) => m.type === "tool" && m.name === "generate_image" && m.artifact)
    .map((m) => {
      const file = z
        .object({
          kind: z.literal("generated_image"),
          mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
          data: z.string(),
        })
        .parse(m.artifact);
      decodeImage(file.data, file.mimeType);
      return { mimeType: file.mimeType, data: file.data };
    });
  if (images.length > 1) throw new Error("Too many generated images");
  return { text: assistantText(values), images };
}
export function agentServer(apiUrl: string) {
  const client = new Client({
    apiUrl,
    apiKey: null,
    timeoutMs: 155_000,
    callerOptions: { maxRetries: 0 },
  });
  async function respond(
    id: string,
    messageId: string,
    content: HumanContent,
  ): Promise<AgentReply> {
    const signal = AbortSignal.timeout(150_000);
    await client.threads.create({ threadId: id, ifExists: "do_nothing", signal });
    const run = await client.runs.create(id, "agent", {
      input: { messages: [{ role: "human", id: messageId, content }] },
      config: { recursion_limit: 16 },
      multitaskStrategy: "reject",
      signal,
    });
    try {
      await client.runs.join(id, run.run_id, { signal });
      if ((await client.runs.get(id, run.run_id)).status !== "success")
        throw new Error("Run did not succeed");
      return assistantReply(
        (await client.threads.getState(id, undefined, { signal })).values,
        messageId,
      );
    } catch (error) {
      // Explicit API cancellation: aborting an HTTP request alone need not stop a background run.
      await client.runs
        .cancel(id, run.run_id, true, "interrupt", { signal: AbortSignal.timeout(5000) })
        .catch(() => {});
      throw error;
    }
  }
  return {
    client,
    respond,
    reply: async (id: string, messageId: string, text: string) =>
      (await respond(id, messageId, text)).text,
  };
}

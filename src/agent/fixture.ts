import { FakeChatModel } from "@langchain/core/utils/testing";
import { AIMessage, type BaseMessage } from "@langchain/core/messages";
import type { ChatResult } from "@langchain/core/outputs";

// Stateless scripted tool call: exercises createAgent's model -> tool -> model loop.
// This is deliberately NOT evidence of LLM reasoning or a provider integration.
export class FixtureModel extends FakeChatModel {
  bindTools() {
    return this;
  }
  override async _generate(messages: BaseMessage[]): Promise<ChatResult> {
    const last = messages.at(-1);
    const turns = messages.filter((m) => m.type === "human").length;
    const human = messages.findLast((m) => m.type === "human");
    const raw = human?.content;
    const text =
      typeof raw === "string"
        ? raw
        : Array.isArray(raw)
          ? raw
              .filter((p) => p.type === "text")
              .map((p) => ("text" in p ? p.text : ""))
              .join("")
          : "";
    const isImageRequest = text.startsWith("/image ");
    const imageInput = Array.isArray(raw) && raw.some((p) => p.type === "image_url");
    if (last?.type !== "tool" && isImageRequest) {
      const message = new AIMessage({
        content: "",
        tool_calls: [
          { id: `image-${turns}`, name: "generate_image", args: { prompt: text.slice(7) } },
        ],
      });
      return { generations: [{ text: "", message }] };
    }
    if (last?.type === "tool" && last.name === "generate_image") {
      const message = new AIMessage(`Fixture image created; user turns: ${turns}`);
      return { generations: [{ text: message.content as string, message }] };
    }
    if (imageInput) {
      const message = new AIMessage(
        `Fixture image received (no visual understanding); user turns: ${turns}`,
      );
      return { generations: [{ text: message.content as string, message }] };
    }
    if (text === "/recall") {
      const contents = messages
        .filter((m) => m.type === "human")
        .map((m) => (typeof m.content === "string" ? m.content : "[image]"));
      const message = new AIMessage(
        `Fixture history: ${contents.join(" | ")}; user turns: ${turns}`,
      );
      return { generations: [{ text: message.content as string, message }] };
    }
    const message =
      last?.type === "tool"
        ? new AIMessage(`Fixture: 2 + 2 = ${last.content}; user turns: ${turns}`)
        : new AIMessage({
            content: "",
            tool_calls: [
              {
                id: `fixture-${turns}`,
                name: "calculator",
                args: { operation: "add", a: 2, b: 2 },
              },
            ],
          });
    return {
      generations: [{ text: typeof message.content === "string" ? message.content : "", message }],
    };
  }
}

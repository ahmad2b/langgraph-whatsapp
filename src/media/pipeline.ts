import { withTyping } from "./presence.js";
import type { Incoming } from "../whatsapp/messages.js";
import type { AgentReply, HumanContent, MediaFile } from "./io.js";
import type { Speech } from "./speech.js";
export interface MediaGateway {
  presence?(session: string, chat: string, value: "typing" | "paused"): Promise<void>;
  download(media: NonNullable<Incoming["media"]>, kind: "image" | "voice"): Promise<Buffer>;
  text(session: string, chat: string, text: string): Promise<void>;
  file(
    session: string,
    chat: string,
    kind: "image" | "voice",
    file: MediaFile,
    caption?: string,
  ): Promise<void>;
}
export function mediaPipeline(
  gateway: MediaGateway,
  speech: Speech,
  respond: (thread: string, id: string, content: HumanContent) => Promise<AgentReply>,
) {
  return async (session: string, thread: string, id: string, message: Incoming) =>
    withTyping(gateway, session, message.chatId, async () => {
      let content: HumanContent = message.text;
      if (message.kind !== "text") {
        let bytes: Buffer;
        try {
          bytes = await gateway.download(message.media!, message.kind);
        } catch {
          await gateway.text(
            session,
            message.chatId,
            "I couldn't read that attachment. Please send it again.",
          );
          return;
        }
        if (message.kind === "image")
          content = [
            { type: "text", text: message.text || "Describe this image." },
            {
              type: "image_url",
              image_url: {
                url: `data:${message.media!.mimetype};base64,${bytes.toString("base64")}`,
              },
            },
          ];
        else {
          try {
            content = await speech.transcribe(bytes);
          } catch {
            await gateway.text(
              session,
              message.chatId,
              "I couldn't transcribe that voice note. Please send text or try again.",
            );
            return;
          }
        }
      }
      const result = await respond(thread, id, content);
      if (result.images.length) {
        // One generated image per run. No fallback/resend on an uncertain send.
        await gateway.file(session, message.chatId, "image", result.images[0], result.text);
      } else await gateway.text(session, message.chatId, result.text);
    });
}

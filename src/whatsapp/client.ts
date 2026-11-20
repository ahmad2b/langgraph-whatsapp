import { bounded, imageSignature, opusSignature, type MediaFile } from "../media/io.js";
import type { MediaGateway } from "../media/pipeline.js";
export function mediaGateway(baseUrl: string, apiKey: string): MediaGateway {
  const base = new URL(baseUrl);
  if (
    !["http:", "https:"].includes(base.protocol) ||
    base.username ||
    base.password ||
    base.pathname !== "/" ||
    base.search ||
    base.hash
  )
    throw new Error("WAHA must be an HTTP(S) origin");
  const headers = { "X-Api-Key": apiKey };
  async function send(path: string, body: object) {
    const response = await fetch(new URL(path, base), {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
      redirect: "error",
    });
    // No automatic resend after an uncertain HTTP result.
    await bounded(response, 64 * 1024);
  }
  return {
    async presence(session, chatId, presence) {
      const response = await fetch(new URL(`/api/${encodeURIComponent(session)}/presence`, base), {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, presence }),
        signal: AbortSignal.timeout(2000),
        redirect: "error",
      });
      await response.body?.cancel();
      if (!response.ok) throw new Error("Presence unavailable");
    },
    async download(media, kind) {
      const url = new URL(media.url);
      const decoded = decodeURIComponent(url.pathname);
      if (
        url.origin !== base.origin ||
        url.username ||
        url.password ||
        url.hash ||
        !url.pathname.startsWith("/api/files/") ||
        !decoded.startsWith("/api/files/") ||
        decoded.includes("\\") ||
        decoded.split("/").some((p) => p === "." || p === "..")
      )
        throw new Error("Media origin/path rejected");
      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(10_000),
        redirect: "error",
      });
      const type = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
      if (type !== media.mimetype) {
        await response.body?.cancel();
        throw new Error("Media MIME mismatch");
      }
      const bytes = await bounded(response, 5 * 1024 * 1024);
      if (!(kind === "image" ? imageSignature(bytes, type) : opusSignature(bytes)))
        throw new Error("Media signature mismatch");
      return bytes;
    },
    text: (session, chatId, text) =>
      send("/api/sendText", { session, chatId, text, linkPreview: false }),
    file: (session, chatId, kind, file: MediaFile, caption) =>
      send(kind === "image" ? "/api/sendImage" : "/api/sendVoice", {
        session,
        chatId,
        file: {
          mimetype: file.mimeType,
          data: file.data,
          filename:
            kind === "image"
              ? `generated.${file.mimeType === "image/jpeg" ? "jpg" : file.mimeType === "image/webp" ? "webp" : "png"}`
              : "reply.ogg",
        },
        ...(kind === "image" ? { caption: caption?.slice(0, 1024) } : { convert: false }),
      }),
  };
}
export function wahaClient(baseUrl: string, apiKey: string) {
  return mediaGateway(baseUrl, apiKey).text;
}

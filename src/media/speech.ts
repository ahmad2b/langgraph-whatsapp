import { bounded, opusSignature, type MediaFile } from "./io.js";
import { fixtureVoice } from "./fixtures.js";
export interface Speech {
  transcribe(bytes: Buffer): Promise<string>;
  synthesize(text: string): Promise<MediaFile>;
}
export function speech(): Speech {
  const mode = process.env.SPEECH_MODE ?? "fixture";
  if (mode === "fixture")
    return {
      // Deliberately ignores audio content: exercises plumbing, not recognition.
      transcribe: async () => "Fixture voice transcript: my favorite color is blue.",
      synthesize: async () => ({ mimeType: "audio/ogg; codecs=opus", data: fixtureVoice }),
    };
  if (mode === "cloudflare")
    return {
      async transcribe(bytes) {
        if (!bytes.length || bytes.length > 5 * 1024 * 1024 || !opusSignature(bytes))
          throw new Error("Invalid bounded voice input");
        const response = await cloudflareSpeech("transcribe", {
          audio: bytes.toString("base64"),
          language: "en",
          task: "transcribe",
          vad_filter: true,
        });
        const value = JSON.parse((await bounded(response, 1024 * 1024)).toString());
        const text: unknown = (value.result ?? value).text;
        if (typeof text !== "string" || !text.trim() || text.length > 4000)
          throw new Error("No bounded speech transcript");
        return text.trim();
      },
      async synthesize(text) {
        if (!text.trim() || text.length > 2000)
          throw new Error("Speech reply too long; use text fallback");
        const response = await cloudflareSpeech("synthesize", {
          text,
          speaker: "asteria",
          encoding: "opus",
          container: "ogg",
        });
        const bytes = await bounded(response, 5 * 1024 * 1024);
        if (!opusSignature(bytes)) throw new Error("Invalid synthesized Opus file");
        return { mimeType: "audio/ogg; codecs=opus", data: bytes.toString("base64") };
      },
    };
  if (
    mode !== "deepgram" ||
    !process.env.DEEPGRAM_API_KEY ||
    !process.env.DEEPGRAM_STT_MODEL ||
    !process.env.DEEPGRAM_TTS_MODEL
  )
    throw new Error("Deepgram mode requires key and explicit STT/TTS models");
  const auth = { Authorization: `Token ${process.env.DEEPGRAM_API_KEY}` };
  return {
    async transcribe(bytes) {
      const url = new URL("https://api.deepgram.com/v1/listen");
      url.search = new URLSearchParams({
        model: process.env.DEEPGRAM_STT_MODEL!,
        language: "en",
        smart_format: "true",
      }).toString();
      const response = await fetch(url, {
        method: "POST",
        headers: { ...auth, "Content-Type": "audio/ogg" },
        body: new Uint8Array(bytes),
        signal: AbortSignal.timeout(30_000),
        redirect: "error",
      });
      const value = JSON.parse((await bounded(response, 1024 * 1024)).toString());
      const text: unknown = value.results?.channels?.[0]?.alternatives?.[0]?.transcript;
      if (typeof text !== "string" || !text.trim() || text.length > 4000)
        throw new Error("No bounded speech transcript");
      return text.trim();
    },
    async synthesize(text) {
      if (!text.trim() || text.length > 2000)
        throw new Error("Speech reply too long; use text fallback");
      const url = new URL("https://api.deepgram.com/v1/speak");
      url.search = new URLSearchParams({
        model: process.env.DEEPGRAM_TTS_MODEL!,
        encoding: "opus",
        container: "ogg",
        sample_rate: "48000",
      }).toString();
      const response = await fetch(url, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(30_000),
        redirect: "error",
      });
      const bytes = await bounded(response, 5 * 1024 * 1024);
      if (!opusSignature(bytes)) throw new Error("Invalid synthesized Opus file");
      return { mimeType: "audio/ogg; codecs=opus", data: bytes.toString("base64") };
    },
  };
}

async function cloudflareSpeech(
  action: "transcribe" | "synthesize",
  input: Record<string, unknown>,
): Promise<Response> {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!account || !/^[a-f0-9]{32}$/i.test(account))
    throw new Error("Invalid Cloudflare account ID");
  const model =
    action === "transcribe" ? "@cf/openai/whisper-large-v3-turbo" : "@cf/deepgram/aura-1";
  const url = new URL(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`);
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) throw new Error("Missing Cloudflare speech credential");
  return fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(60_000),
    redirect: "error",
  });
}

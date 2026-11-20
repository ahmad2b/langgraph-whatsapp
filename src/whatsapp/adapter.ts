import { createHmac, timingSafeEqual } from "node:crypto";
import { incoming, threadId, type Incoming } from "./messages.js";

type Options = {
  process?: (session: string, thread: string, eventId: string, message: Incoming) => Promise<void>;
  session: string;
  webhookSecret: string;
  threadSecret: string;
  allowed: string[];
  reply: (thread: string, message: string, text: string) => Promise<string>;
  send: (session: string, chat: string, text: string) => Promise<void>;
};
export function adapter(options: Options) {
  const since = Math.floor(Date.now() / 1000);
  const seen = new Map<string, number>();
  const busy = new Set<string>();
  const pending = new Set<Promise<void>>();
  const counters = { accepted: 0, replied: 0, failed: 0, ignored: 0, duplicate: 0 };
  return {
    counters,
    async idle() {
      await Promise.all(pending);
    },
    async handle(request: Request): Promise<Response> {
      if (request.method === "GET" && new URL(request.url).pathname === "/health")
        return Response.json(counters);
      if (request.method !== "POST" || new URL(request.url).pathname !== "/webhook")
        return new Response(null, { status: 404 });
      const raw = await request.text();
      if (Buffer.byteLength(raw) > 64 * 1024) return new Response(null, { status: 413 });
      const signature = request.headers.get("X-Webhook-Hmac") ?? "";
      const digest = createHmac("sha512", options.webhookSecret).update(raw).digest("hex");
      if (
        request.headers.get("X-Webhook-Hmac-Algorithm") !== "sha512" ||
        !/^[a-f0-9]{128}$/i.test(signature) ||
        !timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(digest, "hex"))
      )
        return new Response(null, { status: 401 });
      let value: unknown;
      try {
        value = JSON.parse(raw);
      } catch {
        return new Response(null, { status: 400 });
      }
      const message = incoming(value, options.session, since, options.allowed);
      if (!message) {
        counters.ignored++;
        return new Response(null, { status: 200 });
      }
      for (const [key, expiry] of seen) if (expiry < Date.now()) seen.delete(key);
      const id = threadId(options.threadSecret, options.session, message.chatId);
      const eventKey = createHmac("sha256", options.threadSecret)
        .update(JSON.stringify([id, message.id]))
        .digest("hex");
      if (seen.has(eventKey)) {
        counters.duplicate++;
        return new Response(null, { status: 200 });
      }
      // This lock covers run + outbound delivery, preserving reply order. No custom graph runner/queue.
      if (busy.has(id) || pending.size >= 4 || seen.size >= 1000)
        return new Response(null, { status: 503 });
      seen.set(eventKey, Date.now() + 3600_000);
      busy.add(id);
      counters.accepted++;
      const work = (async () => {
        try {
          if (options.process) await options.process(options.session, id, eventKey, message);
          else {
            if (message.kind !== "text") throw new Error("Media processor not configured");
            const text = await options.reply(id, eventKey, message.text);
            await options.send(options.session, message.chatId, text);
          }
          counters.replied++;
        } catch {
          counters.failed++;
          console.error(
            "WhatsApp reply failed; no automatic retry. Check local server/session status.",
          );
        } finally {
          busy.delete(id);
        }
      })();
      pending.add(work);
      void work.finally(() => pending.delete(work));
      return new Response(null, { status: 202 });
    },
  };
}

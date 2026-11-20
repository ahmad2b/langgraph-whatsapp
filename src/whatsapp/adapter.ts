import { createHmac, timingSafeEqual } from "node:crypto";
import { incoming, isAllowed, threadId, type Incoming } from "./messages.js";

type Options = {
  process?: (session: string, thread: string, eventId: string, message: Incoming) => Promise<void>;
  session: string;
  webhookSecret: string;
  threadSecret: string;
  allowed: string[];
  reply: (thread: string, message: string, text: string) => Promise<string>;
  send: (session: string, chat: string, text: string) => Promise<void>;
};
type Job = { eventKey: string; message: Incoming; count: number };

// Up to four chats run at once. Each chat has its own queue, so a second message
// that arrives mid-reply waits its turn instead of being refused, and replies stay in order.
const MAX_ACTIVE_CHATS = 4;
const MAX_QUEUED_PER_CHAT = 10;
const MAX_QUEUED_TOTAL = 50;
const MAX_COMBINED_TEXT = 4000;

// Text messages that piled up while the agent was busy become one turn, because
// people often split one thought across several texts. Media stays separate.
export function takeTurn(queue: Job[]): Job {
  const first = queue.shift()!;
  if (first.message.kind !== "text") return first;
  const texts = [first.message.text];
  let last = first;
  let count = first.count;
  let length = first.message.text.length;
  while (
    queue[0]?.message.kind === "text" &&
    length + 1 + queue[0].message.text.length <= MAX_COMBINED_TEXT
  ) {
    last = queue.shift()!;
    texts.push(last.message.text);
    count += last.count;
    length += 1 + last.message.text.length;
  }
  return texts.length === 1
    ? first
    : { eventKey: last.eventKey, message: { ...last.message, text: texts.join("\n") }, count };
}

export function adapter(options: Options) {
  const since = Math.floor(Date.now() / 1000);
  const seen = new Map<string, number>();
  const queues = new Map<string, Job[]>();
  const waiting: string[] = [];
  const pending = new Set<Promise<void>>();
  let queued = 0;
  const counters = { accepted: 0, replied: 0, failed: 0, ignored: 0, duplicate: 0, blocked: 0 };
  const reported = new Set<string>();

  async function run(thread: string, job: Job) {
    const { eventKey, message } = job;
    try {
      if (options.process) await options.process(options.session, thread, eventKey, message);
      else {
        if (message.kind !== "text") throw new Error("Media processor not configured");
        const text = await options.reply(thread, eventKey, message.text);
        await options.send(options.session, message.chatId, text);
      }
      counters.replied += job.count;
    } catch {
      counters.failed += job.count;
      console.error(
        "WhatsApp reply failed; no automatic retry. Check local server/session status.",
      );
    }
  }

  // Drains one chat's queue in order, then hands its slot to the next waiting chat.
  function start(thread: string) {
    const work = (async () => {
      const queue = queues.get(thread)!;
      while (queue.length) {
        const before = queue.length;
        const job = takeTurn(queue);
        queued -= before - queue.length;
        await run(thread, job);
      }
      queues.delete(thread);
    })();
    pending.add(work);
    void work.finally(() => {
      pending.delete(work);
      const next = waiting.shift();
      if (next) start(next);
    });
  }

  return {
    counters,
    async idle() {
      while (pending.size) await Promise.all(pending);
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
      const message = incoming(value, options.session, since);
      if (!message) {
        counters.ignored++;
        return new Response(null, { status: 200 });
      }
      // Closed by default: only listed senders reach the agent. Each new sender's ID is
      // logged once, so the owner can copy it into WAHA_ALLOWED_SENDERS.
      if (!isAllowed(options.allowed, message.chatId)) {
        counters.blocked++;
        if (!reported.has(message.chatId) && reported.size < 100) {
          reported.add(message.chatId);
          console.warn(
            `Ignored a message from ${message.chatId}. To let them use the agent, add it to ` +
              `WAHA_ALLOWED_SENDERS in .env, then run: docker compose up -d adapter`,
          );
        }
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
      // Refuse before admission when memory bounds are hit, so a retry is not deduplicated.
      const queue = queues.get(id);
      if (
        (queue?.length ?? 0) >= MAX_QUEUED_PER_CHAT ||
        queued >= MAX_QUEUED_TOTAL ||
        seen.size >= 1000
      )
        return new Response(null, { status: 503 });
      seen.set(eventKey, Date.now() + 3600_000);
      counters.accepted++;
      queued++;
      const job = { eventKey, message, count: 1 };
      if (queue) queue.push(job);
      else {
        queues.set(id, [job]);
        if (pending.size < MAX_ACTIVE_CHATS) start(id);
        else waiting.push(id);
      }
      return new Response(null, { status: 202 });
    },
  };
}

import "server-only";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";

// Next's route workers load web/.env by default. Read the existing root file
// only in this server-only module; never copy secrets into the website.
function privateConfig(): Record<string, string | undefined> {
  try {
    return {
      ...parseEnv(readFileSync(resolve(process.cwd(), "..", ".env"), "utf8")),
      ...process.env,
    };
  } catch {
    return process.env;
  }
}
const config = privateConfig();
import { randomUUID } from "node:crypto";
import { Client } from "@langchain/langgraph-sdk";

const noStore = { "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff" };
let testing = false;
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: noStore });

async function bounded(response: Response, max = 64 * 1024) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Empty service response");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) throw new Error("Service response too large");
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

async function gateway(path: string, method = "GET", body?: object) {
  return fetch(new URL(path, config.WAHA_URL ?? "http://127.0.0.1:3011"), {
    method,
    headers: {
      "X-Api-Key": config.WAHA_API_KEY!,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
}
async function sessionState() {
  const response = await gateway("/api/sessions/default");
  if (response.status === 404) {
    await response.body?.cancel();
    return "NOT_STARTED";
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error("Gateway unavailable");
  }
  const value = JSON.parse((await bounded(response)).toString());
  const states = ["STOPPED", "STARTING", "SCAN_QR_CODE", "WORKING", "FAILED"];
  return states.includes(value.status) ? (value.status as string) : "UNKNOWN";
}

// Only fixed, local operations. Gateway credentials and raw session data stay server-side.
export async function proxySetup(request: Request, action: string) {
  const host = request.headers.get("host");
  if (process.env.VERCEL_ENV || !host || !["localhost:3004", "127.0.0.1:3004"].includes(host))
    return json({ error: "Setup actions are available on localhost:3004 only." }, 403);
  const origin = request.headers.get("origin");
  if (
    (origin && origin !== `http://${host}`) ||
    request.headers.get("sec-fetch-site") === "cross-site" ||
    (request.method === "POST" && origin !== `http://${host}`)
  )
    return json({ error: "Use the local setup page to make this request." }, 403);
  if (!(request.method === "GET" ? ["status", "qr"] : ["session", "test"]).includes(action))
    return json({ error: "Not found" }, 404);
  if (!config.WAHA_API_KEY || !config.WAHA_WEBHOOK_SECRET)
    return json(
      { error: "Run npm run setup, then npm run web:dev from the repository root." },
      503,
    );
  let input: Record<string, unknown> = {};
  if (request.method === "POST") {
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return json({ error: "Expected JSON" }, 415);
    try {
      input = JSON.parse((await bounded(new Response(request.body), 4096)).toString());
      if (!input || typeof input !== "object" || Array.isArray(input))
        return json({ error: "Expected an object" }, 400);
    } catch {
      return json({ error: "Invalid or oversized request" }, 400);
    }
  }
  try {
    if (action === "status") {
      const [session, health, agent] = await Promise.all([
        sessionState().catch(() => "UNAVAILABLE"),
        fetch("http://127.0.0.1:3010/health", {
          cache: "no-store",
          signal: AbortSignal.timeout(3000),
          redirect: "error",
        }),
        fetch(new URL("/ok", config.LANGGRAPH_URL ?? "http://127.0.0.1:2024"), {
          cache: "no-store",
          signal: AbortSignal.timeout(3000),
          redirect: "error",
        }),
      ]);
      await agent.body?.cancel();
      if (!health.ok || !agent.ok) {
        await health.body?.cancel();
        return json({ error: "Start the agent and adapter with docker compose up -d." }, 503);
      }
      const counters = JSON.parse((await bounded(health)).toString());
      const count = (name: string) =>
        Number.isSafeInteger(counters[name]) && counters[name] >= 0
          ? (counters[name] as number)
          : 0;
      const accepted = count("accepted"),
        replied = count("replied"),
        failed = count("failed");
      const pending = Math.max(0, accepted - replied - failed);
      return json({
        mode: config.AGENT_MODEL_MODE === "openai" ? "openai" : "fixture",
        model: config.OPENAI_MODEL ?? null,
        session,
        activity: {
          accepted,
          replied,
          failed,
          pending,
          processing: pending > 0,
          lastOutcome: null,
        },
      });
    }
    if (action === "qr") {
      if ((await sessionState()) !== "SCAN_QR_CODE")
        return json({ error: "A QR is available only while the session is waiting to pair." }, 409);
      const response = await gateway("/api/default/auth/qr?format=image");
      if (!response.ok) {
        await response.body?.cancel();
        return json({ error: "The QR is not available yet. Refresh the connection status." }, 409);
      }
      const image = await bounded(response, 1024 * 1024);
      if (!image.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")))
        throw new Error("Invalid QR format");
      return new Response(image, { headers: { ...noStore, "Content-Type": "image/png" } });
    }
    if (action === "session") {
      const state = await sessionState();
      if (state === "WORKING" || state === "SCAN_QR_CODE" || state === "STARTING")
        return json({ status: state });
      const fresh = state === "NOT_STARTED";
      const response = await gateway(
        fresh ? "/api/sessions" : "/api/sessions/default/start",
        "POST",
        fresh
          ? {
              name: "default",
              start: true,
              config: {
                noweb: { store: { enabled: false, fullSync: false } },
                webhooks: [
                  {
                    url: "http://adapter:3010/webhook",
                    events: ["message"],
                    hmac: { key: config.WAHA_WEBHOOK_SECRET },
                    retries: { delaySeconds: 2, attempts: 3, policy: "constant" },
                  },
                ],
              },
            }
          : undefined,
      );
      await response.body?.cancel();
      if (!response.ok) throw new Error("Session could not start");
      return json({ status: "STARTING" });
    }
    if (typeof input.text !== "string" || !input.text.trim() || input.text.length > 1000)
      return json({ error: "Enter a message between 1 and 1,000 characters." }, 400);
    if (testing)
      return json({ error: "An agent check is already running. Wait for it to finish." }, 409);
    testing = true;
    const client = new Client({
      apiUrl: config.LANGGRAPH_URL ?? "http://127.0.0.1:2024",
      apiKey: null,
      timeoutMs: 150_000,
      callerOptions: { maxRetries: 0 },
    });
    let thread: string | undefined, run: string | undefined;
    try {
      thread = (await client.threads.create()).thread_id;
      run = (
        await client.runs.create(thread, "agent", {
          input: { messages: [{ role: "human", id: randomUUID(), content: input.text.trim() }] },
          config: { recursion_limit: 16 },
          multitaskStrategy: "reject",
        })
      ).run_id;
      await client.runs.join(thread, run);
      if ((await client.runs.get(thread, run)).status !== "success")
        throw new Error("Agent check did not succeed");
      const state = await client.threads.getState(thread);
      const messages = (
        state.values as {
          messages?: { type?: string; content?: unknown; tool_calls?: unknown[] }[];
        }
      ).messages;
      const last = messages?.at(-1);
      if (!last || last.type !== "ai" || last.tool_calls?.length)
        throw new Error("No final answer");
      const answer =
        typeof last.content === "string"
          ? last.content
          : Array.isArray(last.content)
            ? last.content
                .filter((p) => p.type === "text")
                .map((p) => p.text ?? "")
                .join("")
            : "";
      if (!answer.trim() || answer.length > 4000) throw new Error("No bounded answer");
      return json({
        answer,
        mode: config.AGENT_MODEL_MODE === "openai" ? "openai" : "fixture",
      });
    } catch {
      if (thread && run)
        await client.runs.cancel(thread, run, true, "interrupt").catch(() => undefined);
      return json(
        {
          error:
            "The agent check did not complete. Check the local Agent Server; no WhatsApp message was sent.",
        },
        502,
      );
    } finally {
      if (thread) await client.threads.delete(thread).catch(() => undefined);
      testing = false;
    }
  } catch {
    return json(
      { error: "Local services are unavailable. Check docker compose ps, then refresh." },
      503,
    );
  }
}

import { createServer } from "node:http";
import { adapter } from "./whatsapp/adapter.js";
import { agentServer } from "./whatsapp/agent-server.js";
import { speech } from "./media/speech.js";
import { mediaPipeline } from "./media/pipeline.js";
import { mediaGateway } from "./whatsapp/client.js";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}; run npm run setup`);
  return value;
}
const agent = agentServer(process.env.LANGGRAPH_URL ?? "http://127.0.0.1:2024");
const gateway = mediaGateway(
  process.env.WAHA_URL ?? "http://127.0.0.1:3011",
  required("WAHA_API_KEY"),
);
const app = adapter({
  process: mediaPipeline(gateway, speech(), agent.respond),
  session: "default",
  webhookSecret: required("WAHA_WEBHOOK_SECRET"),
  threadSecret: required("THREAD_SECRET"),
  allowed: (process.env.WAHA_ALLOWED_SENDERS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  reply: agent.reply,
  send: gateway.text,
});
const server = createServer(async (req, res) => {
  try {
    let size = 0;
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 64 * 1024) {
        res.writeHead(413).end();
        return;
      }
      chunks.push(chunk);
    }
    const response = await app.handle(
      new Request(`http://localhost${req.url}`, {
        method: req.method,
        headers: req.headers as Record<string, string>,
        body: req.method === "POST" ? Buffer.concat(chunks) : undefined,
      }),
    );
    res
      .writeHead(response.status, Object.fromEntries(response.headers))
      .end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.writeHead(400).end();
  }
});
server.requestTimeout = 10_000;
server.listen(3010, process.env.ADAPTER_HOST ?? "127.0.0.1", () =>
  console.log("WhatsApp adapter: http://127.0.0.1:3010 (local development)"),
);
for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.once(signal, () => {
    server.close();
    void app.idle().then(() => process.exit(0));
    setTimeout(() => process.exit(1), 300_000).unref();
  });

import { writeFile, mkdir } from "node:fs/promises";
const base = process.env.WAHA_URL ?? "http://127.0.0.1:3011";
const key = process.env.WAHA_API_KEY;
if (!key) throw new Error("Run npm run setup first");
const command = process.argv[2] ?? "status";
let path = "/api/sessions/default";
let method = "GET";
let body: unknown;
if (command === "start") {
  path = "/api/sessions";
  method = "POST";
  body = {
    name: "default",
    start: true,
    config: {
      noweb: { store: { enabled: false, fullSync: false } },
      webhooks: [
        {
          url: "http://adapter:3010/webhook",
          events: ["message"],
          hmac: { key: process.env.WAHA_WEBHOOK_SECRET },
          retries: { delaySeconds: 2, attempts: 3, policy: "constant" },
        },
      ],
    },
  };
} else if (command === "resume") {
  path = "/api/sessions/default/start";
  method = "POST";
} else if (command === "qr") path = "/api/default/auth/qr?format=image";
else if (command === "stop") {
  path = "/api/sessions/default/stop";
  method = "POST";
} else if (command !== "status") throw new Error("Use status, start, resume, qr, or stop");
const response = await fetch(new URL(path, base), {
  method,
  headers: {
    "X-Api-Key": key,
    "Content-Type": "application/json",
    Accept: command === "qr" ? "image/png" : "application/json",
  },
  body: body ? JSON.stringify(body) : undefined,
  signal: AbortSignal.timeout(20_000),
});
if (!response.ok) throw new Error(`WAHA returned HTTP ${response.status}; no raw response logged`);
if (command === "qr") {
  if (!response.headers.get("content-type")?.includes("image/png")) throw new Error("Expected PNG");
  const image = Buffer.from(await response.arrayBuffer());
  if (
    image.length > 1024 * 1024 ||
    !image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    throw new Error("Invalid PNG");
  await mkdir(".data", { recursive: true, mode: 0o700 });
  await writeFile(".data/pairing.png", image, { mode: 0o600 });
  console.log(
    "Open .data/pairing.png privately. Scan from WhatsApp > Linked devices. Do not share this image.",
  );
} else {
  const data = (await response.json()) as { status?: string };
  console.log({ action: command, status: data.status ?? "accepted" });
}

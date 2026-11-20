import { agentServer } from "../src/whatsapp/agent-server.js";
import { threadId } from "../src/whatsapp/messages.js";
const sender = process.argv[2];
if (!sender || !/^\d{5,20}@(c\.us|lid)$/.test(sender))
  throw new Error("Supply the exact private sender ID");
if (!process.env.THREAD_SECRET) throw new Error("Missing THREAD_SECRET");
const api = agentServer(process.env.LANGGRAPH_URL ?? "http://127.0.0.1:2024");
await api.client.threads.delete(threadId(process.env.THREAD_SECRET, "default", sender));
console.log("Deleted this sender's Agent Server thread. WAHA linked-device state is separate.");

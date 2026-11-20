import type { MediaGateway } from "./pipeline.js";
export async function withTyping<T>(
  gateway: MediaGateway,
  session: string,
  chat: string,
  work: () => Promise<T>,
  intervalMs = 8000,
): Promise<T> {
  if (!gateway.presence) return work();
  let pulse = Promise.resolve();
  const refresh = () => {
    pulse = gateway.presence!(session, chat, "typing").catch(() => {});
  };
  refresh();
  await pulse;
  const timer = setInterval(refresh, intervalMs);
  timer.unref();
  try {
    return await work();
  } finally {
    clearInterval(timer);
    await pulse;
    await gateway.presence(session, chat, "paused").catch(() => {});
  }
}

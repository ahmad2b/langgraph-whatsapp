import { createHmac } from "node:crypto";
import { z } from "zod";

const eventSchema = z.object({
  event: z.literal("message"),
  session: z.string(),
  payload: z.object({
    id: z.string().min(1).max(256),
    from: z.string().regex(/^\d{5,20}@(c\.us|lid)$/),
    fromMe: z.literal(false),
    hasMedia: z.boolean(),
    body: z.string().max(4000).nullish(),
    timestamp: z.number().int(),
    type: z.string().nullish(),
    media: z
      .object({
        url: z.string().max(2048),
        mimetype: z.string().max(100),
        error: z.unknown().optional(),
      })
      .nullish(),
  }),
});
export type Incoming = {
  id: string;
  chatId: string;
  text: string;
  kind: "text" | "image" | "voice";
  media?: { url: string; mimetype: string };
};
export function incoming(
  value: unknown,
  session: string,
  since: number,
  allowed: string[],
): Incoming | null {
  const parsed = eventSchema.safeParse(value);
  if (!parsed.success) return null;
  const { payload: p } = parsed.data;
  const now = Date.now() / 1000;
  if (
    parsed.data.session !== session ||
    p.timestamp < since ||
    p.timestamp < now - 120 ||
    p.timestamp > now + 30
  )
    return null;
  if (allowed.length && !allowed.includes(p.from)) return null;
  const base = { id: p.id, chatId: p.from, text: (p.body ?? "").trim() };
  if (!p.hasMedia)
    return base.text && (!p.type || p.type === "chat") ? { ...base, kind: "text" } : null;
  if (
    !p.media ||
    (p.media.error !== undefined && p.media.error !== null && p.media.error !== false)
  )
    return null;
  const type = p.media.mimetype.split(";", 1)[0].trim().toLowerCase();
  const media = { url: p.media.url, mimetype: type };
  if (["image/png", "image/jpeg", "image/webp"].includes(type) && (!p.type || p.type === "image"))
    return { ...base, kind: "image", media };
  if (type === "audio/ogg" && (!p.type || ["ptt", "voice", "audio"].includes(p.type)))
    return { ...base, kind: "voice", media };
  return null;
}
export function threadId(secret: string, session: string, chatId: string) {
  const hex = createHmac("sha256", secret)
    .update(JSON.stringify(["whatsapp-v1", session, chatId]))
    .digest("hex")
    .slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-8${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}

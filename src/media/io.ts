// Bound actual streamed bytes, including chunked responses. Never log provider bodies.
export async function bounded(response: Response, limit: number): Promise<Buffer> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Missing response body");
  try {
    if (!response.ok) throw new Error("Media/provider request failed");
    const length = response.headers.get("content-length");
    if (length !== null && (!/^\d+$/.test(length) || Number(length) > limit))
      throw new Error("Response too large");
    const chunks: Buffer[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) throw new Error("Response too large");
      chunks.push(Buffer.from(value));
    }
    if (!size) throw new Error("Empty response");
    return Buffer.concat(chunks, size);
  } finally {
    await reader.cancel().catch(() => {});
  }
}
export type MediaFile = { mimeType: string; data: string };
export type HumanContent =
  | string
  | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
export type AgentReply = { text: string; images: MediaFile[] };
export function imageSignature(bytes: Buffer, type: string) {
  if (type === "image/png")
    return bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
  if (type === "image/jpeg") return bytes.subarray(0, 3).equals(Buffer.from("ffd8ff", "hex"));
  return (
    type === "image/webp" &&
    bytes.subarray(0, 4).toString() === "RIFF" &&
    bytes.subarray(8, 12).toString() === "WEBP"
  );
}
export function opusSignature(bytes: Buffer) {
  return (
    bytes.subarray(0, 4).toString() === "OggS" &&
    bytes.subarray(0, 100).includes(Buffer.from("OpusHead"))
  );
}
export function decodeImage(data: string, mimeType: string, limit = 5 * 1024 * 1024) {
  if (!data || data.length > Math.ceil(limit / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data))
    throw new Error("Invalid image data");
  const bytes = Buffer.from(data, "base64");
  if (bytes.length > limit || bytes.toString("base64") !== data || !imageSignature(bytes, mimeType))
    throw new Error("Invalid image");
  return bytes;
}

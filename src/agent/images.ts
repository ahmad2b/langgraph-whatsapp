import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { bounded, decodeImage, imageSignature, type MediaFile } from "../media/io.js";
import { fixtureImage } from "../media/fixtures.js";

const cloudflareModel = "@cf/black-forest-labs/flux-2-klein-4b";
export async function createImage(prompt: string): Promise<MediaFile> {
  const mode = process.env.IMAGE_MODE ?? "fixture";
  if (mode === "fixture") return { mimeType: "image/png", data: fixtureImage };
  if (mode === "cloudflare") {
    const account = process.env.CLOUDFLARE_ACCOUNT_ID;
    const token = process.env.CLOUDFLARE_API_TOKEN;
    if (!account || !/^[a-f0-9]{32}$/i.test(account) || !token)
      throw new Error("Cloudflare requires a valid account ID and Workers AI API token");
    const form = new FormData();
    form.set("prompt", prompt);
    form.set("width", "1024");
    form.set("height", "1024");
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${cloudflareModel}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
        signal: AbortSignal.timeout(90_000),
        redirect: "error",
      },
    );
    const value = JSON.parse((await bounded(response, 8 * 1024 * 1024)).toString());
    if (value.success === false) throw new Error("Cloudflare image generation failed");
    const data = z.string().parse(value.result?.image ?? value.image);
    const bytes = Buffer.from(data, "base64");
    const mimeType = ["image/png", "image/jpeg", "image/webp"].find((type) =>
      imageSignature(bytes, type),
    );
    if (!mimeType) throw new Error("Unsupported generated image format");
    decodeImage(data, mimeType);
    return { mimeType, data };
  }
  if (mode !== "openai" || !process.env.OPENAI_API_KEY || !process.env.OPENAI_IMAGE_MODEL)
    throw new Error("Image generation requires explicit mode, model and key");
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL,
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "low",
      output_format: "png",
    }),
    signal: AbortSignal.timeout(90_000),
    redirect: "error",
  });
  const value = JSON.parse((await bounded(response, 8 * 1024 * 1024)).toString());
  const data = z.string().parse(value.data?.[0]?.b64_json);
  decodeImage(data, "image/png");
  return { mimeType: "image/png", data };
}
export const generateImage = tool(
  async ({ prompt }) => {
    const file = await createImage(prompt);
    return [
      `${(process.env.IMAGE_MODE ?? "fixture") === "fixture" ? "Fixture image (one pixel), not real generation" : "Image generated"}. Requested image: ${prompt}. Delivery is handled by the application; do not claim it was sent yet.`,
      { kind: "generated_image", ...file },
    ];
  },
  {
    name: "generate_image",
    description:
      "Create one image when the user explicitly requests image generation. No editing of existing images. Delivery is handled by the application.",
    schema: z.object({ prompt: z.string().min(1).max(2000) }),
    responseFormat: "content_and_artifact",
  },
);

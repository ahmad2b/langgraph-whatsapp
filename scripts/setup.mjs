import { randomBytes } from "node:crypto";
import { writeFile, readFile } from "node:fs/promises";
try {
  const example = await readFile(".env.example", "utf8");
  const secrets = ["WAHA_API_KEY", "WAHA_WEBHOOK_SECRET", "THREAD_SECRET"]
    .map((k) => `${k}=${randomBytes(32).toString("hex")}`)
    .join("\n");
  await writeFile(".env", `${example}\n${secrets}\n`, { flag: "wx", mode: 0o600 });
  console.log("Created private .env in fixture mode; no model key required.");
} catch (error) {
  if (error.code === "EEXIST") console.log("Kept existing .env unchanged.");
  else throw error;
}

const endpoints = [
  ["agent", `${process.env.LANGGRAPH_URL ?? "http://127.0.0.1:2024"}/ok`, {}],
  ["adapter", "http://127.0.0.1:3010/health", {}],
  [
    "gateway",
    `${process.env.WAHA_URL ?? "http://127.0.0.1:3011"}/api/sessions`,
    { "X-Api-Key": process.env.WAHA_API_KEY ?? "" },
  ],
] as const;
const deadline = Date.now() + (process.argv.includes("--wait") ? 30_000 : 0);
while (true) {
  const results = await Promise.all(
    endpoints.map(async ([name, url, headers]) => {
      try {
        const response = await fetch(url, { headers, signal: AbortSignal.timeout(1000) });
        await response.body?.cancel();
        return { name, status: response.status, ok: response.ok };
      } catch {
        return { name, status: "unavailable", ok: false };
      }
    }),
  );
  if (results.every((r) => r.ok) || Date.now() >= deadline) {
    for (const result of results) console.log(`${result.name}: ${result.status}`);
    if (results.some((r) => !r.ok)) process.exitCode = 1;
    break;
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
}

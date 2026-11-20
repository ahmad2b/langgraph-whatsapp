// Add the final public repository URL when the project is published.
const repository = process.env.NEXT_PUBLIC_REPOSITORY_URL?.trim() || null;
export const site = {
  repository: repository || "/setup",
  hasRepository: Boolean(repository),
  sourceLabel: repository ? "GitHub" : "Setup guide",
  author: { name: "Ahmad", url: "https://github.com/ahmad2b" },
  booking: "https://cal.com/mahmad2b/15min",
  email: "ahmadshaukat_4@outlook.com",
  cloneCommand: repository ? `git clone ${repository}` : "npm ci && npm run setup",
} as const;

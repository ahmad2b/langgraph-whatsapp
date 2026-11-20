# LangGraph × WhatsApp website

The project website: a landing page that explains the starter, and a local setup page that links WhatsApp and tests a reply. Built with Next.js (App Router).

## Run it

From the repository root:

```sh
npm run web:install
npm run web:dev
```

Open http://localhost:3004.

- `/` is the landing page.
- `/setup` connects to the running local backend (agent, adapter and WAHA). It reads the root `.env` on the server only and never sends API keys, raw gateway responses, phone numbers or conversation content to the browser. Its optional agent test uses a temporary thread and sends no WhatsApp message.

Set `NEXT_PUBLIC_REPOSITORY_URL` to the public repository URL to show GitHub links in the header and hero.

## Checks

```sh
npm run web:check
npm run web:build
```

Formatting uses the repository's Prettier configuration.

## Structure

- `app/page.tsx`: landing page. `app/landing.css` holds its styles.
- `app/setup/`: local setup page. `components/setup-flow.tsx` is the step-by-step flow; `lib/backend.ts` and `app/api/setup/` are its server-side routes.
- `components/icons.tsx`: the project's own icon set. Icons use a bold outline over an offset colour blob (`--icon-fill`), and feature icons draw themselves in when they scroll into view. Reduced-motion users see them finished.
- `app/globals.css`: theme colour tokens (`--theme-*`) shared by every page.
- `app/icon.svg`: the logo and favicon.

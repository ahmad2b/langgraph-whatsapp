# Give your LangGraph agent a WhatsApp number

A TypeScript starter that lets people talk to your agent through WhatsApp: send a message, record a voice note, ask about a photo, or request an image, all in the same conversation.

Connect a WhatsApp account you control, pair it by scanning a QR code, and start chatting. The starter includes the WhatsApp connection, media handling and conversation routing, so you can focus on your agent's instructions and tools.

## What people can do

| Send to the agent                     | What they get back                                   |
| ------------------------------------- | ---------------------------------------------------- |
| A text message                        | A text answer from the agent                         |
| An English voice note                 | A text answer to what they said                      |
| A photo or screenshot with a question | An answer based on the image and caption             |
| A request to create an image          | A generated image in the same chat                   |
| A follow-up question                  | An answer using that conversation's earlier messages |

WhatsApp shows **typing…** while the agent works. Each sender has a separate conversation, and replies return to the chat that sent the request.

For example:

```text
You: Remember that my favorite color is green.
Agent: Got it. Your favorite color is green.

You: [voice note] What color did I tell you I like?
Agent: Green.

You: [photo] What can you see in this picture?
Agent: [description of the photo]

You: Create an illustration of a green sailboat.
Agent: [generated image]
```

These illustrate the interaction; exact model responses vary.

## Why use this starter?

- **Meet people in a chat they already use.** They can reach your agent from WhatsApp on their phone or desktop.
- **Let people choose how to ask.** Text, voice notes and photos enter the same agent conversation.
- **Keep context between messages.** LangGraph manages the conversation state, and LangChain summarizes longer histories.
- **Bring your own agent behavior.** Instructions and tools live in a small agent module, separate from WhatsApp transport code.
- **Start with a working local example.** Docker setup, pairing, signed webhooks, media validation and typing indicators are included.

Use it as a starting point for a personal assistant, a photo-based helper, or a WhatsApp demo of your own agent workflow. The included agent demonstrates conversation, a calculator tool and image generation. Add your own tools for the work you want it to perform.

## LangGraph, LangChain and Deep Agents

The included agent uses LangChain's `createAgent` and runs through the official LangGraph Agent Server. The WhatsApp adapter sends messages to that server and reads the agent's response.

To customize it, start with [`src/agent/index.ts`](src/agent/index.ts): change the instructions, add tools, or replace the exported agent. [`langgraph.json`](langgraph.json) registers that export as `agent`.

[Deep Agents](https://docs.langchain.com/oss/javascript/deepagents/overview) is a possible extension for workflows that need planning, files and subagents. Its JavaScript SDK returns a compiled LangGraph graph. This starter currently ships with `createAgent`; a Deep Agents integration has not been implemented or tested here. Adapting one requires preserving the adapter's message-state and reply contract, and checking tool outputs and run limits for the intended workflow.

## Included providers

| Job                                                  | Current provider                      |
| ---------------------------------------------------- | ------------------------------------- |
| Chat, photo understanding and conversation summaries | OpenAI GPT-6 Luna                     |
| English voice-note transcription                     | Cloudflare Whisper Large V3 Turbo     |
| Image generation                                     | Cloudflare FLUX.2 Klein 4B            |
| WhatsApp connection                                  | WAHA, using a linked WhatsApp account |

Cloudflare calls go directly to its APIs. Voice notes receive **text replies**. Group messages, self messages and old events are ignored. `WAHA_ALLOWED_SENDERS` can restrict access to exact sender IDs.

## Setup

You need Node.js 24 or newer, Docker Compose, a WhatsApp account you control for the agent, and a second WhatsApp account to message it from (the agent ignores its own messages). No API keys are needed to start: the default fixture mode gives scripted replies. For real answers, add an OpenAI API key and a Cloudflare Workers AI API token; usage is billed by those providers.

```sh
npm ci
npm run setup
```

`setup` creates a private `.env` from `.env.example` and generates the WhatsApp secrets. It keeps an existing `.env` unchanged. Never commit or share that file or pairing QR codes.

For live providers, configure these privately:

```dotenv
AGENT_MODEL_MODE=openai
OPENAI_MODEL=gpt-6-luna
OPENAI_API_KEY=your-openai-key
SPEECH_MODE=cloudflare
IMAGE_MODE=cloudflare
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-workers-ai-token
```

Direct Cloudflare API calls need an account-scoped token with Workers AI Read and Edit permissions. Create it from Workers AI → Use REST API → Create API Token. No local Cloudflare service or Worker deployment is needed.

For a demo without provider calls, leave chat, speech and image modes at `fixture`. Fixture output is scripted; it does not understand speech or images.

## Run and pair WhatsApp

```sh
docker compose up -d --build
npm run status -- --wait
npm run whatsapp -- start
npm run whatsapp -- qr
```

Open `.data/pairing.png` privately and scan it from WhatsApp → Linked devices. `start` creates a new session; use `resume` for an existing stopped session. `qr` generates a fresh pairing image.

Prefer a browser? Run the website (see below) and open http://localhost:3004/setup: **Start linking** shows the QR on the page, and the page then walks you through testing a reply.

```sh
npm run whatsapp -- status
npm run whatsapp -- resume
npm run whatsapp -- stop
```

After changing provider configuration, recreate the agent and adapter with `docker compose up -d agent adapter`. Keep the WAHA service and its session volume.

## Website and browser setup

The Next.js site includes a landing page and a local setup interface for the running backend.

```sh
npm run web:install
npm run web:dev
```

Open http://localhost:3004. Visit `/setup` for local connection status, pairing and an optional paid agent test. Keys stay server-side. The site uses one flat Ink and leaf theme across every page.

Run `npm run web:check` for TypeScript and lint checks, and `npm run web:build` for a production build. See [`web/README.md`](web/README.md) for details.

## Useful commands

| Command                                | Purpose                                         |
| -------------------------------------- | ----------------------------------------------- |
| `npm run setup`                        | Create initial private configuration            |
| `npm run status`                       | Check agent, adapter and gateway health         |
| `npm run whatsapp -- status`           | Check the linked WhatsApp session               |
| `npm run forget -- '15550000001@c.us'` | Delete one exact sender's agent conversation    |
| `npm run format`                       | Format supported source and configuration files |
| `npm run format:check`                 | Check formatting without editing files          |
| `npm run check`                        | Check formatting and TypeScript                 |
| `npm run agent:dev`                    | Run the Agent Server outside Docker             |
| `npm run adapter`                      | Run the WhatsApp adapter outside Docker         |

Before deleting a conversation, stop the adapter, run `forget` with the actual exact sender ID, then start the adapter. This deletes agent memory, not the phone's WhatsApp messages or pairing.

## Code map

- `src/agent/`: model, instructions, calculator, image generation and fixture model.
- `src/whatsapp/`: signed webhook handling, message validation, LangGraph SDK and gateway client.
- `src/media/`: transcription, media validation, typing and reply routing.
- `scripts/`: setup, status, pairing and conversation deletion.
- `web/`: Next.js landing, local setup interface and illustrative WhatsApp demo.

`src/media/pipeline.ts` is the main message flow. `src/agent/index.ts` defines the assistant. `.prettierrc.json` and `.editorconfig` define consistent formatting; Prettier excludes secrets and generated state. Use your editor's Prettier integration to format on save.

## Local services and conversation state

| Service                | Local port |
| ---------------------- | ---------- |
| LangGraph Agent Server | 2024       |
| WhatsApp adapter       | 3010       |
| WAHA gateway           | 3011       |

The local Agent Server needs no database: it keeps threads in memory and saves them as files in a volume (LangGraph's production Agent Server uses Postgres and Redis instead). The named volumes `langchain-whatsapp_agent-state` and `langchain-whatsapp_waha-noweb-sessions` hold conversation state and pairing. Preserve them when rebuilding. Private `.env`, `.data/`, pairing images and generated state are ignored by Git and excluded from Docker builds.

## Scope and limitations

This is a working local starter. The text, voice-note, photo, image-generation and memory flows have been checked locally and confirmed through WhatsApp. It is intended as a foundation for your own agent application.

- The official LangGraph development server delays filesystem writes, so immediate crash persistence is not guaranteed.
- Adapter deduplication is in memory; uncertain deliveries are not blindly retried.
- The sample's run limits suit short interactions. Longer or more complex agent workflows need their own limits and delivery handling.
- Model calls have timeouts, bounded outputs and no automatic retries. These limits do not enforce a monetary spending cap.
- Keep local service ports private. A public deployment needs authentication, durable delivery handling and operational monitoring.
- WAHA uses a linked WhatsApp session; this example does not implement Meta's official WhatsApp Business Cloud API.

## References

- [Deep Agents JavaScript SDK](https://reference.langchain.com/javascript/deepagents)
- [LangChain memory](https://docs.langchain.com/oss/javascript/langchain/short-term-memory)
- [Cloudflare direct API setup](https://developers.cloudflare.com/workers-ai/get-started/rest-api/)
- [Whisper Turbo](https://developers.cloudflare.com/workers-ai/models/whisper-large-v3-turbo/)
- [OpenAI Luna](https://developers.openai.com/api/docs/models/gpt-6-luna)
- [Prettier](https://prettier.io/docs/install)

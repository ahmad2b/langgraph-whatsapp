import {
  IconContacts,
  IconHeadset,
  IconDatabase,
  IconRecap,
  IconRestart,
  IconVerified,
  IconArrowUpRight,
  IconMemory,
  IconCode,
  IconRepo,
  IconImage,
  IconMic,
} from "@/components/icons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MessageFlow } from "@/components/landing/message-flow";
import { SiteFooter, SiteHeader } from "@/components/landing/site-chrome";
import { Strip } from "@/components/landing/strip";
import { site } from "@/lib/site";
import "./landing.css";

const included = [
  {
    icon: IconMic,
    t: "Text and voice notes",
    d: "People type or send an English voice note. The agent answers in text.",
  },
  {
    icon: IconImage,
    t: "Photos and images",
    d: "It reads a photo with its caption, and can send back a generated image.",
  },
  {
    icon: IconMemory,
    t: "Memory per sender",
    d: "Each person gets a private thread. Long chats are summarized.",
  },
  {
    icon: IconCode,
    t: "Your agent, your tools",
    d: "Instructions and tools live in one file: src/agent/index.ts.",
  },
];

const extendStarter = [
  {
    icon: IconRestart,
    t: "A /new command",
    d: "Let someone start fresh. Each chat maps to one thread today; add a counter to the thread ID and /new opens the next one.",
  },
  {
    icon: IconRecap,
    t: "A recap on reset",
    d: "Before starting over, send the person a short summary of the old chat and carry it into the new thread.",
  },
  {
    icon: IconContacts,
    t: "Contact profiles",
    d: "Keep each person’s name, language and preferences in LangGraph’s long-term store, so they carry across threads.",
  },
  {
    icon: IconHeadset,
    t: "Human handoff",
    d: "Pause the agent and pass a chat to a person with a LangGraph interrupt, then hand it back.",
  },
  {
    icon: IconDatabase,
    t: "A production backend",
    d: "Run LangGraph’s production Agent Server on Postgres and Redis for durable threads and queued runs.",
  },
  {
    icon: IconVerified,
    t: "The official Cloud API",
    d: "Swap WAHA for Meta’s WhatsApp Business Cloud API behind the same adapter.",
  },
];

const faqs = [
  {
    q: "What are the extensions?",
    a: "Ideas for taking the starter further, not features it ships with: things like a /new command, human handoff or a production backend. Each needs code of your own; the starter already handles the WhatsApp side, so you can focus on that part.",
  },
  {
    q: "What are its limits today?",
    a: "It’s a starter for your first users. WAHA is an unofficial gateway that links like WhatsApp Web, not Meta’s Cloud API. It answers private one-to-one chats only, runs on your machine with up to four replies at once, and doesn’t retry a failed reply. There’s no built-in spending cap, so set one with your provider. The extensions above show how to grow past each of these.",
  },
  {
    q: "What do I need to run it?",
    a: "Docker Compose and Node.js 24. Compose starts WAHA, the WhatsApp gateway, plus the adapter and a local LangGraph Agent Server with the example agent, so there’s nothing else to host. You also need a WhatsApp account for the agent and a second account to message it from.",
  },
  {
    q: "Does it need a database?",
    a: "No. The local LangGraph Agent Server keeps threads in memory and saves them as files in a Docker volume, so there’s no Postgres or Redis to run. It delays those writes, so a crash can lose the newest messages. LangGraph’s production Agent Server uses Postgres and Redis instead.",
  },
  {
    q: "How does a WhatsApp chat map to a LangGraph thread?",
    a: "Each chat gets a fixed thread ID, derived from the chat and a private secret. The same person always lands in the same thread, and LangGraph keeps the history. Different senders never share a thread.",
  },
  {
    q: "Can I connect my own LangGraph agent?",
    a: "Yes. Replace the export in src/agent/index.ts; langgraph.json serves it as the graph named agent. Any graph with a messages state works. To use a LangGraph server you already run, point LANGGRAPH_URL at it when you run the adapter yourself. Only the included agent has been tested.",
  },
  {
    q: "What does my agent receive?",
    a: "A human message in the standard LangChain format. Text arrives as text, voice notes arrive already transcribed, and photos arrive as an image with the caption as the question.",
  },
  {
    q: "How does the reply get back to WhatsApp?",
    a: "The adapter waits for the run to finish, takes the last AI message (up to 4,000 characters) and sends it to the chat the message came from. If the agent’s generate_image tool made a picture, it’s sent with that text as the caption.",
  },
  {
    q: "Are my keys and chats private?",
    a: "Keys stay in your private .env on the server, and every service listens on localhost only. Only senders you list in WAHA_ALLOWED_SENDERS reach the agent; everyone else is ignored. Keep the pairing QR code private: scanning it links that WhatsApp account to this gateway.",
  },
];

const references = [
  {
    group: "WhatsApp gateway",
    links: [
      ["WAHA on GitHub", "https://github.com/devlikeapro/waha"],
      ["WAHA webhooks and events", "https://waha.devlike.pro/docs/how-to/events/"],
      ["WAHA security", "https://waha.devlike.pro/docs/how-to/security/"],
    ],
  },
  {
    group: "LangGraph and LangChain",
    links: [
      [
        "Run a local Agent Server",
        "https://docs.langchain.com/oss/javascript/langgraph/local-server",
      ],
      ["Agent Server", "https://docs.langchain.com/langsmith/agent-server"],
      [
        "Short-term memory",
        "https://docs.langchain.com/oss/javascript/langchain/short-term-memory",
      ],
    ],
  },
  {
    group: "Going further",
    links: [
      ["Deep Agents overview", "https://docs.langchain.com/oss/javascript/deepagents/overview"],
      ["ReAct agent template", "https://github.com/langchain-ai/react-agent-js"],
    ],
  },
];

export default function Landing() {
  return (
    <div className="landing">
      <a href="#how" className="skip-link">
        Skip to how it works
      </a>
      <SiteHeader page="home" />

      <main>
        {/* What it is */}
        <section className="wa-hero" aria-labelledby="hero-title">
          <div className="wa-wrap wa-center">
            <h1 id="hero-title">
              Give your LangGraph agent <mark>its WhatsApp.</mark>
            </h1>
            <p className="wa-lede">
              An open-source project that shows how to connect a LangGraph agent to a WhatsApp
              account you control. People message it like a contact, and it replies in the same
              chat.
            </p>
            <div className="wa-actions">
              {site.hasRepository ? (
                <a className="wa-btn" href={site.repository} target="_blank" rel="noreferrer">
                  <IconRepo aria-hidden="true" /> View on GitHub
                </a>
              ) : (
                <a className="wa-btn" href="/setup">
                  Open the setup guide
                </a>
              )}
              <a className="wa-btn wa-btn-ghost" href="#how">
                How it works
              </a>
            </div>
          </div>
        </section>

        {/* What it has */}
        <section id="included" className="wa-section" aria-labelledby="included-title">
          <div className="wa-wrap">
            <header className="wa-head">
              <p className="wa-eyebrow">What’s included</p>
              <h2 id="included-title">Everything between WhatsApp and your agent.</h2>
              <p>Pair it once by scanning a QR code.</p>
            </header>
            <Strip items={included} label="What’s included" />
          </div>
        </section>

        {/* How a message moves */}
        <section id="how" className="wa-section wa-band" aria-labelledby="how-title">
          <div className="wa-wrap">
            <header className="wa-head">
              <p className="wa-eyebrow">How it works</p>
              <h2 id="how-title">One message, there and back.</h2>
              <p>Four stops come with the starter. The agent is yours.</p>
            </header>
            <MessageFlow />
          </div>
        </section>

        {/* Where to take it from here: ideas, not features */}
        <section id="extensions" className="wa-section" aria-labelledby="ext-title">
          <div className="wa-wrap">
            <header className="wa-head">
              <p className="wa-eyebrow">Extensions</p>
              <h2 id="ext-title">Where you could take it from here.</h2>
              <p>
                Ideas, not features. The starter is the base; each of these needs code of your own.
              </p>
            </header>
            <Strip items={extendStarter} label="Extensions" tone="idea" columns={3} />
            <p className="wa-help">
              Thinking of building on this? Tell me what you have in mind, and we’ll figure out
              where to start together.{" "}
              <a className="wa-textlink" href={site.booking} target="_blank" rel="noreferrer">
                Grab a 15-min chat
              </a>
            </p>
          </div>
        </section>

        {/* Questions */}
        <section id="faq" className="wa-section wa-band" aria-labelledby="faq-title">
          <div className="wa-wrap">
            <header className="wa-head">
              <p className="wa-eyebrow">FAQ</p>
              <h2 id="faq-title">Questions</h2>
            </header>
            <Accordion className="wa-faq">
              {faqs.map((f) => (
                <AccordionItem key={f.q} value={f.q}>
                  <AccordionTrigger>{f.q}</AccordionTrigger>
                  <AccordionContent>
                    <p>{f.a}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Where to read more */}
        <section id="references" className="wa-section" aria-labelledby="refs-title">
          <div className="wa-wrap">
            <header className="wa-head">
              <p className="wa-eyebrow">References</p>
              <h2 id="refs-title">Read more</h2>
            </header>
            <div className="wa-refs">
              {references.map((r) => (
                <div key={r.group}>
                  <h3>{r.group}</h3>
                  <ul>
                    {r.links.map(([label, href]) => (
                      <li key={href}>
                        <a href={href} target="_blank" rel="noreferrer">
                          {label} <IconArrowUpRight aria-hidden="true" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter page="home" />
    </div>
  );
}

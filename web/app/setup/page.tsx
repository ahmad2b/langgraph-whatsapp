import type { Metadata } from "next";
import Link from "next/link";
import { IconArrowUpRight } from "@/components/icons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CopyLine } from "@/components/landing/copy-line";
import { SiteFooter, SiteHeader } from "@/components/landing/site-chrome";
import { SetupFlow } from "@/components/setup-flow";
import "../landing.css";
import "./setup.css";

export const metadata: Metadata = {
  title: "Local setup · Give your agent its WhatsApp",
  description:
    "Link the WhatsApp your agent will use, test a real reply, then switch on your LangGraph agent. Runs on your machine.",
  robots: { index: false, follow: false },
};

const details = [
  {
    q: "What connects to what?",
    a: "A message goes from WhatsApp to WAHA (the gateway), then to the adapter, then to your LangGraph agent, and the reply comes back to the same chat. Docker runs those three. This page runs on your computer and talks to them through a few fixed routes on its own server.",
  },
  {
    q: "Where do conversations live?",
    a: "Each person gets their own LangGraph thread, saved in a Docker volume. Long chats are summarized. Saves happen a few seconds late, so a crash can lose the newest messages. Your WhatsApp link is saved in a separate volume, so you don’t need to scan again after a restart.",
  },
  {
    q: "What can people send?",
    a: "Private text messages, English voice notes and photos. Groups, status updates and the agent’s own messages are ignored. It’s built for trying an idea, not for heavy traffic.",
  },
  {
    q: "Is the QR code safe to share?",
    a: "No, keep it private. Scanning it links that WhatsApp account to this gateway. Only scan it with the account you want the agent to use. This page clears the code once the phone connects.",
  },
  {
    q: "How do I unlink or start over?",
    a: "On the agent’s phone, go to WhatsApp → Linked devices and remove this device. To clear what the agent remembers about one person, run npm run forget with their WhatsApp ID. Unlinking and forgetting are separate.",
  },
];

export default function SetupPage() {
  const hosted = Boolean(process.env.VERCEL_ENV);

  return (
    <div className="landing setup-page">
      <a href="#setup" className="skip-link">
        Skip to setup
      </a>
      <SiteHeader page="setup" />

      <main>
        <section className="wa-wrap st-hero" aria-labelledby="st-title">
          <div className="wa-center">
            <p className="wa-eyebrow">Local setup</p>
            <h1 id="st-title">
              Link your agent’s <mark>WhatsApp.</mark>
            </h1>
            <p className="wa-lede">
              Scan a QR code with the agent’s phone, send a test message from another account, then
              switch on your agent. This page runs on your computer, and API keys stay on the
              server.
            </p>
          </div>
          <aside className="st-before" aria-labelledby="before-title">
            <h2 id="before-title">Before you start</h2>
            <ul>
              <li>
                <strong>1. Install and create your settings.</strong> Once, from the project folder.
                This makes a private .env file with the secrets Docker needs.
                <CopyLine code="npm ci && npm run setup" label="Copy install and setup commands" />
              </li>
              <li>
                <strong>2. Start the backend.</strong> Docker runs the WhatsApp gateway, the adapter
                and your LangGraph agent.
                <CopyLine code="docker compose up -d --build" label="Copy backend start command" />
              </li>
              <li>
                <strong>3. Have two WhatsApp accounts ready.</strong> One becomes the agent (a spare
                is best). The other sends it test messages, because the agent ignores its own.
              </li>
              <li>
                <strong>No API keys needed to start.</strong> Replies are scripted until you add
                your keys in step 3 below.
              </li>
            </ul>
          </aside>
        </section>

        <section className="setup-section" aria-label="Link and test your WhatsApp account">
          {hosted ? (
            <div className="wa-wrap st-local-guide" id="setup">
              <p className="wa-eyebrow">Run it locally</p>
              <h2>Pairing happens on your computer.</h2>
              <p>
                This website introduces the project. To link WhatsApp, run the starter locally and
                open its setup page. Live mode needs OpenAI and Cloudflare keys. Fixture mode makes
                no provider calls.
              </p>
              <CopyLine
                code={
                  "npm ci\nnpm run setup\nnpm run web:install\ndocker compose up -d --build\nnpm run web:dev"
                }
                label="Copy local setup commands"
              />
              <p className="st-requirements">You’ll need Node.js 24+ and Docker Compose.</p>
              <a className="wa-btn" href="http://localhost:3004/setup">
                Open local setup <IconArrowUpRight aria-hidden="true" />
              </a>
            </div>
          ) : (
            <SetupFlow />
          )}
        </section>

        <section className="wa-section wa-soft st-details" aria-labelledby="details-title">
          <div className="wa-wrap">
            <header className="wa-head">
              <p className="wa-eyebrow">Under the hood</p>
              <h2 id="details-title">What this page connects.</h2>
              <p>
                LangGraph runs your agent. The starter carries WhatsApp messages, voice transcripts
                and photos to it, keeps each conversation separate, and sends replies to the right
                person.
              </p>
              <div className="st-links">
                <Link className="wa-textlink" href="/#how">
                  Follow one message
                </Link>
                <Link className="wa-textlink" href="/#included">
                  What’s included
                </Link>
              </div>
            </header>
            <Accordion className="wa-faq">
              {details.map((d) => (
                <AccordionItem key={d.q} value={d.q}>
                  <AccordionTrigger>{d.q}</AccordionTrigger>
                  <AccordionContent>
                    <p>{d.a}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </main>

      <SiteFooter page="setup" />
    </div>
  );
}

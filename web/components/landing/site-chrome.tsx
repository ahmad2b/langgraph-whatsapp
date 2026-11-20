import Link from "next/link";
import { IconArrowUpRight, IconRepo } from "@/components/icons";
import { site } from "@/lib/site";

type Page = "home" | "setup" | "404";

/**
 * Brand crest: two comma shapes (a traditional Japanese tomoe crest) swirling inside a ring —
 * one message going out, one coming back. Original drawing; app/icon.svg is the same mark.
 */
export function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="wa-mark">
      <rect width="32" height="32" rx="9" fill="var(--ink)" />
      <circle cx="16" cy="16" r="11.6" fill="none" stroke="var(--hi)" strokeWidth="1.6" />
      <g transform="rotate(-35 16 16)" stroke="var(--ink)" strokeWidth="1.3">
        <path
          d="M16 7.6a8.4 8.4 0 0 1 0 16.8a4.2 4.2 0 0 1 0-8.4a4.2 4.2 0 0 0 0-8.4z"
          fill="var(--hi)"
        />
        <path
          d="M16 24.4a8.4 8.4 0 0 1 0-16.8a4.2 4.2 0 0 1 0 8.4a4.2 4.2 0 0 0 0 8.4z"
          fill="#fff"
        />
      </g>
    </svg>
  );
}

/** Header shared by the landing page, /setup and the 404 page. */
export function SiteHeader({ page }: { page: Page }) {
  return (
    <header className="wa-header">
      <div className="wa-wrap wa-header-inner">
        <Link href="/" className="wa-brand" aria-label="LangGraph × WhatsApp, home">
          <BrandMark />
          <span>
            LangGraph <span className="wa-brand-x">×</span> WhatsApp
          </span>
        </Link>
        <nav aria-label="Site" className="wa-nav">
          <Link href="/#included">What’s included</Link>
          <Link href="/#how">How it works</Link>
          <Link href="/#extensions">Extensions</Link>
          <Link href="/#faq">FAQ</Link>
          <Link href="/setup" aria-current={page === "setup" ? "page" : undefined}>
            Setup
          </Link>
        </nav>
        {/* Until the repository is public, Setup in the nav is the only destination. */}
        {site.hasRepository ? (
          <a className="wa-source" href={site.repository} target="_blank" rel="noreferrer">
            <IconRepo aria-hidden="true" />
            <span>GitHub</span>
          </a>
        ) : (
          <span className="wa-source-slot" aria-hidden="true" />
        )}
      </div>
    </header>
  );
}

/** Help offer, worded for where the reader is: what Ahmad can help with, then two ways to ask. */
function HelpOffer({ page }: { page: Page }) {
  const copy =
    page === "setup"
      ? {
          title: "Stuck on a step?",
          body: "I can help you get WhatsApp linked and your agent replying.",
        }
      : {
          title: "Have questions about your implementation?",
          body: "I can help you connect WhatsApp to your LangGraph agent, design its tools, or plan the move to Meta’s official Cloud API.",
        };
  return (
    <div className="wa-note">
      <h2 className="wa-note-title">{copy.title}</h2>
      <p>{copy.body}</p>
      <div className="wa-note-actions">
        <a className="wa-btn wa-btn-hi" href={site.booking} target="_blank" rel="noreferrer">
          Schedule a 15-min chat <IconArrowUpRight aria-hidden="true" />
        </a>
        <span className="wa-note-or">
          or email{" "}
          <a className="wa-textlink" href={`mailto:${site.email}`}>
            {site.email}
          </a>
        </span>
      </div>
    </div>
  );
}

export function SiteFooter({ page }: { page: Page }) {
  return (
    <footer className="wa-footer">
      <div className="wa-wrap">
        <HelpOffer page={page} />
        <nav className="wa-footer-links" aria-label="Footer">
          <Link href="/#how">How it works</Link>
          <Link href="/setup">Setup</Link>
          <Link href="/#faq">FAQ</Link>
          {site.hasRepository ? (
            <a href={site.repository} target="_blank" rel="noreferrer">
              GitHub
            </a>
          ) : null}
        </nav>
        <div className="wa-footer-meta">
          <span className="wa-footer-brand">
            <BrandMark /> Built with LangGraph, LangChain and WAHA by{" "}
            <a href={site.author.url} target="_blank" rel="noreferrer">
              {site.author.name}
            </a>
            .
          </span>
        </div>
      </div>
    </footer>
  );
}

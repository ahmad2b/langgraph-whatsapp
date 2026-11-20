import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/landing/site-chrome";
import "./landing.css";

export default function NotFound() {
  return (
    <div className="landing">
      <SiteHeader page="404" />
      <main className="wa-wrap wa-center wa-404">
        <p className="wa-eyebrow">404 · Not delivered</p>
        <h1>
          This page <mark>didn’t arrive.</mark>
        </h1>
        <p className="wa-lede">It may have moved, or the link may be old.</p>
        <div className="wa-404-chat" aria-hidden="true">
          <p className="wa-b wa-b-me">Is this page here?</p>
          <small>Not delivered</small>
        </div>
        <div className="wa-actions">
          <Link className="wa-btn" href="/">
            Back to the home page
          </Link>
          <Link className="wa-textlink" href="/#how">
            See how it works
          </Link>
        </div>
      </main>
      <SiteFooter page="404" />
    </div>
  );
}

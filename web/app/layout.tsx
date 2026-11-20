import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SmoothScroll } from "@/components/smooth-scroll";

// One family for headings and text; globals.css points --font-ui at it.
const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});
const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LangGraph × WhatsApp · Give your LangGraph agent its WhatsApp",
  description:
    "An open-source TypeScript starter. Scan one QR code and people can text, voice-note or send photos to your LangGraph agent on WhatsApp. It replies in the same chat and remembers.",
  openGraph: {
    type: "website",
    title: "Give your agent its WhatsApp",
    description:
      "Open-source starter that gives your LangGraph agent its own WhatsApp. People text it, it answers and remembers. Text, voice notes, photos and memory.",
    siteName: "LangGraph × WhatsApp",
  },
  twitter: {
    card: "summary",
    title: "Give your agent its WhatsApp",
    description:
      "Open-source starter: your LangGraph agent gets its own WhatsApp. Text, voice notes, photos and memory.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn("font-serif antialiased", sans.variable, mono.variable)}>
      <body>
        <SmoothScroll />
        {children}
        {process.env.VERCEL_ENV === "production" ? <Analytics /> : null}
      </body>
    </html>
  );
}

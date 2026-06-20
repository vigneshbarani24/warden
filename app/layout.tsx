import type { ReactNode } from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { JetBrains_Mono, Instrument_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";

// JetBrains Mono — data/code on both the dark console and the light landing.
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });
// Instrument Sans — landing body. Source Serif 4 — display headings (normal-width,
// institutional; replaces Instrument Serif, which read as vertically stretched).
const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument", display: "swap" });
const displaySerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Warden — The control plane for enterprise AI agents",
  description:
    "A policy decision point agents call before they act, and a tamper-evident hash-chained ledger they write to after. On Amazon Aurora DSQL.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${mono.variable} ${instrument.variable} ${displaySerif.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}

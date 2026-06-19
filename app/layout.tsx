import type { ReactNode } from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { JetBrains_Mono, Instrument_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";

// JetBrains Mono — data/code on both the dark console and the light landing.
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });
// Instrument Sans/Serif — the light institutional landing (matches the Optimus look).
const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument", display: "swap" });
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
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
      className={`${GeistSans.variable} ${mono.variable} ${instrument.variable} ${instrumentSerif.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { ProcessFlow } from "./process-flow";

// Each cycled word carries its own semantic color (allow/deny/escalate), with
// "sealed" landing on oxblood — the authority accent. Color is dual-encoded by
// the word itself, never hue alone.
const words: { text: string; color: string }[] = [
  { text: "allowed", color: "var(--color-allow)" },
  { text: "denied", color: "var(--color-deny)" },
  { text: "escalated", color: "var(--color-escalate)" },
  { text: "sealed", color: "var(--color-seal)" },
];

export function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % words.length);
    }, 2600);
    return () => clearInterval(interval);
  }, []);

  const word = words[wordIndex] ?? words[0]!;

  return (
    <section className="relative flex min-h-screen flex-col justify-center overflow-hidden pt-28 pb-16 lg:pt-32">
      {/* Quiet cross-fade for the rotating verdict word (replaces the per-char
          blur(40px) loop). Reduced motion snaps to the resolved word. */}
      <style>{`
        .hero-word { animation: hero-word-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @keyframes hero-word-in {
          from { opacity: 0; transform: translateY(0.12em); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-word { animation: none; opacity: 1; transform: none; }
        }
      `}</style>

      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-6 lg:px-12">
        <div className="grid items-center gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16">
          {/* Left — the pitch */}
          <div>
            <div
              className={`mb-7 transition-all duration-700 ${
                isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
              <span className="inline-flex items-center gap-3 font-mono text-sm text-muted-foreground">
                <span className="h-px w-8 bg-foreground/30" />
                Govern every action an AI agent takes
              </span>
            </div>

            <h1
              className={`warden-display transition-all duration-1000 ${
                isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
              }`}
            >
              <span className="block font-semibold">Every action an agent takes,</span>
              <span className="block font-normal text-muted-foreground">
                instantly{" "}
                <span className="relative inline-block font-semibold">
                  {/* quiet cross-fade between verdict words; semantic color per word,
                      dual-encoded by the word itself. No per-char blur loop. */}
                  <span
                    key={wordIndex}
                    className="hero-word inline-block"
                    style={{ color: word.color }}
                  >
                    {word.text}
                  </span>
                  <span
                    className="absolute -bottom-1 left-0 right-0 h-2.5 opacity-15 transition-colors duration-500"
                    style={{ backgroundColor: word.color }}
                  />
                </span>
              </span>
            </h1>

            <p
              className={`mt-7 max-w-xl text-lg leading-relaxed text-muted-foreground transition-all duration-700 delay-200 lg:text-xl ${
                isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
              Warden is the policy decision point an agent calls before it acts — resolving
              authority, approval limits and segregation of duties, then sealing the verdict to a
              tamper-evident ledger on Amazon Aurora DSQL.
            </p>

            <div
              className={`mt-9 flex flex-col items-start gap-4 transition-all duration-700 delay-300 sm:flex-row ${
                isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
              <Button
                asChild
                size="lg"
                className="group h-13 rounded-full bg-foreground px-7 text-base text-background hover:bg-foreground/90"
              >
                <a href="/console">
                  Open the console
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-13 rounded-full border-foreground/20 px-7 text-base hover:bg-foreground/5"
              >
                <a href="#developers">The PDP contract</a>
              </Button>
            </div>

            {/* The honest stats, demoted to a single mono line. The amount is data,
                so it's JetBrains Mono (.font-mono-display), not the marketing serif. */}
            <div
              className={`mt-9 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-foreground/10 pt-6 font-mono text-xs text-muted-foreground transition-all duration-700 delay-500 ${
                isVisible ? "opacity-100" : "opacity-0"
              }`}
            >
              <span className="font-mono-display text-foreground">$2.0M</span>
              <span>blocked on a revoked grant</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-foreground">instant</span>
              <span>cross-region revocation</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-foreground">0</span>
              <span>stale approvals</span>
            </div>
          </div>

          {/* Right — the live gated process flow */}
          <div
            className={`transition-all duration-1000 delay-200 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
          >
            <ProcessFlow />
          </div>
        </div>
      </div>
    </section>
  );
}

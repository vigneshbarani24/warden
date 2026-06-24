"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { ProcessFlow } from "./process-flow";

const words = ["allowed", "denied", "escalated", "sealed"];

const stats = [
  { value: "$2.0M", label: "blocked on a revoked grant" },
  { value: "instant", label: "cross-region revocation" },
  { value: "0", label: "stale approvals" },
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
      {/* Subtle grid lines */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.06]">
        {[...Array(8)].map((_, i) => (
          <div
            key={`h-${i}`}
            className="absolute h-px bg-foreground"
            style={{ top: `${12.5 * (i + 1)}%`, left: 0, right: 0 }}
          />
        ))}
        {[...Array(12)].map((_, i) => (
          <div
            key={`v-${i}`}
            className="absolute w-px bg-foreground"
            style={{ left: `${8.33 * (i + 1)}%`, top: 0, bottom: 0 }}
          />
        ))}
      </div>

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
              className={`font-display text-[clamp(2.25rem,5.4vw,4.5rem)] leading-[0.98] tracking-tight transition-all duration-1000 ${
                isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
              }`}
            >
              <span className="block">Every action an agent takes,</span>
              <span className="block">
                instantly{" "}
                <span className="relative inline-block text-primary">
                  <span key={wordIndex} className="inline-flex">
                    {word.split("").map((char, i) => (
                      <span
                        key={`${wordIndex}-${i}`}
                        className="inline-block animate-char-in"
                        style={{ animationDelay: `${i * 45}ms` }}
                      >
                        {char}
                      </span>
                    ))}
                  </span>
                  <span className="absolute -bottom-1 left-0 right-0 h-2.5 bg-primary/12" />
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

            <div
              className={`mt-10 flex flex-wrap gap-x-10 gap-y-4 border-t border-foreground/10 pt-7 transition-all duration-700 delay-500 ${
                isVisible ? "opacity-100" : "opacity-0"
              }`}
            >
              {stats.map((s) => (
                <div key={s.label} className="flex flex-col gap-1">
                  <span className="font-display text-2xl lg:text-3xl">{s.value}</span>
                  <span className="max-w-[10rem] text-xs leading-tight text-muted-foreground">{s.label}</span>
                </div>
              ))}
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

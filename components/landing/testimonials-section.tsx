"use client";

import { useEffect, useRef, useState } from "react";

// Public historical cases — NOT customers. Each is a forensic-evidence row:
// institution · year · the loss (mono) · the rule id that would have stopped it.
const cases = [
  {
    institution: "Barings Bank",
    year: "1995",
    loss: "£827M",
    summary: "One trader ran both the desk and the back office that settled his trades.",
    rule: "SOD-FBO-01",
    ruleNote: "front/back-office segregation of duties",
  },
  {
    institution: "Société Générale",
    year: "2008",
    loss: "€4.9bn",
    summary: "Positions far beyond his mandate went unchecked at the moment of trade.",
    rule: "LIMIT-ESC-02",
    ruleNote: "approval limit enforced at the action, escalated above it",
  },
] as const;

export function TestimonialsSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 },
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-background py-32 text-foreground lg:py-40"
    >
      {/* ASCII background pattern — barely-there ink, static */}
      <div className="pointer-events-none absolute inset-0 select-none overflow-hidden whitespace-pre font-mono text-[10px] leading-tight text-foreground/[0.03]">
        {/* Deterministic so SSR and client agree (no Math.random in render). */}
        {Array.from({ length: 60 }, (_, r) =>
          Array.from({ length: 100 }, (_, c) => ((r * 31 + c * 17) % 10 > 6 ? '"' : " ")).join(""),
        ).join("\n")}
      </div>

      <div className="relative z-10 mx-auto max-w-[1400px] px-6 lg:px-12">
        {/* Header */}
        <div className="mb-16 lg:mb-20">
          <span className="mb-4 inline-flex items-center gap-3 font-mono text-sm text-muted-foreground">
            <span className="h-px w-12 bg-foreground/20" />
            What this prevents
          </span>
          <h2
            className={`warden-display warden-display-xl max-w-3xl transition-all duration-1000 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            On the record,
            <br />
            <span className="text-muted-foreground">what a control plane stops.</span>
          </h2>
        </div>

        {/* Forensic-evidence rows — hairline-ruled, no carousel */}
        <div className="border-t border-foreground/15">
          {cases.map((c, index) => (
            <article
              key={c.institution}
              className={`grid grid-cols-1 gap-y-6 border-b border-foreground/15 py-10 transition-all duration-700 lg:grid-cols-[1fr_auto] lg:items-start lg:gap-x-16 lg:py-14 ${
                isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {/* Left: institution · year + the failure */}
              <div className="max-w-2xl">
                <div className="mb-5 flex items-baseline gap-3 font-mono text-sm">
                  <span className="text-foreground">{c.institution}</span>
                  <span className="text-foreground/30">·</span>
                  <span className="text-muted-foreground">{c.year}</span>
                </div>
                <p className="text-2xl leading-snug text-foreground lg:text-3xl">
                  {c.summary}
                </p>
              </div>

              {/* Right: the loss (mono) + the rule that would have stopped it */}
              <div className="lg:text-right">
                <div className="font-mono-display text-5xl leading-none text-primary lg:text-6xl">
                  {c.loss}
                </div>
                <div className="mt-4 inline-flex items-center gap-2 lg:justify-end">
                  <span className="border border-foreground/20 px-3 py-1 font-mono text-sm text-foreground">
                    {c.rule}
                  </span>
                </div>
                <p className="mt-3 max-w-xs font-mono text-xs text-muted-foreground lg:ml-auto">
                  {c.ruleNote}
                </p>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-8 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Public cases — not customers. The rule ids are Warden policy rules.
        </p>
      </div>
    </section>
  );
}

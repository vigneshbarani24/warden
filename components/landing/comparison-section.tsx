"use client";

import { useEffect, useRef, useState } from "react";

// Mark = the cell value. "yes" load-bearing, "partial" qualified, "no" absent.
type Mark = "yes" | "partial" | "no";

const COLS = ["AgentCore Policy", "GRC suites", "Warden"] as const;

interface Row {
  label: string;
  note: string;
  marks: [Mark, Mark, Mark]; // AgentCore · GRC · Warden
}

// Sourced from each vendor's own docs (see README "Where Warden sits"). GRC suites =
// Pathlock / SafePaaS (detective/in-ERP); AgentCore Policy = AWS Cedar (stateless tool-access).
const ROWS: Row[] = [
  { label: "Pre-execution, external contract any agent calls", note: "before the action, framework-agnostic", marks: ["yes", "no", "yes"] },
  { label: "Stateful business authority", note: "grants resolved up an org hierarchy", marks: ["no", "yes", "yes"] },
  { label: "Approval-limit escalation", note: "to the nearest covering ancestor", marks: ["no", "partial", "yes"] },
  { label: "Segregation of duties over real history", note: "captured-then-settled, not just roles", marks: ["no", "yes", "yes"] },
  { label: "An escalate verdict", note: "allow · deny · escalate to a human", marks: ["no", "no", "yes"] },
  { label: "Strong-consistency global revocation", note: "no stale read approves a dead grant", marks: ["partial", "no", "yes"] },
  { label: "Tamper-evident verdict ledger", note: "the defensible, hash-chained why", marks: ["no", "partial", "yes"] },
];

function MarkCell({ mark, warden }: { mark: Mark; warden: boolean }) {
  const glyph = mark === "yes" ? "●" : mark === "partial" ? "◐" : "—";
  const tone =
    mark === "no"
      ? "text-foreground/25"
      : warden
        ? "text-primary"
        : mark === "yes"
          ? "text-foreground/80"
          : "text-foreground/40";
  return (
    <span className={`font-mono text-base ${tone}`} aria-label={mark}>
      {glyph}
    </span>
  );
}

export function ComparisonSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        {/* Header */}
        <div className="mb-14 max-w-3xl">
          <span className={`mb-8 inline-flex items-center gap-3 font-mono text-sm text-muted-foreground transition-opacity duration-700 ${isVisible ? "opacity-100" : "opacity-0"}`}>
            <span className="h-px w-12 bg-foreground/30" />
            Where it sits
          </span>
          <h2 className={`font-display text-4xl leading-[0.95] tracking-tight transition-all duration-1000 md:text-5xl lg:text-6xl ${isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
            Not a guardrail.
            <br />
            <span className="text-muted-foreground">Not a gateway.</span>
          </h2>
          <p className={`mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground transition-opacity duration-1000 delay-100 ${isVisible ? "opacity-100" : "opacity-0"}`}>
            Gateways gate tool <span className="text-foreground">access</span>. Guardrails check
            <span className="text-foreground"> text</span>. GRC tools <span className="text-foreground">detect</span> after
            the fact. Warden adjudicates business <span className="text-foreground">authority</span> before the action,
            and keeps the record — the combination no adjacent layer ships.
          </p>
        </div>

        {/* Comparison grid */}
        <div className={`overflow-x-auto transition-all duration-1000 delay-200 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <div className="min-w-[640px]">
            {/* Column header */}
            <div className="grid grid-cols-[1.6fr_repeat(3,0.9fr)] items-end gap-2 border-b border-foreground/15 pb-3">
              <div />
              {COLS.map((c) => {
                const warden = c === "Warden";
                return (
                  <div
                    key={c}
                    className={`px-3 py-2 text-center font-mono text-[11px] uppercase tracking-[0.14em] ${
                      warden ? "rounded-t-md bg-primary/[0.06] font-medium text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {c}
                  </div>
                );
              })}
            </div>

            {/* Rows */}
            {ROWS.map((row, i) => (
              <div
                key={row.label}
                className={`grid grid-cols-[1.6fr_repeat(3,0.9fr)] items-center gap-2 border-b border-foreground/8 ${i % 2 === 1 ? "bg-foreground/[0.015]" : ""}`}
              >
                <div className="py-4 pr-4">
                  <div className="text-sm font-medium text-foreground">{row.label}</div>
                  <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{row.note}</div>
                </div>
                {row.marks.map((m, idx) => {
                  const warden = idx === 2;
                  return (
                    <div key={idx} className={`flex h-full items-center justify-center py-4 ${warden ? "bg-primary/[0.04]" : ""}`}>
                      <MarkCell mark={m} warden={warden} />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend + honesty */}
        <div className={`mt-6 flex flex-wrap items-center gap-x-8 gap-y-2 font-mono text-[11px] text-muted-foreground transition-opacity duration-1000 delay-300 ${isVisible ? "opacity-100" : "opacity-0"}`}>
          <span className="flex items-center gap-2"><span className="text-foreground/80">●</span> yes</span>
          <span className="flex items-center gap-2"><span className="text-foreground/40">◐</span> partial</span>
          <span className="flex items-center gap-2"><span className="text-foreground/25">—</span> no</span>
          <span className="text-foreground/40">AgentCore Policy = AWS Cedar (stateless tool-access) · GRC = Pathlock / SafePaaS (detective, in-ERP)</span>
        </div>
      </div>
    </section>
  );
}

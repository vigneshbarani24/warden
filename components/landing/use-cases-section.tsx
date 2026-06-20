"use client";

import { useEffect, useRef, useState } from "react";

const CASES = [
  {
    domain: "Commodity trading",
    action: "Settle a deal it captured",
    verdict: "DENY",
    rule: "SOD-FBO-01",
    why: "Front and back office can't be the same hand. The Barings collapse — prevented at the tool call.",
  },
  {
    domain: "Procure-to-Pay",
    action: "Change vendor bank, then pay",
    verdict: "DENY",
    rule: "SOD-MDM-04",
    why: "Bank-detail changes and payment approval need separate authority — the #1 invoice-fraud path.",
  },
  {
    domain: "Procurement",
    action: "Commit beyond its mandate",
    verdict: "ESCALATE",
    rule: "LIMIT-02",
    why: "Over-limit spend routes to the authority that covers it — enforced at the moment of action, not after.",
  },
  {
    domain: "Insurance claims",
    action: "Approve an over-limit payout",
    verdict: "ESCALATE",
    rule: "LIMIT-07",
    why: "A claims agent can't approve above its authority, or settle a claim it adjudicated itself.",
  },
  {
    domain: "Privileged access",
    action: "Grant a role it can't grant",
    verdict: "DENY",
    rule: "NO-GRANT",
    why: "An agent can't escalate its own privileges. No active grant, no action — every time.",
  },
  {
    domain: "Master data",
    action: "Onboard then trade a counterparty",
    verdict: "DENY",
    rule: "SOD-CPTY-03",
    why: "Whoever onboards a counterparty can't be the one who trades with it. Conflicts caught on history.",
  },
];

function verdictClass(v: string): string {
  if (v === "DENY") return "text-destructive border-destructive";
  if (v === "ESCALATE") return "text-escalate border-escalate";
  return "text-allow border-allow";
}

function CaseCard({ c, index }: { c: (typeof CASES)[number]; index: number }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setVisible(true);
      },
      { threshold: 0.15 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`hover-lift border border-foreground/10 bg-card/40 p-7 transition-all duration-700 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
      style={{ transitionDelay: `${index * 90}ms` }}
    >
      <div className="flex items-center justify-between mb-6">
        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{c.domain}</span>
        <span className={`font-mono text-[10px] uppercase tracking-widest px-2 py-1 border ${verdictClass(c.verdict)}`}>
          {c.verdict}
        </span>
      </div>
      <h3 className="font-display text-2xl tracking-tight mb-3">{c.action}</h3>
      <p className="text-[15px] text-muted-foreground leading-relaxed mb-5">{c.why}</p>
      <span className="font-mono text-xs text-foreground/40">{c.rule}</span>
    </div>
  );
}

export function UseCasesSection() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setVisible(true);
      },
      { threshold: 0.1 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="use-cases" ref={ref} className="relative py-24 lg:py-32">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="mb-16 lg:mb-20 max-w-3xl">
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
            <span className="w-8 h-px bg-foreground/30" />
            Where you need it
          </span>
          <h2
            className={`text-3xl lg:text-5xl font-display tracking-tight transition-all duration-700 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            One control plane. Every agent, every action.
          </h2>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            The same engine governs any domain — the rules are data, not code. Six of the actions an AI agent
            will try, and what Warden returns before they execute.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {CASES.map((c, i) => (
            <CaseCard key={c.rule + c.action} c={c} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

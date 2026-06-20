"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowDown } from "lucide-react";

const NODES = [
  { tag: "Memory", title: "Knowledge graph", sub: "What the agent knows — context, not permission." },
  { tag: "Reasoning", title: "AI agent", sub: "LLM plans the next action — SAP Joule, Oracle, custom." },
  { tag: "Hands · coarse", title: "MCP gateway / AgentCore", sub: "Identity & which tool it may reach. OAuth, 401/403." },
  {
    tag: "Authority",
    title: "Warden — business-authority PDP",
    sub: "Active grants up the hierarchy · approval limits · segregation of duties.",
    own: true,
  },
  { tag: "Execution", title: "ERP / tools", sub: "Executes only on allow." },
];

function Node({ n }: { n: (typeof NODES)[number] }) {
  return (
    <div
      className={`flex-1 rounded-lg border p-5 ${
        n.own
          ? "border-primary bg-primary/[0.06] shadow-[0_0_0_1px_var(--color-primary)]"
          : "border-foreground/15 bg-card/40"
      }`}
    >
      <div className={`font-mono text-[10px] uppercase tracking-widest mb-3 ${n.own ? "text-primary" : "text-muted-foreground"}`}>
        {n.tag}
      </div>
      <div className="font-display text-lg leading-snug mb-2">{n.title}</div>
      <p className="text-[13px] text-muted-foreground leading-relaxed">{n.sub}</p>
      {n.own && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          <span className="font-mono text-[10px] px-2 py-0.5 border border-allow text-allow">allow</span>
          <span className="font-mono text-[10px] px-2 py-0.5 border border-destructive text-destructive">deny</span>
          <span className="font-mono text-[10px] px-2 py-0.5 border border-escalate text-escalate">escalate</span>
        </div>
      )}
    </div>
  );
}

export function ArchitectureSection() {
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
    <section id="stack" ref={ref} className="relative py-24 lg:py-32">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="mb-16 lg:mb-20 max-w-3xl">
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
            <span className="w-8 h-px bg-foreground/30" />
            Architecture
          </span>
          <h2
            className={`text-3xl lg:text-5xl font-display tracking-tight transition-all duration-700 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            Where Warden sits in the AI operating system.
          </h2>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            The knowledge graph is the agent&apos;s memory. MCP is its hands. Warden is its authority — the
            business decision the other layers delegate downstream.
          </p>
        </div>

        {/* Flow */}
        <div className="flex flex-col lg:flex-row items-stretch gap-3">
          {NODES.map((n, i) => (
            <div key={n.title} className="flex flex-col lg:flex-row items-stretch lg:flex-1 gap-3">
              <Node n={n} />
              {i < NODES.length - 1 && (
                <div className="flex items-center justify-center text-foreground/30 shrink-0">
                  <ArrowRight className="hidden lg:block w-5 h-5" />
                  <ArrowDown className="lg:hidden w-5 h-5" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Ledger + DSQL base */}
        <div className="mt-6 rounded-lg border border-foreground/15 bg-card/40 px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="font-mono text-[13px] text-foreground/80">
            Warden writes every verdict → <span className="text-primary">hash-chained, tamper-evident ledger</span>
          </div>
          <div className="font-mono text-[12px] text-muted-foreground">
            Underpinned by Amazon Aurora DSQL · strongly consistent · active-active multi-region
          </div>
        </div>

        {/* Callouts */}
        <div className="mt-10 grid sm:grid-cols-3 gap-5">
          {[
            ["Behind the coarse gateway", "MCP/AgentCore gates which tool; Warden gates whether the business permits it."],
            ["Orchestrators call it", "LangGraph, CrewAI, AgentCore invoke decide(); an escalate lands in their human-in-the-loop."],
            ["Guardrails are orthogonal", "Content safety checks the text. Warden checks authority — a polite $2M from a revoked approver still gets denied."],
          ].map(([t, d]) => (
            <div key={t} className="border-t border-foreground/15 pt-5">
              <div className="font-display text-lg mb-2">{t}</div>
              <p className="text-[14px] text-muted-foreground leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

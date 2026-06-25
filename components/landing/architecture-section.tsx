"use client";

import { useEffect, useRef, useState } from "react";

// The Enterprise AI Operating System, as a stack. Warden is the governance layer
// the gated process flow above runs through — so the same control extends to any
// process. Everything rests on the ink Aurora DSQL substrate.
interface EosLayer {
  tag: string;
  title: string;
  sub: string;
  own?: boolean;
}

const LAYERS: EosLayer[] = [
  { tag: "Reasoning", title: "LLM", sub: "Plans the next action — SAP Joule, Oracle, a custom agent." },
  { tag: "Memory", title: "Knowledge graph", sub: "What the agent knows. Context, not permission." },
  { tag: "Hands", title: "MCP gateway / AgentCore", sub: "Which tool it may reach. OAuth, 401/403 — coarse access." },
  {
    tag: "Authority",
    title: "Governance · Warden",
    sub: "Active grants up the hierarchy · approval limits · segregation of duties → allow / deny / escalate, with a reason.",
    own: true,
  },
  { tag: "Execution", title: "ERP / tools", sub: "Acts only on allow." },
];

const CALLOUTS: ReadonlyArray<readonly [string, string]> = [
  ["Behind the coarse gateway", "MCP / AgentCore gates which tool an agent reaches. Warden gates whether the business permits the action."],
  ["Orchestrators call it", "LangGraph, CrewAI, AgentCore invoke decide(); an escalate lands in their human-in-the-loop."],
  ["Guardrails are orthogonal", "Content safety checks the text. Warden checks authority — a polite $2M from a revoked approver is still denied."],
];

function Layer({ n, show, i }: { n: EosLayer; show: boolean; i: number }) {
  return (
    <div
      className={`flex items-center gap-4 rounded-lg border px-5 py-4 transition-all duration-700 sm:gap-6 ${
        n.own
          ? "border-primary bg-primary/[0.06] shadow-[0_0_0_1px_var(--color-primary)]"
          : "border-foreground/12 bg-card/40"
      } ${show ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
      style={{ transitionDelay: `${i * 90}ms` }}
    >
      <span
        className={`w-24 shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] sm:w-28 ${
          n.own ? "text-primary" : "text-muted-foreground"
        }`}
      >
        {n.tag}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {n.own && <span aria-hidden className="font-mono text-primary">▶</span>}
          <span className="font-display text-lg leading-snug">{n.title}</span>
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{n.sub}</p>
      </div>
      {n.own && (
        <div className="hidden shrink-0 gap-1.5 md:flex">
          <span className="border border-allow px-2 py-0.5 font-mono text-[10px] text-allow">allow</span>
          <span className="border border-destructive px-2 py-0.5 font-mono text-[10px] text-destructive">deny</span>
          <span className="border border-escalate px-2 py-0.5 font-mono text-[10px] text-escalate">escalate</span>
        </div>
      )}
    </div>
  );
}

export function ArchitectureSection() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

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
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="mb-14 max-w-3xl lg:mb-16">
          <span className="mb-6 inline-flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-3.5 w-px bg-[var(--color-seal)]" />
            The stack
          </span>
          <h2
            className={`warden-display transition-all duration-700 ${
              visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            Where Warden sits in the AI operating system.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            The gated process flow above runs through one layer of the stack — the governance layer. Swap the
            process, the gate stays. That is how the same control extends to any agent, any domain.
          </p>
        </div>

        {/* The EOS stack */}
        <div className="overflow-hidden rounded-xl border border-foreground/12 bg-card/30 p-3 sm:p-4">
          <div className="mb-3 px-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            The enterprise AI operating system
          </div>
          <div className="flex flex-col gap-2.5">
            {LAYERS.map((n, i) => (
              <Layer key={n.title} n={n} show={visible} i={i} />
            ))}
          </div>

          {/* ink Aurora DSQL substrate */}
          <div className="mt-2.5 flex flex-col gap-2 rounded-lg bg-foreground px-5 py-4 text-background sm:flex-row sm:items-center sm:justify-between">
            <span className="font-display text-base tracking-tight">Amazon Aurora DSQL</span>
            <span className="font-mono text-[11px] text-background/60">
              strongly consistent · active-active · the hash-chained, tamper-evident ledger
            </span>
          </div>
        </div>

        {/* Callouts */}
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {CALLOUTS.map(([t, d]) => (
            <div key={t} className="border-t border-foreground/15 pt-5">
              <div className="mb-2 font-display text-lg">{t}</div>
              <p className="text-[14px] leading-relaxed text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The hero centerpiece: an agent walks an ordered business process one step at a
 * time, and EACH step must clear the Warden gate (authority · limits · SoD) before
 * it advances. The flow cycles across domains to show the same gate governs any
 * process. Everything rests on the ink Aurora DSQL slab — the one inverted moment.
 *
 * Pure DOM + CSS + a small state machine. Hashes are derived deterministically
 * (no Math.random / Date.now in render) so SSR and the client agree.
 */

type Verdict = "allow" | "deny" | "escalate";
type Phase = "evaluating" | "stamped" | "halted";

interface Step {
  label: string;
  verdict: Verdict;
  note?: string;
}
interface Domain {
  name: string;
  agent: string;
  steps: Step[];
}
interface Sealed {
  seq: number;
  hash: string;
  verdict: Verdict;
  label: string;
}

// Same gate, any process. Each domain is one agent walking its lifecycle; the
// telling deny/escalate lands at the step a real control would catch.
const DOMAINS: Domain[] = [
  {
    name: "Commodity trade lifecycle",
    agent: "Desk Agent",
    steps: [
      { label: "capture trade", verdict: "allow" },
      { label: "confirm deal", verdict: "allow" },
      { label: "schedule cargo", verdict: "allow" },
      { label: "settle trade", verdict: "deny", note: "front office can't settle its own deal · SOD-FBO-01" },
      { label: "invoice", verdict: "allow" },
    ],
  },
  {
    name: "Procure-to-Pay",
    agent: "AP Agent",
    steps: [
      { label: "raise PO", verdict: "allow" },
      { label: "goods receipt", verdict: "allow" },
      { label: "change vendor bank", verdict: "deny", note: "bank-change ≠ payment approver · dual control" },
      { label: "approve invoice", verdict: "allow" },
      { label: "release payment", verdict: "allow" },
    ],
  },
  {
    name: "Insurance claims",
    agent: "Claims Agent",
    steps: [
      { label: "intake claim", verdict: "allow" },
      { label: "adjudicate", verdict: "allow" },
      { label: "approve payout", verdict: "escalate", note: "above mandate · escalate to covering authority" },
      { label: "settle payout", verdict: "allow" },
    ],
  },
  {
    name: "Procurement",
    agent: "Buyer Agent",
    steps: [
      { label: "raise request", verdict: "allow" },
      { label: "commit spend", verdict: "escalate", note: "over limit · route to nearest covering authority" },
      { label: "issue PO", verdict: "allow" },
    ],
  },
];

const REGIONS = ["us-east-1", "us-west-2", "us-east-2"];

const V: Record<Verdict, { label: string; text: string; border: string; dot: string }> = {
  allow: { label: "allow", text: "text-allow", border: "border-allow", dot: "bg-allow" },
  deny: { label: "deny", text: "text-destructive", border: "border-destructive", dot: "bg-destructive" },
  escalate: { label: "escalate", text: "text-escalate", border: "border-escalate", dot: "bg-escalate" },
};

function shortHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0").slice(0, 6);
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

export function ProcessFlow() {
  const reduced = usePrefersReducedMotion();
  const [di, setDi] = useState(0);
  const [si, setSi] = useState(0);
  const [phase, setPhase] = useState<Phase>("evaluating");
  const [sealed, setSealed] = useState<Sealed[]>([]);
  const [revoke, setRevoke] = useState(false);
  const [paused, setPaused] = useState(false);
  const seqRef = useRef(140);

  const domain = DOMAINS[di] ?? DOMAINS[0]!;
  const step = domain.steps[si] ?? domain.steps[0]!;

  // Seal each step's verdict exactly once, the moment the gate stamps it.
  // Kept separate from the timer so hover-pausing can't double-append.
  useEffect(() => {
    if (phase !== "stamped") return;
    const seq = (seqRef.current += 1);
    setSealed((prev) =>
      [{ seq, hash: shortHash(`${domain.name}/${step.label}/${seq}`), verdict: step.verdict, label: step.label }, ...prev].slice(0, 7),
    );
  }, [phase, di, si, domain, step]);

  // Advance the playhead — deliberately slow so each gated step is readable.
  // Frozen while `paused` (hover) so the viewer can take it in.
  useEffect(() => {
    if (paused) return;
    let t: ReturnType<typeof setTimeout>;
    const nextDomain = () => {
      setDi((d) => (d + 1) % DOMAINS.length);
      setSi(0);
      setPhase("evaluating");
    };
    if (phase === "evaluating") {
      t = setTimeout(() => setPhase("stamped"), reduced ? 380 : 1100);
    } else if (phase === "stamped") {
      const isLast = si === domain.steps.length - 1;
      if (step.verdict === "deny") {
        t = setTimeout(() => setPhase("halted"), reduced ? 220 : 1500);
      } else if (isLast) {
        t = setTimeout(nextDomain, reduced ? 700 : 2400);
      } else {
        t = setTimeout(() => {
          setSi((s) => s + 1);
          setPhase("evaluating");
        }, reduced ? 480 : 1500);
      }
    } else {
      // halted — downstream blocked holds, then cycle
      t = setTimeout(nextDomain, reduced ? 900 : 3200);
    }
    return () => clearTimeout(t);
  }, [phase, di, si, paused, reduced, domain, step]);

  // Periodic "revoke once → denied in every region" flash on the DSQL slab.
  useEffect(() => {
    if (reduced) return;
    let off: ReturnType<typeof setTimeout> | undefined;
    const iv = setInterval(() => {
      setRevoke(true);
      off = setTimeout(() => setRevoke(false), 1200);
    }, 7600);
    return () => {
      clearInterval(iv);
      if (off) clearTimeout(off);
    };
  }, [reduced]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-foreground/15 bg-card/60 shadow-[0_1px_0_rgba(20,23,26,0.04),0_24px_60px_-32px_rgba(20,23,26,0.35)] outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      tabIndex={0}
      aria-label="Live demo: an agent stepping through a business process, each step gated by Warden. Hover or focus to pause and read."
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* header */}
      <div className="flex items-center justify-between border-b border-foreground/10 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Process flow
          </span>
          <span key={domain.name} className="font-display text-base leading-none">
            {domain.name}
          </span>
        </div>
        <div className="flex items-center gap-2.5 font-mono text-[11px] text-muted-foreground">
          <span className="hidden md:inline text-muted-foreground/55">hover to pause</span>
          <span className="hidden sm:inline">{domain.agent}</span>
          <span className="inline-flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full bg-primary ${paused ? "" : "animate-pulse"}`} />
            {paused ? "paused" : "live"}
          </span>
        </div>
      </div>

      {/* steps — each gated by Warden before it advances */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-stretch gap-1.5 overflow-x-auto pb-2 lg:gap-2">
          {domain.steps.map((s, i) => {
            const resolved = i < si;
            const current = i === si;
            const blocked = phase === "halted" && i > si;
            const showVerdict = resolved || (current && phase !== "evaluating");
            const v = V[s.verdict];
            return (
              <div key={`${domain.name}-${s.label}`} className="flex min-w-[7.5rem] flex-1 items-center gap-1.5 lg:min-w-[8.5rem]">
                <div
                  className={[
                    "relative flex-1 rounded-md border px-3 py-3 transition-all duration-300",
                    current
                      ? "border-foreground/40 bg-foreground/[0.03]"
                      : resolved
                        ? `${v.border}/40 bg-card`
                        : "border-foreground/12 bg-card/40",
                    blocked ? "opacity-40" : "",
                    !resolved && !current && !blocked ? "opacity-55" : "",
                  ].join(" ")}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {showVerdict ? (
                      <span className={`pf-stamp font-mono text-[9px] uppercase tracking-wider ${v.text}`}>
                        {v.label}
                      </span>
                    ) : current && phase === "evaluating" ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                        <span className="h-1 w-1 animate-pulse rounded-full bg-primary" />
                        gate
                      </span>
                    ) : blocked ? (
                      <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                        blocked
                      </span>
                    ) : null}
                  </div>
                  <div className="font-sans text-[13px] leading-tight text-foreground/90">{s.label}</div>
                </div>
                {i < domain.steps.length - 1 && (
                  <div className="relative h-px w-4 shrink-0 self-center bg-foreground/15 lg:w-5">
                    {resolved && !reduced && (
                      <span className="cp-dot bg-primary" style={{ animationDelay: `${(i % 3) * 0.5}s` }} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* the Warden gate + the note the gate is enforcing */}
        <div className="mt-3 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex items-center gap-2 self-start rounded-md border border-primary/30 bg-primary/[0.05] px-2.5 py-1">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              Warden
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">authority · limits · SoD</span>
          </div>
          <div className="min-h-[1rem] font-mono text-[11px] text-muted-foreground">
            {phase !== "evaluating" && step.note ? (
              <span className={V[step.verdict].text}>{step.note}</span>
            ) : (
              <span>each step needs Warden approval to advance</span>
            )}
          </div>
        </div>

        {/* the ledger — every verdict sealed */}
        <div className="mt-4 border-t border-foreground/10 pt-3">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Sealed to the ledger
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sealed.length === 0 ? (
              <span className="font-mono text-[11px] text-muted-foreground/60">awaiting first verdict…</span>
            ) : (
              sealed.map((b) => (
                <span
                  key={b.seq}
                  className="pf-seal-in inline-flex items-center gap-1.5 rounded border border-foreground/12 bg-card px-2 py-1 font-mono text-[10px]"
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${V[b.verdict].dot}`} />
                  <span className="text-muted-foreground">{String(b.seq).padStart(4, "0")}</span>
                  <span className="text-foreground/70">{b.hash}</span>
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* the ink Aurora DSQL slab — everything rests on it */}
      <div className="relative bg-foreground px-5 py-4 text-background">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="font-display text-sm tracking-tight">Amazon Aurora DSQL</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-background/55">
              the substrate
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {REGIONS.map((r, i) => (
              <span
                key={r}
                className="inline-flex items-center gap-1.5 rounded border border-background/20 px-2 py-1 font-mono text-[10px] text-background/80"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${
                    revoke ? "bg-deny" : "bg-allow"
                  }`}
                  style={reduced ? undefined : { animation: `pulse 2s ease-in-out ${i * 0.25}s infinite` }}
                />
                {r}
              </span>
            ))}
          </div>
        </div>
        {/* strong-consistency sync sweep */}
        <div className="relative mt-3 h-px w-full bg-background/15">
          {!reduced && <span className="cp-sync absolute inset-0 block opacity-70" />}
        </div>
        <div className="mt-2 font-mono text-[10px] text-background/55">
          {revoke ? (
            <span className="text-deny">revoke committed → denied in every region · zero replication lag</span>
          ) : (
            <span>active-active · strongly consistent · revoke once → denied everywhere</span>
          )}
        </div>
      </div>
    </div>
  );
}

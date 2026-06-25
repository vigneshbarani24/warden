"use client";

import { useCallback, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import type { LedgerView } from "@/lib/pdp";
import type { VerifyResult } from "@/lib/ledger";
import { LedgerSpine } from "@/components/ledger/LedgerSpine";
import { VerdictStamp } from "@/components/ledger/VerdictStamp";

/**
 * The guided simulation — the explainable front door of the console.
 *
 * It drives the REAL backend (decide / revoke / verify / tamper / reset on Aurora
 * DSQL) through the canonical demo, recording a SNAPSHOT after every step. A
 * time-travel scrubber replays those snapshots: drag back and forth and watch the
 * same action flip from ALLOW to DENY across the moment the mandate was revoked.
 */

const GAS_MANDATE = "11111111-1111-4111-8111-111111111111"; // the London gas-desk mandate (seed)

type Verdict = "allow" | "deny" | "escalate";
type StepKind = "decision" | "revoke" | "verify" | "tamper" | "fleet";

interface EvalCtx {
  activeGrantCount?: number;
  coveringGrantId?: string | null;
  limitChecked?: number | null;
  sodResult?: string;
  firedRuleIds?: string[];
}
interface Decision {
  actor: string;
  agent: string;
  actionType: string;
  resource: string;
  amount: number;
  verdict: Verdict;
  reason: string;
  ctx: EvalCtx;
}
interface StepOut {
  decision?: Decision;
  marker?: string;
  ledger: LedgerView[];
  verify?: VerifyResult | null;
}
interface Step {
  title: string;
  caption: string;
  kind: StepKind;
  run: () => Promise<StepOut>;
}
interface Snapshot {
  kind: StepKind;
  title: string;
  caption: string;
  decision: Decision | null;
  marker: string | null;
  ledger: LedgerView[];
  verify: VerifyResult | null;
}

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const verdictBorder: Record<Verdict, string> = { allow: "border-allow/40", deny: "border-deny/40", escalate: "border-escalate/40" };

async function fetchLedger(): Promise<LedgerView[]> {
  try {
    return await api.ledger();
  } catch {
    return [];
  }
}

export function SimulationView() {
  const [timeline, setTimeline] = useState<Snapshot[]>([]);
  const [cursor, setCursor] = useState(0);
  const [follow, setFollow] = useState(true);
  const [running, setRunning] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [stepIdx, setStepIdx] = useState(-1);
  // Cold-start: resolving authority from DSQL before any snapshot exists. Distinct
  // from the genuine empty state ("press Play"), which means no demo has run yet.
  const [loading, setLoading] = useState(false);
  // Live verify pass: drives the light travelling down the spine, locking each
  // disc green. Turned on while the verify step runs, off once the pass settles.
  const [verifying, setVerifying] = useState(false);
  const [caption, setCaption] = useState(
    "Press Play to run the governed-agent demo end to end — or Next to step through it while you narrate. Then drag the scrubber to time-travel.",
  );

  const playingRef = useRef(false);
  const followRef = useRef(true);
  const sodResource = useRef<string>("DEMO-SOD-INIT");

  const setFollowing = (v: boolean) => {
    followRef.current = v;
    setFollow(v);
  };

  const decideStep = useCallback(
    async (actor: string, agent: string, actionType: string, resource: string, amount: number, orgPath: string): Promise<StepOut> => {
      const out = await api.decide({ requestId: crypto.randomUUID(), actor, actionType, resource, amount, orgPath, context: { agent } });
      const decision: Decision = {
        actor,
        agent,
        actionType,
        resource,
        amount,
        verdict: out.verdict as Verdict,
        reason: out.reason,
        ctx: (out.evaluatedContext ?? {}) as EvalCtx,
      };
      return { decision, ledger: await fetchLedger() };
    },
    [],
  );

  // The scenario must always begin from a clean, consistent DB: empty ledger,
  // gas mandate un-revoked. Called before step 0 by both Play and Next.
  const startFresh = useCallback(async () => {
    setLoading(true);
    try {
      await api.reset();
      sodResource.current = `DEMO-SOD-${Math.floor(1000 + Math.random() * 9000)}`;
      setTimeline([]);
      setCursor(0);
      setFollowing(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const steps: Step[] = [
    {
      title: "A valid trade",
      caption:
        "A gas-desk agent proposes a $2,000,000 trade under its London mandate. Warden resolves the authority up the desk and checks the limit — allowed.",
      kind: "decision",
      run: () => decideStep("liam.obrien", "Gas Desk Agent", "capture_trade", "DEAL-NG-7711", 2_000_000, "/global/trading/gas/"),
    },
    {
      title: "Revoke the mandate",
      caption:
        "Compliance revokes that authority grant. On Aurora DSQL this is strongly consistent — instant in every region. No stale read can approve on it again.",
      kind: "revoke",
      run: async () => {
        await api.revoke(GAS_MANDATE);
        return { marker: "Mandate revoked", ledger: await fetchLedger() };
      },
    },
    {
      title: "The same action, denied",
      caption:
        "Seconds later the agent proposes the identical $2,000,000 trade. No active grant — denied, citing the just-revoked mandate. No ordinary Postgres replica guarantees this.",
      kind: "decision",
      run: () => decideStep("liam.obrien", "Gas Desk Agent", "capture_trade", "DEAL-NG-7712", 2_000_000, "/global/trading/gas/"),
    },
    {
      title: "Capture a deal",
      caption: "A crude-desk agent captures a $4,200,000 deal — within its mandate, allowed.",
      kind: "decision",
      run: () => {
        // Fresh, namespaced resource each run so the capture/settle pair is always unique
        // and can never collide with the fleet's DEAL-* resource space.
        sodResource.current = `DEMO-SOD-${crypto.randomUUID().slice(0, 8)}`;
        return decideStep("maya.chen", "Crude Desk Agent", "capture_trade", sodResource.current, 4_200_000, "/global/trading/crude/");
      },
    },
    {
      title: "Segregation of duties",
      caption:
        "Now the same agent tries to settle the deal it just captured. Front office can't be back office — denied on SOD-FBO-01. The Barings wall, at the tool call.",
      kind: "decision",
      run: () => decideStep("maya.chen", "Settlement Agent", "approve_settlement", sodResource.current, 4_200_000, "/global/trading/crude/"),
    },
    {
      title: "Over the limit",
      caption: "A products-desk agent proposes a $2,500,000 trade above its $2,000,000 mandate. Not denied — escalated to the authority that covers it.",
      kind: "decision",
      run: () => decideStep("raj.patel", "Products Desk Agent", "capture_trade", "DEAL-PR-6620", 2_500_000, "/global/trading/products/"),
    },
    {
      title: "Verify the chain",
      caption: "Every verdict was hash-chained into the ledger. Verify it — intact, end to end.",
      kind: "verify",
      run: async () => {
        const v = await api.verify();
        return { marker: "Chain verified — intact", ledger: await fetchLedger(), verify: v };
      },
    },
    {
      title: "Tamper",
      caption: "Now edit one sealed row directly in the database, the way a privileged actor might.",
      kind: "tamper",
      run: async () => {
        await api.tamper();
        return { marker: "A sealed row was tampered", ledger: await fetchLedger(), verify: null };
      },
    },
    {
      title: "Verify again",
      caption: "Verify once more. The break is detected at the exact sequence, and everything below it. Tamper-evident, not tamper-proof.",
      kind: "verify",
      run: async () => {
        const v = await api.verify();
        return { marker: "Break detected", ledger: await fetchLedger(), verify: v };
      },
    },
  ];

  const total = steps.length;

  const runStep = useCallback(
    async (idx: number) => {
      const step = steps[idx];
      if (!step) return;
      setRunning(true);
      setStepIdx(idx);
      setCaption(step.caption);
      setFollowing(true);
      try {
        const out = await step.run();
        setTimeline((prev) => {
          const lastDecision = out.decision ?? [...prev].reverse().find((s) => s.decision)?.decision ?? null;
          return [
            ...prev,
            { kind: step.kind, title: step.title, caption: step.caption, decision: lastDecision, marker: out.marker ?? null, ledger: out.ledger, verify: out.verify ?? null },
          ];
        });
        // The Verify step runs the sanctioned pass: light travels down the spine
        // locking each disc. LedgerSpine settles to verified/broken from the snapshot.
        if (step.kind === "verify") {
          setVerifying(true);
          const sealed = out.ledger.length;
          setTimeout(() => setVerifying(false), sealed * 70 + 460);
        }
      } catch (e) {
        // Stop the Play loop cleanly and tell the operator — never freeze mid-demo with stale narration.
        playingRef.current = false;
        setPlaying(false);
        setCaption(`Step ${idx + 1} failed — ${e instanceof Error ? e.message : "unknown error"}. Press Reset to run again.`);
      } finally {
        setRunning(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [decideStep],
  );

  const next = useCallback(async () => {
    const idx = stepIdx + 1;
    if (idx >= total) {
      setCaption("Demo complete. Drag the scrubber to replay, Reset to run again, or open the forensic views.");
      setStepIdx(-1);
      return;
    }
    if (idx === 0) {
      try {
        await startFresh();
      } catch (e) {
        setCaption(`Could not reset the ledger: ${e instanceof Error ? e.message : "unknown error"}`);
        return;
      }
    }
    await runStep(idx);
  }, [stepIdx, total, runStep, startFresh]);

  const play = useCallback(async () => {
    if (playingRef.current) {
      playingRef.current = false;
      setPlaying(false);
      return;
    }
    playingRef.current = true;
    setPlaying(true);
    let idx = stepIdx + 1 >= total ? 0 : stepIdx + 1;
    if (idx === 0) {
      try {
        await startFresh();
      } catch (e) {
        playingRef.current = false;
        setPlaying(false);
        setCaption(`Could not reset the ledger: ${e instanceof Error ? e.message : "unknown error"}`);
        return;
      }
    }
    while (playingRef.current && idx < total) {
      await runStep(idx);
      const step = steps[idx];
      const dwell = step?.kind === "decision" ? 2600 : step?.kind === "verify" || step?.kind === "tamper" ? 2200 : 1600;
      await new Promise((r) => setTimeout(r, dwell));
      idx += 1;
    }
    playingRef.current = false;
    setPlaying(false);
    if (idx >= total) {
      setCaption("Demo complete. Drag the scrubber to replay, Reset to run again, or open the forensic views.");
      setStepIdx(-1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx, total, runStep]);

  const resetAll = useCallback(async () => {
    playingRef.current = false;
    setPlaying(false);
    setVerifying(false);
    setRunning(true);
    setLoading(true);
    try {
      await api.reset();
      sodResource.current = `DEMO-SOD-${Math.floor(1000 + Math.random() * 9000)}`;
      setTimeline([]);
      setCursor(0);
      setFollowing(true);
      setStepIdx(-1);
      setCaption("Clean ledger. Press Play to run the demo, or Next to step through it.");
    } catch (e) {
      setCaption(`Reset failed: ${e instanceof Error ? e.message : "unknown error"}. Showing the previous run — try Reset again.`);
    } finally {
      setRunning(false);
      setLoading(false);
    }
  }, []);

  const runFleet = useCallback(async () => {
    setRunning(true);
    setFollowing(true);
    setCaption("Running a live fleet of agents — real proposed actions streaming through Warden onto the ledger.");
    try {
      const { count } = await api.runFleet(16);
      const ledger = await fetchLedger();
      setTimeline((prev) => {
        const lastDecision = [...prev].reverse().find((s) => s.decision)?.decision ?? null;
        return [...prev, { kind: "fleet", title: "Live fleet", caption: "", decision: lastDecision, marker: `${count} agent actions streamed onto the ledger`, ledger, verify: null }];
      });
    } finally {
      setRunning(false);
    }
  }, []);

  const last = timeline.length - 1;
  const viewIndex = timeline.length === 0 ? -1 : follow ? last : Math.min(cursor, last);
  const view = viewIndex >= 0 ? timeline[viewIndex] : null;
  const decision = view?.decision ?? null;
  const ledger = view?.ledger ?? [];
  const verify = view?.verify ?? null;
  const breakAt = verify && !verify.ok ? verify.breakAtSeq : null;

  const onScrub = (v: number) => {
    setFollowing(false);
    setVerifying(false);
    setCursor(v);
  };

  const orderedLedger = [...ledger].sort((a, b) => b.seq - a.seq).slice(0, 10);

  const noAuthority = (decision?.ctx.activeGrantCount ?? 0) === 0;
  const checks: { label: string; state: "pass" | "fail" | "na"; detail: string }[] = decision
    ? [
        {
          label: "Authority",
          state: noAuthority ? "fail" : "pass",
          detail: noAuthority ? "no active mandate" : "active grant up the desk hierarchy",
        },
        {
          // Limit was never evaluated when there's no authority — show neutral, not a false ✓.
          label: "Limit",
          state: noAuthority ? "na" : decision.verdict === "escalate" ? "fail" : "pass",
          detail: decision.ctx.limitChecked != null ? `${money.format(decision.amount)} vs ${money.format(decision.ctx.limitChecked)}` : "—",
        },
        {
          label: "Duties",
          state:
            decision.ctx.sodResult === "conflict"
              ? "fail"
              : noAuthority || decision.verdict === "escalate"
                ? "na"
                : "pass",
          detail: decision.ctx.sodResult === "conflict" ? `conflict · ${(decision.ctx.firedRuleIds ?? []).join(", ") || "SoD"}` : "no conflicting prior action",
        },
      ]
    : [];

  const tickTone = (s: Snapshot): string => {
    if (s.kind === "decision" && s.decision) return s.decision.verdict === "allow" ? "bg-allow" : s.decision.verdict === "deny" ? "bg-deny" : "bg-escalate";
    if (s.kind === "revoke") return "bg-primary";
    if (s.kind === "tamper") return "bg-deny";
    if (s.kind === "verify") return s.verify?.ok ? "bg-allow" : "bg-deny";
    return "bg-foreground/30";
  };

  return (
    <div className="mx-auto flex h-full max-w-[1500px] flex-col gap-4 p-4 lg:p-6">
      {/* Narration + controls */}
      <div className="rounded-lg border border-foreground/12 bg-card/50 p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <span>Guided simulation</span>
              <span className="text-foreground/30">·</span>
              <span>{stepIdx >= 0 ? `step ${stepIdx + 1} / ${total}` : timeline.length > 0 ? "replay" : "ready"}</span>
              {running && <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />}
            </div>
            <p className="max-w-3xl text-[15px] leading-relaxed text-foreground lg:text-base">
              {view && !follow ? view.caption || caption : caption}
            </p>
          </div>
          {/* Console control set: Play = oxblood primary, the rest quiet outlines.
              Mono caps, squared — the institutional console vocabulary, not SaaS pills. */}
          <div className="flex shrink-0 flex-wrap items-center gap-2 font-mono text-[11.5px] uppercase tracking-[0.07em]">
            <button
              onClick={play}
              disabled={running && !playing}
              className="rounded-md border border-primary bg-primary px-5 py-2.5 font-semibold text-[#f6efe9] shadow-[0_0_22px_rgba(110,29,36,0.35)] transition-colors hover:bg-[var(--color-sealbright)] hover:border-[var(--color-sealbright)] disabled:opacity-40"
            >
              {playing ? "Pause" : "Play"}
            </button>
            <button onClick={next} disabled={running || playing} className="rounded-md border border-border bg-card/60 px-4 py-2.5 text-foreground transition-colors hover:bg-card disabled:opacity-40">
              Next
            </button>
            <button onClick={resetAll} disabled={running} className="rounded-md border border-border bg-card/60 px-4 py-2.5 text-foreground transition-colors hover:bg-card disabled:opacity-40">
              Reset
            </button>
            <button onClick={runFleet} disabled={running || playing} className="rounded-md border border-border bg-card/60 px-4 py-2.5 text-foreground transition-colors hover:bg-card disabled:opacity-40">
              Run live fleet
            </button>
          </div>
        </div>

        {/* Time-travel scrubber */}
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <span>time-travel</span>
            <span>
              {timeline.length === 0
                ? "no history yet"
                : follow
                  ? "● live"
                  : `viewing ${viewIndex + 1} / ${timeline.length} — `}
              {!follow && timeline.length > 0 && (
                <button onClick={() => setFollowing(true)} className="text-primary underline-offset-2 hover:underline">
                  jump to live
                </button>
              )}
            </span>
          </div>
          {/* clickable markers */}
          <div className="mb-2 flex gap-1">
            {timeline.length === 0 ? (
              <div className="h-2 flex-1 rounded-full bg-foreground/8" />
            ) : (
              timeline.map((s, i) => (
                <button
                  key={i}
                  onClick={() => onScrub(i)}
                  title={`${s.title}${s.marker ? " · " + s.marker : ""}`}
                  className={`h-2 flex-1 rounded-full transition-opacity ${tickTone(s)} ${i === viewIndex ? "opacity-100" : "opacity-45 hover:opacity-75"}`}
                />
              ))
            )}
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(0, last)}
            value={viewIndex < 0 ? 0 : viewIndex}
            onChange={(e) => onScrub(Number(e.target.value))}
            disabled={timeline.length < 2}
            aria-label="Scrub through the simulation timeline"
            className="w-full accent-[var(--primary)] disabled:opacity-40"
          />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Decision inspector */}
        <div className="rounded-lg border border-foreground/12 bg-card/40 p-5 lg:p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Decision at this point</span>
            {view?.marker && <span className="font-mono text-[11px] text-primary">{view.marker}</span>}
          </div>
          {decision ? (
            // key on the request so the stamp re-mounts and re-stamps on a fresh decision —
            // the allow->deny flip after a revoke is the sanctioned verdict motion.
            <div key={`${decision.resource}-${decision.verdict}`} className={`rounded-lg border ${verdictBorder[decision.verdict]} bg-background/40 p-5`}>
              {/* Verdict is the debossed MONO wax stamp — never the serif. Dual-encoded. */}
              <VerdictStamp verdict={decision.verdict} className="text-[22px]" />
              <div className="mt-4 font-mono text-[13px] text-foreground/80">{decision.agent} · {decision.actionType}</div>
              <div className="font-mono text-[13px] text-muted-foreground">{decision.resource} · {money.format(decision.amount)}</div>
              <p className="mt-4 border-l-2 border-primary/40 pl-3 text-[14px] leading-relaxed text-foreground/90">{decision.reason}</p>
              <div className="mt-5 space-y-2">
                {checks.map((c) => (
                  <div key={c.label} className="flex items-center gap-3 font-mono text-[12px]">
                    {/* Dual-encode: glyph + semantic color + the state word, never hue alone. */}
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                        c.state === "pass"
                          ? "bg-allow/15 text-allow"
                          : c.state === "fail"
                            ? "bg-deny/15 text-deny"
                            : "bg-foreground/10 text-muted-foreground"
                      }`}
                      aria-hidden="true"
                    >
                      {c.state === "pass" ? "✓" : c.state === "fail" ? "✕" : "·"}
                    </span>
                    <span className="w-20 text-foreground/80">{c.label}</span>
                    <span
                      className={`w-10 uppercase tracking-[0.08em] ${
                        c.state === "pass" ? "text-allow" : c.state === "fail" ? "text-deny" : "text-muted-foreground"
                      }`}
                    >
                      {c.state === "pass" ? "pass" : c.state === "fail" ? "fail" : "n/a"}
                    </span>
                    <span className="text-muted-foreground">{c.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : loading ? (
            // Cold-start: authority is being resolved from DSQL. Skeleton spine of
            // outline-only discs — distinct from the genuine empty/ready state below.
            <div className="flex h-48 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-foreground/15 text-center">
              <div className="flex flex-col items-center gap-2.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-6 w-6 rounded-full border border-primary/40 bg-primary/[0.04]"
                    style={{ opacity: 0.4 + i * 0.2 }}
                  />
                ))}
              </div>
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Resolving authority from Aurora DSQL…
              </span>
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-foreground/15 text-center text-sm text-muted-foreground">
              {view?.marker ?? "No decision yet — Play or Next to begin."}
            </div>
          )}
        </div>

        {/* Ledger chain — the signature. The sealed wax spine; LedgerSpine drives
            the verify pass-down + break states and renders its own status line. */}
        <div className="flex min-h-0 flex-col rounded-lg border border-foreground/12 bg-card/40 p-5 lg:p-6">
          <div className="mb-4">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Ledger chain</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {orderedLedger.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">empty</div>
            ) : (
              <LedgerSpine
                blocks={orderedLedger}
                breakAtSeq={breakAt}
                verifying={verifying}
                verified={verify?.ok ?? false}
                compact
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

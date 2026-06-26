"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import type { CrossRegionResult } from "@/lib/types";
import { VerdictStamp } from "@/components/ledger/VerdictStamp";

/**
 * The cross-region money-shot, made visible. One logical Aurora DSQL cluster,
 * two active-active regions. A $2M trade is allowed in region A; the mandate is
 * revoked in region A; the identical action evaluated in region B is denied —
 * instantly, no stale read. We call the real /api/demo/cross-region (which runs
 * the whole sequence on the live cluster) and stage the reveal so the geography
 * is unmistakable: allow on us-east-1 → revoke → deny on us-west-2.
 */

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

type Phase = "idle" | "a" | "revoke" | "b" | "done";
const ORDER: Record<Phase, number> = { idle: 0, a: 1, revoke: 2, b: 3, done: 4 };

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function CrossRegionView() {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<CrossRegionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const run = useCallback(async () => {
    clearTimers();
    setStatus("running");
    setError(null);
    setResult(null);
    setPhase("idle");
    try {
      const r = await api.crossRegion();
      setResult(r);
      if (prefersReducedMotion()) {
        setPhase("done");
        setStatus("done");
        return;
      }
      setPhase("a");
      timers.current.push(setTimeout(() => setPhase("revoke"), 1100));
      timers.current.push(setTimeout(() => setPhase("b"), 2200));
      timers.current.push(
        setTimeout(() => {
          setPhase("done");
          setStatus("done");
        }, 3000),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "cross-region demo failed");
      setStatus("error");
    }
  }, []);

  const reached = (p: Phase) => ORDER[phase] >= ORDER[p];
  const a = result?.regionA;
  const b = result?.regionB;
  const action = result?.action;
  const regionALabel = a?.region ?? "us-east-1";
  const regionBLabel = b?.region ?? "us-west-2";

  return (
    <div className="mx-auto flex h-full max-w-[1400px] flex-col gap-4 p-4 lg:p-6">
      {/* Header + control */}
      <div className="rounded-lg border border-foreground/12 bg-card/50 p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Cross-region revocation · Aurora DSQL
            </div>
            <p className="max-w-2xl text-[15px] leading-relaxed text-foreground lg:text-base">
              Revoke an authority in one region and the next decision in the <em>other</em> region denies it —
              instantly, with no stale read. One logical cluster, two active-active regions. No async-replica
              setup can do this.
            </p>
          </div>
          <button
            onClick={run}
            disabled={status === "running"}
            className="shrink-0 rounded-full bg-[var(--color-seal)] px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {status === "running" ? "Running…" : status === "done" ? "Run again" : "Run cross-region demo"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-deny/40 bg-deny/[0.05] p-4 font-mono text-[13px] text-deny">
          {error}
        </div>
      )}

      {/* The two regions */}
      <div className="grid flex-1 grid-cols-1 items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
        {/* Region A — us-east-1 */}
        <RegionCard
          tag="Region A"
          region={regionALabel}
          endpoint={a?.endpoint}
          action={action}
          revealed={reached("a")}
          state={reached("a") ? "allow" : "idle"}
          note="Authorized under the active mandate — sealed to the ledger."
          idleNote="Awaiting the proposed action…"
        />

        {/* Revoke bridge */}
        <div className="flex flex-row items-center justify-center gap-3 lg:w-44 lg:flex-col">
          <div className="hidden h-px flex-1 bg-foreground/15 lg:block lg:h-auto lg:w-px" />
          <div
            className={`rounded-full border px-3 py-1.5 text-center font-mono text-[11px] uppercase tracking-[0.14em] transition-all ${
              reached("revoke")
                ? "border-[var(--color-seal)]/50 bg-[var(--color-seal)]/[0.08] text-[var(--color-seal)]"
                : "border-foreground/15 text-muted-foreground/50"
            } ${phase === "revoke" ? "animate-pulse" : ""}`}
          >
            {reached("revoke") ? "⊘ mandate revoked" : "revoke"}
          </div>
          {reached("revoke") && result && (
            <div className="font-mono text-[10px] text-muted-foreground">
              {new Date(result.revoke.revokedAt).toLocaleTimeString("en-GB")}
            </div>
          )}
          <div className="hidden h-px flex-1 bg-foreground/15 lg:block lg:h-auto lg:w-px" />
        </div>

        {/* Region B — us-west-2 */}
        <RegionCard
          tag="Region B"
          region={regionBLabel}
          endpoint={b?.endpoint}
          action={action}
          revealed={reached("b")}
          state={reached("b") ? "deny" : "idle"}
          note={b?.reason ?? "No active authority grant — denied."}
          idleNote={reached("revoke") ? "Re-evaluating the identical action…" : "Awaiting the proposed action…"}
        />
      </div>

      {/* Result */}
      <div className="rounded-lg border border-foreground/12 bg-card/40 p-4 lg:p-5">
        {phase === "done" && result ? (
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 font-mono text-[13px]">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${
                result.consistent ? "bg-allow/15 text-allow" : "bg-deny/15 text-deny"
              }`}
            >
              {result.consistent ? "✓ strongly consistent" : "✕ inconsistent"}
            </span>
            <span className="text-foreground/80">
              <span className="text-allow">allow</span> in {regionALabel} → revoke →{" "}
              <span className="text-deny">deny</span> in {regionBLabel}
            </span>
            <span className="text-muted-foreground">
              denied {result.crossRegionGapMs} ms after the revoke, in a different region
            </span>
          </div>
        ) : (
          <div className="font-mono text-[12px] text-muted-foreground">
            {status === "running"
              ? "Running the sequence on the live multi-region cluster…"
              : "Press Run to revoke an authority in one region and watch the other region deny the same action."}
          </div>
        )}
      </div>
    </div>
  );
}

function RegionCard({
  tag,
  region,
  endpoint,
  action,
  revealed,
  state,
  note,
  idleNote,
}: {
  tag: string;
  region: string;
  endpoint?: string;
  action?: CrossRegionResult["action"];
  revealed: boolean;
  state: "idle" | "allow" | "deny";
  note: string;
  idleNote: string;
}) {
  const accent = state === "allow" ? "border-allow/40" : state === "deny" ? "border-deny/40" : "border-foreground/12";
  return (
    <div className={`flex flex-col rounded-lg border ${accent} bg-card/40 p-5 transition-colors lg:p-6`}>
      <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{tag}</div>
      <div className="font-mono text-2xl font-medium tracking-tight text-foreground lg:text-3xl">{region}</div>
      {endpoint && <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground/70">{endpoint}</div>}

      <div className="mt-5 border-t border-foreground/8 pt-4">
        {action ? (
          <div className="font-mono text-[12px] text-muted-foreground">
            {action.actor} · {action.actionType}
            <br />
            <span className="text-foreground/80">
              {action.resource} · {money.format(action.amount)}
            </span>
          </div>
        ) : (
          <div className="font-mono text-[12px] text-muted-foreground/60">{idleNote}</div>
        )}
      </div>

      <div className="mt-5 flex flex-1 flex-col items-start justify-center gap-3">
        {revealed && state !== "idle" ? (
          <>
            <VerdictStamp verdict={state} className="text-2xl" />
            <p className="border-l-2 border-foreground/15 pl-3 text-[13px] leading-relaxed text-foreground/80">{note}</p>
          </>
        ) : (
          <div className="font-mono text-[12px] text-muted-foreground/50">{idleNote}</div>
        )}
      </div>
    </div>
  );
}

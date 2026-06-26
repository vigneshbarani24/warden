"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DecisionRow, GrantView, LedgerView } from "@/lib/pdp";
import type { VerifyResult } from "@/lib/ledger";
import { api } from "@/lib/api-client";
import { LedgerSpine } from "@/components/ledger/LedgerSpine";
import { VerdictStamp, type Verdict } from "@/components/ledger/VerdictStamp";
import styles from "./console.module.css";
import { ProcessFlowsView } from "./ProcessFlowsView";
import { ActivityView } from "./ActivityView";
import { ControlsView } from "./ControlsView";
import { SimulationView } from "./SimulationView";
import { CrossRegionView } from "./CrossRegionView";

type ViewKey = "simulation" | "crossregion" | "operations" | "flows" | "controls" | "activity";

const NAV: Array<{ key: ViewKey; label: string }> = [
  { key: "simulation", label: "Simulation" },
  { key: "crossregion", label: "Cross-region" },
  { key: "operations", label: "Operations" },
  { key: "flows", label: "Process Flows" },
  { key: "controls", label: "Controls" },
  { key: "activity", label: "Activity" },
];

interface DecisionCtx {
  activeGrantCount?: number;
  coveringGrantId?: string | null;
  limitChecked?: number | null;
  sodResult?: string;
  firedRuleIds?: string[];
  orgPath?: string;
  tower?: string;
  agent?: string | null;
}

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const shortHash = (h: string): string => h.slice(0, 10);
const verdictClass = (v: string): string => styles[v] ?? "";
// Dual-encode every verdict: glyph alongside color + word, never hue alone.
const VERDICT_GLYPH: Record<string, string> = { allow: "✓", deny: "✕", escalate: "▲" };
const verdictGlyph = (v: string): string => VERDICT_GLYPH[v] ?? "·";

export function Console() {
  const [view, setView] = useState<ViewKey>("simulation");
  const [decisions, setDecisions] = useState<DecisionRow[]>([]);
  const [ledger, setLedger] = useState<LedgerView[]>([]);
  const [allGrants, setAllGrants] = useState<GrantView[]>([]);
  const [grants, setGrants] = useState<GrantView[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [d, l, g] = await Promise.all([api.decisions(), api.ledger(), api.allGrants()]);
    setDecisions(d);
    setLedger(l);
    setAllGrants(g);
    setSelectedId((cur) => cur ?? d[0]?.requestId ?? null);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selected = useMemo(
    () => decisions.find((d) => d.requestId === selectedId) ?? null,
    [decisions, selectedId],
  );

  useEffect(() => {
    if (!selected) {
      setGrants([]);
      return;
    }
    void api.grants(selected.actor).then(setGrants).catch(() => setGrants([]));
  }, [selected]);

  const ctx = (selected?.evaluatedContext ?? {}) as DecisionCtx;
  const orderedLedger = useMemo(() => [...ledger].sort((a, b) => a.seq - b.seq), [ledger]);
  const activeGrants = allGrants.filter((g) => g.active).length;

  const chain = verifyResult
    ? verifyResult.ok
      ? { word: "INTACT", cls: styles.allow, dot: "var(--allow)" }
      : { word: "BREACH", cls: styles.deny, dot: "var(--deny)" }
    : { word: "UNVERIFIED", cls: "", dot: "var(--text-faint)" };

  const handleVerify = useCallback(async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      setVerifyResult(await api.verify());
    } finally {
      setTimeout(() => setVerifying(false), orderedLedger.length * 70 + 460);
    }
  }, [orderedLedger.length]);

  const handleRevoke = useCallback(
    async (id: string) => {
      setBusy(true);
      try {
        await api.revoke(id);
        const [g, all] = await Promise.all([
          selected ? api.grants(selected.actor) : Promise.resolve([]),
          api.allGrants(),
        ]);
        setGrants(g);
        setAllGrants(all);
      } finally {
        setBusy(false);
      }
    },
    [selected],
  );

  const handleRerun = useCallback(async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const out = await api.decide({
        requestId: crypto.randomUUID(),
        actor: selected.actor,
        actionType: selected.actionType,
        resource: selected.resource,
        amount: selected.amount,
        orgPath: ctx.orgPath ?? "/root/finance/p2p/",
        context: ctx.agent ? { agent: ctx.agent } : undefined,
      });
      await refresh();
      setSelectedId(out.requestId);
      setVerifyResult(null);
    } finally {
      setBusy(false);
    }
  }, [selected, ctx.orgPath, ctx.agent, refresh]);

  const handleTamper = useCallback(async () => {
    setBusy(true);
    try {
      await api.tamper();
      setLedger(await api.ledger());
      setVerifyResult(null);
    } finally {
      setBusy(false);
    }
  }, []);

  const handleReset = useCallback(async () => {
    setBusy(true);
    try {
      await api.reset();
      setSelectedId(null);
      setVerifyResult(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const handleRunFleet = useCallback(async () => {
    setBusy(true);
    try {
      await api.runFleet(12);
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.brandSeal} />
          <span className={styles.wordmark}>WARDEN</span>
          <span className={styles.divider} />
          <span className={styles.subtitle}>Decision Command</span>
        </div>
        {/* Slim mono readout: the four KPIs demoted off the Operations band into a
            single topbar line, returning that vertical space to the verdict + chain. */}
        <div className={styles.topReadout}>
          <span className={styles.readoutItem}>
            <span className={styles.readoutNum}>{activeGrants}</span> grants in force
          </span>
          <span className={styles.readoutSep} />
          <span className={styles.readoutItem}>
            <span className={styles.readoutNum}>{decisions.length}</span> decisions
          </span>
          <span className={styles.readoutSep} />
          <span className={styles.readoutItem}>
            <span className={styles.readoutNum}>{ledger.length}</span> sealed
          </span>
          <span className={styles.readoutSep} />
          <span className={`${styles.readoutItem} ${chain.cls}`}>
            <span className={styles.statusDot} style={{ background: chain.dot, boxShadow: `0 0 9px ${chain.dot}` }} />
            chain {chain.word.toLowerCase()}
          </span>
        </div>
        <div className={styles.clusterStatus}>
          <span className={styles.liveDot} />
          Aurora DSQL · us-east-1 · strongly consistent
        </div>
      </header>

      <div className={styles.body}>
        <nav className={styles.nav}>
          {NAV.map((n) => (
            <button
              key={n.key}
              className={`${styles.navItem} ${view === n.key ? styles.navItemActive : ""}`}
              onClick={() => setView(n.key)}
            >
              {n.label}
            </button>
          ))}
          <div className={styles.navSpacer} />
          <div className={styles.navFoot}>
            Meridian Refining Co.
            <br />
            finance operations
          </div>
        </nav>

        <main className={styles.main}>
          {view === "simulation" && <SimulationView />}
          {view === "crossregion" && <CrossRegionView />}
          {view === "flows" && <ProcessFlowsView decisions={decisions} />}
          {view === "controls" && <ControlsView grants={allGrants} />}
          {view === "activity" && <ActivityView decisions={decisions} onRun={handleRunFleet} running={busy} />}

          {view === "operations" && (
            <div className={styles.opsView}>
              <div className={styles.panes}>
                {/* REQUEST FEED */}
                <section className={`${styles.pane} ${styles.feed}`}>
                  <div className={styles.paneHead}>
                    <span>Request Feed</span>
                    <span className={styles.count}>{decisions.length}</span>
                  </div>
                  {decisions.length === 0 ? (
                    <div className={styles.empty}>No actions awaiting a decision.</div>
                  ) : (
                    decisions.map((d) => {
                      const rc = (d.evaluatedContext ?? {}) as DecisionCtx;
                      return (
                        <div
                          key={d.requestId}
                          className={`${styles.row} ${d.requestId === selectedId ? styles.rowSelected : ""} ${verdictClass(d.verdict)}`}
                          onClick={() => setSelectedId(d.requestId)}
                          onKeyDown={(e) => e.key === "Enter" && setSelectedId(d.requestId)}
                          tabIndex={0}
                          role="button"
                        >
                          <span className={styles.tick} />
                          <div className={styles.rowMain}>
                            <div className={styles.rowAction}>{d.actionType}</div>
                            <div className={styles.rowMeta}>
                              {d.actor} · {d.resource}
                            </div>
                            <div className={styles.rowTags}>
                              {rc.tower && <span className={styles.tag}>{rc.tower}</span>}
                              {rc.agent && <span className={styles.tagAgent}>{rc.agent}</span>}
                            </div>
                          </div>
                          <div className={styles.rowRight}>
                            <span className={styles.amount}>{money.format(d.amount)}</span>
                            <span className={styles.badge}>
                              <span aria-hidden="true">{verdictGlyph(d.verdict)}</span> {d.verdict}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </section>

                {/* DECISION INSPECTOR */}
                <section className={styles.pane}>
                  {!selected ? (
                    <div className={styles.placeholder}>Select a decision to inspect</div>
                  ) : (
                    <div className={styles.inspectorInner} key={selected.requestId}>
                      {/* Hero verdict: the debossed MONO wax stamp (dual-encoded), not serif. */}
                      <div className={styles.stampBlock}>
                        <VerdictStamp verdict={selected.verdict as Verdict} className={styles.heroStamp} />
                        <span className={styles.stampSub}>
                          sealed · {new Date(selected.createdAt).toISOString().replace("T", " ").slice(0, 19)} UTC
                        </span>
                      </div>

                      <div className={styles.kgrid}>
                        <span className={styles.klabel}>Actor</span>
                        <span className={styles.kvalue}>{selected.actor}</span>
                        <span className={styles.klabel}>Action</span>
                        <span className={styles.kvalue}>{selected.actionType}</span>
                        <span className={styles.klabel}>Tower</span>
                        <span className={styles.kvalue}>{ctx.tower ?? "—"}</span>
                        <span className={styles.klabel}>Executed by</span>
                        <span className={styles.kvalue}>{ctx.agent ?? "—"}</span>
                        <span className={styles.klabel}>Resource</span>
                        <span className={styles.kvalue}>{selected.resource}</span>
                        <span className={styles.klabel}>Amount</span>
                        <span className={`${styles.kvalue} ${styles.amountBig}`}>{money.format(selected.amount)}</span>
                      </div>

                      <p className={styles.reason}>{selected.reason}</p>

                      <div className={styles.sectionLabel} style={{ marginTop: "28px" }}>
                        Decision trace
                      </div>
                      <div className={styles.trace}>
                        <div className={styles.traceStep}>
                          <span className={`${styles.traceIcon} ${(ctx.activeGrantCount ?? 0) > 0 ? styles.allow : styles.deny}`}>
                            {(ctx.activeGrantCount ?? 0) > 0 ? "✓" : "✕"}
                          </span>
                          <span className={styles.traceLabel}>Authority</span>
                          <span className={styles.traceDetail}>
                            {(ctx.activeGrantCount ?? 0) > 0
                              ? "active mandate resolved up the desk hierarchy"
                              : "no active mandate"}
                          </span>
                        </div>
                        <div className={styles.traceStep}>
                          <span
                            className={`${styles.traceIcon} ${
                              (ctx.activeGrantCount ?? 0) === 0
                                ? ""
                                : selected.verdict === "escalate"
                                  ? styles.escalate
                                  : styles.allow
                            }`}
                          >
                            {(ctx.activeGrantCount ?? 0) === 0 ? "·" : selected.verdict === "escalate" ? "▲" : "✓"}
                          </span>
                          <span className={styles.traceLabel}>Limit</span>
                          <span className={styles.traceDetail}>
                            {(ctx.activeGrantCount ?? 0) === 0
                              ? "—"
                              : `${money.format(selected.amount)} vs ${ctx.limitChecked != null ? money.format(ctx.limitChecked) : "—"} mandate`}
                          </span>
                        </div>
                        <div className={styles.traceStep}>
                          <span
                            className={`${styles.traceIcon} ${
                              ctx.sodResult === "conflict"
                                ? styles.deny
                                : (ctx.activeGrantCount ?? 0) === 0 || selected.verdict === "escalate"
                                  ? ""
                                  : styles.allow
                            }`}
                          >
                            {ctx.sodResult === "conflict"
                              ? "✕"
                              : (ctx.activeGrantCount ?? 0) === 0 || selected.verdict === "escalate"
                                ? "·"
                                : "✓"}
                          </span>
                          <span className={styles.traceLabel}>Segregation of duties</span>
                          <span className={styles.traceDetail}>
                            {ctx.sodResult === "conflict"
                              ? (ctx.firedRuleIds?.join(", ") ?? "conflict")
                              : (ctx.activeGrantCount ?? 0) === 0 || selected.verdict === "escalate"
                                ? "—"
                                : "no conflict"}
                          </span>
                        </div>
                        <div className={`${styles.traceResult} ${verdictClass(selected.verdict)}`}>
                          → {selected.verdict.toUpperCase()}
                        </div>
                      </div>

                      {(ctx.firedRuleIds?.length ?? 0) > 0 && (
                        <>
                          <div className={styles.sectionLabel}>Policies fired</div>
                          <div className={styles.policies}>
                            {ctx.firedRuleIds?.map((id) => (
                              <span key={id} className={styles.chip}>
                                {id}
                              </span>
                            ))}
                          </div>
                        </>
                      )}

                      <div className={styles.context}>
                        <div className={styles.contextHead}>context at decision</div>
                        <div className={styles.contextBody}>
                          <span className={styles.klabel}>active grants</span>
                          <span>{ctx.activeGrantCount ?? "—"}</span>
                          <span className={styles.klabel}>covering grant</span>
                          <span>{ctx.coveringGrantId ? shortHash(ctx.coveringGrantId) : "none"}</span>
                          <span className={styles.klabel}>limit checked</span>
                          <span>{ctx.limitChecked != null ? money.format(ctx.limitChecked) : "—"}</span>
                          <span className={styles.klabel}>sod result</span>
                          <span className={ctx.sodResult === "conflict" ? styles.deny : ""}>{ctx.sodResult ?? "—"}</span>
                        </div>
                      </div>

                      <div className={styles.actions}>
                        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleRerun} disabled={busy}>
                          Re-run decision
                        </button>
                      </div>

                      <div className={styles.grants}>
                        <div className={styles.sectionLabel}>{selected.actor} · authority grants</div>
                        {grants.length === 0 ? (
                          <div className={styles.empty} style={{ padding: "8px 0" }}>
                            No grants on record.
                          </div>
                        ) : (
                          grants.map((g) => (
                            <div key={g.id} className={`${styles.grantRow} ${g.active ? "" : styles.grantRevoked}`}>
                              <div className={styles.grantInfo}>
                                <span>
                                  {g.actionType} · {g.orgPath} · up to {money.format(g.approvalLimit)}
                                </span>
                                <span className={styles.grantWindow}>
                                  {g.validFrom.slice(0, 10)} → {g.validTo.slice(0, 10)}
                                  {g.revokedAt ? ` · revoked ${g.revokedAt.slice(0, 10)}` : ""}
                                </span>
                              </div>
                              {g.active ? (
                                <button
                                  className={`${styles.btn} ${styles.btnDanger}`}
                                  onClick={() => handleRevoke(g.id)}
                                  disabled={busy}
                                >
                                  Revoke
                                </button>
                              ) : (
                                <span className={`${styles.grantStatus} ${styles.deny}`}>revoked</span>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </section>

                {/* LEDGER CHAIN */}
                <section className={`${styles.pane} ${styles.chain}`}>
                  <div className={styles.verifyBar}>
                    <div className={styles.verifyHead}>Ledger Chain</div>
                    <div className={styles.verifyStatus}>
                      <span
                        className={styles.statusDot}
                        style={{ background: chain.dot, boxShadow: `0 0 9px ${chain.dot}` }}
                      />
                      {verifyResult
                        ? verifyResult.ok
                          ? `Chain intact through ${orderedLedger.length} seals`
                          : `Break detected at seq ${verifyResult.breakAtSeq}`
                        : "Not yet verified"}
                    </div>
                    <div className={styles.verifyButtons}>
                      <button
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        onClick={handleVerify}
                        disabled={busy || verifying}
                      >
                        Verify
                      </button>
                      <button className={styles.btn} onClick={handleTamper} disabled={busy}>
                        Tamper
                      </button>
                      <button className={styles.btn} onClick={handleReset} disabled={busy}>
                        Reset
                      </button>
                    </div>
                  </div>

                  <div className={styles.spine}>
                    {orderedLedger.length === 0 ? (
                      <div className={styles.empty}>The ledger is empty.</div>
                    ) : (
                      // The signature sealed spine. Verify runs the pass-down lock-green;
                      // a break tints from the seq down red. LedgerSpine owns both motions.
                      <LedgerSpine
                        blocks={orderedLedger}
                        breakAtSeq={verifyResult && !verifyResult.ok ? verifyResult.breakAtSeq : null}
                        verifying={verifying}
                        verified={verifyResult?.ok ?? false}
                      />
                    )}
                  </div>
                </section>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

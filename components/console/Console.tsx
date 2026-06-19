"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DecisionRow, GrantView, LedgerView } from "@/lib/pdp";
import type { VerifyResult } from "@/lib/ledger";
import { api } from "@/lib/api-client";
import styles from "./console.module.css";

interface DecisionCtx {
  activeGrantCount?: number;
  coveringGrantId?: string | null;
  limitChecked?: number | null;
  sodResult?: string;
  firedRuleIds?: string[];
  orgPath?: string;
}

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const shortHash = (h: string): string => h.slice(0, 10);
const verdictClass = (v: string): string => styles[v] ?? "";

export function Console() {
  const [decisions, setDecisions] = useState<DecisionRow[]>([]);
  const [ledger, setLedger] = useState<LedgerView[]>([]);
  const [grants, setGrants] = useState<GrantView[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [d, l] = await Promise.all([api.decisions(), api.ledger()]);
    setDecisions(d);
    setLedger(l);
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

  const handleVerify = useCallback(async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const result = await api.verify();
      setVerifyResult(result);
    } finally {
      const settle = orderedLedger.length * 70 + 420;
      setTimeout(() => setVerifying(false), settle);
    }
  }, [orderedLedger.length]);

  const handleRevoke = useCallback(
    async (id: string) => {
      setBusy(true);
      try {
        await api.revoke(id);
        if (selected) setGrants(await api.grants(selected.actor));
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
        orgPath: ctx.orgPath ?? "/root/finance/ap/",
      });
      await refresh();
      setSelectedId(out.requestId);
      setVerifyResult(null);
    } finally {
      setBusy(false);
    }
  }, [selected, ctx.orgPath, refresh]);

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

  const sealState = (seq: number): string => {
    if (!verifyResult) return "";
    if (verifyResult.ok) return styles.sealVerified ?? "";
    return seq >= verifyResult.breakAtSeq ? styles.sealBroken ?? "" : styles.sealVerified ?? "";
  };

  return (
    <div className={styles.shell}>
      <header className={styles.masthead}>
        <div className={styles.brand}>
          <span className={styles.sealDot} />
          <span className={styles.wordmark}>WARDEN</span>
          <span className={styles.tagline}>forensic governance console</span>
        </div>
        <div className={styles.cluster}>
          <span className={styles.live} />
          aurora dsql · us-east-1 · strongly consistent
        </div>
      </header>

      <div className={styles.panes}>
        {/* REQUEST FEED */}
        <section className={`${styles.pane} ${styles.feed}`}>
          <div className={styles.paneHead}>Request feed</div>
          {decisions.length === 0 ? (
            <div className={styles.empty}>No actions awaiting a decision.</div>
          ) : (
            decisions.map((d) => (
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
                  <span className={styles.rowAction} style={{ color: "var(--ink)" }}>
                    {d.actionType}
                  </span>
                  <span className={styles.rowMeta}>
                    {d.actor} · {d.resource}
                  </span>
                </div>
                <div className={styles.rowRight}>
                  <span className={styles.amount} style={{ color: "var(--ink)" }}>
                    {money.format(d.amount)}
                  </span>
                  <span className={styles.badge}>{d.verdict}</span>
                </div>
              </div>
            ))
          )}
        </section>

        {/* DECISION INSPECTOR */}
        <section className={styles.pane}>
          {!selected ? (
            <div className={styles.placeholder}>Select a decision to inspect.</div>
          ) : (
            <div className={`${styles.inspectorInner} ${styles.flip}`} key={selected.requestId}>
              <div className={`${styles.stamp} ${verdictClass(selected.verdict)}`}>
                <span className={styles.stampVerdict}>{selected.verdict}</span>
                <span className={styles.stampSub}>
                  sealed · {new Date(selected.createdAt).toISOString().replace("T", " ").slice(0, 19)} UTC
                </span>
              </div>

              <div className={styles.kgrid}>
                <span className={styles.klabel}>Actor</span>
                <span className={styles.kvalue}>{selected.actor}</span>
                <span className={styles.klabel}>Action</span>
                <span className={styles.kvalue}>{selected.actionType}</span>
                <span className={styles.klabel}>Resource</span>
                <span className={styles.kvalue}>{selected.resource}</span>
                <span className={styles.klabel}>Amount</span>
                <span className={`${styles.kvalue} ${styles.amountBig}`}>{money.format(selected.amount)}</span>
              </div>

              <p className={styles.reason}>{selected.reason}</p>

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
                        <button className={styles.btn} onClick={() => handleRevoke(g.id)} disabled={busy}>
                          Revoke grant
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
            <div className={styles.paneHead} style={{ position: "static", padding: 0, border: "none", background: "none" }}>
              Ledger chain
            </div>
            <div className={styles.verifyStatus}>
              <span
                className={styles.sealDot}
                style={{
                  background: verifyResult
                    ? verifyResult.ok
                      ? "var(--allow)"
                      : "var(--deny)"
                    : "var(--line)",
                }}
              />
              {verifyResult
                ? verifyResult.ok
                  ? `Chain intact through ${orderedLedger.length} seals`
                  : `Break detected at seq ${verifyResult.breakAtSeq}`
                : "Not yet verified"}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleVerify} disabled={busy || verifying}>
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
              orderedLedger.map((b, i) => (
                <div key={b.seq} className={styles.block}>
                  <div
                    className={`${styles.seal} ${sealState(b.seq)} ${verifying ? styles.locking : ""}`}
                    style={verifying ? { animationDelay: `${i * 70}ms` } : undefined}
                  >
                    {String(b.seq).padStart(4, "0")}
                  </div>
                  <div className={styles.blockMeta}>
                    <span className={styles.blockSeq}>seq {String(b.seq).padStart(4, "0")}</span>
                    <span className={styles.blockHash}>{shortHash(b.hash)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

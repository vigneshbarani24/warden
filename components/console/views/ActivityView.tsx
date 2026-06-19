"use client";

import type { DecisionRow } from "@/lib/pdp";
import styles from "../console.module.css";

interface Ctx {
  tower?: string;
  agent?: string | null;
}

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const verdictClass = (v: string): string => styles[v] ?? "";

export function ActivityView({
  decisions,
  onRun,
  running,
}: {
  decisions: DecisionRow[];
  onRun: () => void;
  running: boolean;
}) {
  return (
    <div className={styles.activity}>
      <div className={styles.activityBar}>
        <div>
          <div className={styles.verifyHead}>Activity Stream — Agent Fleet</div>
          <div className={styles.activitySub}>every action an agent proposes, decided live by Warden</div>
        </div>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={onRun} disabled={running}>
          {running ? "Running fleet…" : "Run fleet"}
        </button>
      </div>

      <div className={styles.logHead}>
        <span>time</span>
        <span>agent</span>
        <span>tower</span>
        <span>action</span>
        <span>resource</span>
        <span>amount</span>
        <span>verdict</span>
      </div>

      <div className={styles.log}>
        {decisions.length === 0 ? (
          <div className={styles.empty}>No agent activity yet — run the fleet.</div>
        ) : (
          decisions.map((d) => {
            const c = (d.evaluatedContext ?? {}) as Ctx;
            return (
              <div key={d.requestId} className={styles.logRow}>
                <span className={styles.logDim}>{new Date(d.createdAt).toISOString().slice(11, 19)}</span>
                <span>{c.agent ?? "—"}</span>
                <span className={styles.logDim}>{c.tower ?? "—"}</span>
                <span>{d.actionType}</span>
                <span className={styles.logDim}>{d.resource}</span>
                <span>{money.format(d.amount)}</span>
                <span className={`${styles.logVerdict} ${verdictClass(d.verdict)}`}>{d.verdict}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

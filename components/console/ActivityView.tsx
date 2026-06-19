"use client";

import type { DecisionRow } from "@/lib/pdp";
import styles from "./console.module.css";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

interface Ctx {
  tower?: string;
  agent?: string | null;
}

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
    <div className={styles.activityView}>
      <div
        className={styles.viewHead}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}
      >
        <div>
          <h2 className={styles.viewTitle}>Activity Stream</h2>
          <p className={styles.viewSub}>
            Every agentic action evaluated by Warden across the agent fleet, newest first.
          </p>
        </div>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={onRun} disabled={running}>
          {running ? "Running fleet…" : "Run fleet"}
        </button>
      </div>

      <div className={styles.logStream}>
        <div className={styles.logHeadRow}>
          <span>time</span>
          <span>agent</span>
          <span>tower</span>
          <span>action</span>
          <span>resource</span>
          <span>amount</span>
          <span>verdict</span>
        </div>
        {decisions.map((d) => {
          const c = (d.evaluatedContext ?? {}) as Ctx;
          return (
            <div key={d.requestId} className={styles.logRow}>
              <span className={styles.logTime}>{new Date(d.createdAt).toISOString().slice(11, 19)}</span>
              <span>{c.agent ?? "—"}</span>
              <span className={styles.logTower}>{c.tower ?? "—"}</span>
              <span>{d.actionType}</span>
              <span className={styles.logRes}>{d.resource}</span>
              <span className={styles.logAmt}>{money.format(d.amount)}</span>
              <span className={`${styles.logVerdict} ${styles[d.verdict] ?? ""}`}>{d.verdict.toUpperCase()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

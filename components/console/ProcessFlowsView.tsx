"use client";

import type { DecisionRow } from "@/lib/pdp";
import styles from "./console.module.css";

const FLOWS: Array<{ name: string; steps: Array<{ action: string; label: string }> }> = [
  {
    name: "Trade Lifecycle",
    steps: [
      { action: "capture_trade", label: "Deal capture" },
      { action: "approve_confirmation", label: "Confirmation" },
      { action: "approve_settlement", label: "Settlement" },
      { action: "approve_invoice", label: "Invoicing" },
    ],
  },
  {
    name: "Physical / Cargo",
    steps: [
      { action: "nominate_cargo", label: "Nomination" },
      { action: "actualize_cargo", label: "Actualization" },
    ],
  },
  {
    name: "Counterparty & Credit",
    steps: [
      { action: "approve_counterparty", label: "Onboard counterparty" },
      { action: "override_credit_limit", label: "Credit override" },
    ],
  },
];

const SEVERITY: Record<string, number> = { deny: 3, escalate: 2, allow: 1 };

export function ProcessFlowsView({ decisions }: { decisions: DecisionRow[] }) {
  // Show the most consequential verdict Warden has returned for each step.
  const stepVerdict = (action: string): string | null => {
    let best: string | null = null;
    for (const d of decisions) {
      if (d.actionType !== action) continue;
      if (best === null || (SEVERITY[d.verdict] ?? 0) > (SEVERITY[best] ?? 0)) best = d.verdict;
    }
    return best;
  };

  return (
    <div className={styles.flowsView}>
      <div className={styles.viewHead}>
        <h2 className={styles.viewTitle}>Process Flows</h2>
        <p className={styles.viewSub}>
          Every agentic step in the trade lifecycle passes the Warden gate before it executes.
        </p>
      </div>

      {FLOWS.map((f) => (
        <div key={f.name} className={styles.flow}>
          <div className={styles.flowTower}>{f.name}</div>
          <div className={styles.flowSteps}>
            {f.steps.map((s, i) => {
              const v = stepVerdict(s.action);
              return (
                <div key={s.action} className={styles.flowStepWrap}>
                  <div className={styles.flowStep}>
                    <div className={styles.flowAgent}>AGENT</div>
                    <div className={styles.flowAction}>{s.label}</div>
                    <div className={styles.flowGate}>
                      <span className={styles.flowGateLabel}>WARDEN</span>
                      <span className={`${styles.flowVerdict} ${v ? styles[v] ?? "" : styles.flowIdle}`}>
                        {v ? v.toUpperCase() : "—"}
                      </span>
                    </div>
                  </div>
                  {i < f.steps.length - 1 && <span className={styles.flowArrow}>→</span>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

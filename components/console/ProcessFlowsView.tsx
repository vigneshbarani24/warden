"use client";

import type { DecisionRow } from "@/lib/pdp";
import styles from "./console.module.css";

interface Ctx {
  tower?: string;
}

const FLOWS: Array<{ tower: string; steps: Array<{ action: string; label: string }> }> = [
  {
    tower: "Procure-to-Pay",
    steps: [
      { action: "create_vendor", label: "Create vendor" },
      { action: "approve_vendor_invoice", label: "Approve invoice" },
      { action: "approve_payment", label: "Release payment" },
    ],
  },
  {
    tower: "Order-to-Cash",
    steps: [
      { action: "approve_discount", label: "Approve discount" },
      { action: "approve_credit_override", label: "Credit override" },
    ],
  },
  {
    tower: "Master Data",
    steps: [
      { action: "update_master_data", label: "Update master data" },
      { action: "change_vendor_bank", label: "Change bank details" },
    ],
  },
  {
    tower: "Travel & Expense",
    steps: [
      { action: "submit_expense", label: "Submit expense" },
      { action: "approve_expense", label: "Approve expense" },
    ],
  },
];

export function ProcessFlowsView({ decisions }: { decisions: DecisionRow[] }) {
  const latestVerdict = (tower: string, action: string): string | null => {
    const d = decisions.find(
      (x) => x.actionType === action && ((x.evaluatedContext ?? {}) as Ctx).tower === tower,
    );
    return d?.verdict ?? null;
  };

  return (
    <div className={styles.flowsView}>
      <div className={styles.viewHead}>
        <h2 className={styles.viewTitle}>Process Flows</h2>
        <p className={styles.viewSub}>
          Every agentic step in each business process passes the Warden gate before it executes.
        </p>
      </div>

      {FLOWS.map((f) => (
        <div key={f.tower} className={styles.flow}>
          <div className={styles.flowTower}>{f.tower}</div>
          <div className={styles.flowSteps}>
            {f.steps.map((s, i) => {
              const v = latestVerdict(f.tower, s.action);
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

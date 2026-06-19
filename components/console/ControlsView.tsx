"use client";

import { useEffect, useState } from "react";
import type { GrantView, PolicyRuleView } from "@/lib/pdp";
import { api } from "@/lib/api-client";
import styles from "./console.module.css";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const day = (iso: string): string => new Date(iso).toISOString().slice(0, 10);

const SNIPPET = `import { Warden } from "@warden/sdk";
const warden = new Warden({ endpoint: process.env.WARDEN_URL });

// Before the agent executes ANY business action:
const v = await warden.decide({
  actor:      "settlement-agent",
  actionType: "approve_settlement",
  resource:   "DEAL-CR-8801",
  amount:     2_000_000,
  orgPath:    "/global/trading/crude/",
});

if (v.verdict !== "allow") halt(v.reason);  // deny | escalate -> human`;

export function ControlsView({ grants }: { grants: GrantView[] }) {
  const [rules, setRules] = useState<PolicyRuleView[]>([]);

  useEffect(() => {
    void api.policies().then(setRules).catch(() => setRules([]));
  }, []);

  return (
    <div className={styles.controlsView}>
      <div className={styles.viewHead}>
        <h2 className={styles.viewTitle}>Controls</h2>
        <p className={styles.viewSub}>
          Warden&apos;s rules are data, not code — the live authority grants and segregation-of-duties rules the
          engine evaluates. Model your own for any domain; the engine never changes.
        </p>
      </div>

      <div className={styles.flowTower}>Authority grants · the mandate matrix</div>
      <div className={styles.ctrlTable}>
        <div className={`${styles.ctrlRow} ${styles.ctrlHead}`}>
          <span>principal</span>
          <span>scope</span>
          <span>action</span>
          <span>limit</span>
          <span>window</span>
          <span>status</span>
        </div>
        {grants.map((g) => (
          <div key={g.id} className={styles.ctrlRow}>
            <span className={styles.ctrlPrincipal}>{g.principalId}</span>
            <span className={styles.ctrlDim}>{g.orgPath}</span>
            <span>{g.actionType}</span>
            <span className={styles.ctrlDim}>{money.format(g.approvalLimit)}</span>
            <span className={styles.ctrlDim}>
              {day(g.validFrom)} → {day(g.validTo)}
            </span>
            <span className={`${styles.tlBadge} ${g.active ? styles.tlBadgeActive : styles.tlBadgeRevoked}`}>
              {g.active ? "ACTIVE" : g.revokedAt ? "REVOKED" : "INACTIVE"}
            </span>
          </div>
        ))}
      </div>

      <div className={styles.flowTower} style={{ marginTop: "32px" }}>
        Segregation-of-duties rules
      </div>
      <div className={styles.ctrlRules}>
        {rules.length === 0 && <div className={styles.tlEmpty}>No policy rules loaded.</div>}
        {rules.map((r) => (
          <div key={r.id} className={styles.ctrlRule}>
            <span className={styles.ctrlCode}>{r.code}</span>
            <span className={styles.ctrlPair}>
              {r.conflicting.length === 2 ? (
                <>
                  <span className={styles.ctrlAction}>{r.conflicting[0]}</span>
                  <span className={styles.ctrlConflict}> ⊗ </span>
                  <span className={styles.ctrlAction}>{r.conflicting[1]}</span>
                  <span className={styles.ctrlDim}> — same actor, same resource, denied</span>
                </>
              ) : (
                <span className={styles.ctrlDim}>{r.conflicting.join(", ")}</span>
              )}
            </span>
            <span className={`${styles.tlBadge} ${r.active ? styles.tlBadgeActive : styles.tlBadgeRevoked}`}>
              {r.active ? "ACTIVE" : "OFF"}
            </span>
          </div>
        ))}
      </div>

      <div className={styles.flowTower} style={{ marginTop: "32px" }}>
        Integrate · one call before every agent action
      </div>
      <p className={styles.ctrlIntegrateSub}>
        Warden is authorization middleware for agent actions — framework-agnostic. LangGraph, CrewAI, AWS
        AgentCore, or SAP Joule all POST the same contract.
      </p>
      <pre className={styles.codeBlock}>{SNIPPET}</pre>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import type { DecisionRow, GrantView } from "@/lib/pdp";
import styles from "./console.module.css";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const clock = (iso: string): string => new Date(iso).toISOString().slice(11, 19);
const day = (iso: string): string => new Date(iso).toISOString().slice(0, 10);

type Event =
  | { kind: "decision"; t: number; d: DecisionRow }
  | { kind: "revoke"; t: number; g: GrantView };

export function TimelineView({ decisions, grants }: { decisions: DecisionRow[]; grants: GrantView[] }) {
  // Mandate holders (principals that hold a grant) make the meaningful timelines.
  const actors = useMemo(() => Array.from(new Set(grants.map((g) => g.principalId))).sort(), [grants]);
  const [actor, setActor] = useState<string>("liam.obrien");
  const active = actors.includes(actor) ? actor : (actors[0] ?? "");

  const actorGrants = useMemo(() => grants.filter((g) => g.principalId === active), [grants, active]);

  const events = useMemo<Event[]>(() => {
    const evs: Event[] = decisions
      .filter((d) => d.actor === active)
      .map((d) => ({ kind: "decision", t: new Date(d.createdAt).getTime(), d }));
    for (const g of actorGrants) {
      if (g.revokedAt) evs.push({ kind: "revoke", t: new Date(g.revokedAt).getTime(), g });
    }
    return evs.sort((a, b) => a.t - b.t);
  }, [decisions, actorGrants, active]);

  let revoked = false;

  return (
    <div className={styles.timelineView}>
      <div className={styles.viewHead}>
        <h2 className={styles.viewTitle}>Timeline</h2>
        <p className={styles.viewSub}>
          The same action, a different verdict — because authority changes over time. Warden reads the mandate
          state as of each decision.
        </p>
      </div>

      <div className={styles.tlChips}>
        {actors.map((a) => (
          <button
            key={a}
            className={`${styles.tlChip} ${a === active ? styles.tlChipActive : ""}`}
            onClick={() => setActor(a)}
          >
            {a}
          </button>
        ))}
      </div>

      <div className={styles.flowTower}>Mandates held</div>
      <div className={styles.tlMandates}>
        {actorGrants.length === 0 && <div className={styles.tlEmpty}>No mandate on record for this principal.</div>}
        {actorGrants.map((g) => (
          <div key={g.id} className={styles.tlMandate}>
            <span className={styles.tlMandAction}>{g.actionType}</span>
            <span className={styles.tlMandScope}>{g.orgPath}</span>
            <span className={styles.tlMandLimit}>{money.format(g.approvalLimit)}</span>
            <span className={styles.tlMandWindow}>
              {day(g.validFrom)} → {day(g.validTo)}
            </span>
            <span
              className={`${styles.tlBadge} ${g.active ? styles.tlBadgeActive : styles.tlBadgeRevoked}`}
            >
              {g.active ? "ACTIVE" : g.revokedAt ? "REVOKED" : "INACTIVE"}
            </span>
          </div>
        ))}
      </div>

      <div className={styles.flowTower} style={{ marginTop: "30px" }}>
        Decision history
      </div>
      <div className={styles.tlSpine}>
        {events.length === 0 && <div className={styles.tlEmpty}>No actions recorded for this principal yet.</div>}
        {events.map((ev, i) => {
          if (ev.kind === "revoke") {
            revoked = true;
            return (
              <div key={`rev-${i}`} className={styles.tlRevoke}>
                <span className={styles.tlRevokeMark}>⊘</span>
                MANDATE REVOKED · {clock(ev.g.revokedAt!)} · {ev.g.actionType} authority withdrawn
              </div>
            );
          }
          const d = ev.d;
          const flipped = revoked && d.verdict === "deny";
          return (
            <div key={d.requestId} className={styles.tlNode}>
              <span className={styles.tlTime}>{clock(d.createdAt)}</span>
              <span className={`${styles.tlDot} ${styles[d.verdict] ?? ""}`} />
              <div className={styles.tlBody}>
                <span className={styles.tlAction}>{d.actionType}</span>
                <span className={styles.tlMeta}>
                  {d.resource} · {money.format(d.amount)}
                </span>
                {flipped && <span className={styles.tlFlip}>flipped by revoke</span>}
              </div>
              <span className={`${styles.tlVerdict} ${styles[d.verdict] ?? ""}`}>{d.verdict.toUpperCase()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

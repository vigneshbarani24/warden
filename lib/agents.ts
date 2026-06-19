/**
 * Deterministic agent-fleet simulator. Each "agent" posts realistic proposed
 * actions across the finance towers through the PDP, so the Activity stream and
 * feed behave like a live control plane over a fleet in motion. The engine —
 * not the simulator — decides every verdict.
 */
import { randomUUID } from "node:crypto";
import { decide } from "./pdp";

interface Template {
  actor: string;
  agent: string;
  actionType: string;
  orgPath: string;
  resourcePrefix: string;
  min: number;
  max: number;
}

// Actors/limits mirror the seed: amounts sometimes exceed limits (-> escalate);
// the last template has no grant (-> deny, an agent self-escalation blocked).
const TEMPLATES: Template[] = [
  { actor: "priya.nair", agent: "AP Agent", actionType: "approve_payment", orgPath: "/root/finance/p2p/", resourcePrefix: "INV", min: 100_000, max: 8_000_000 },
  { actor: "sofia.reyes", agent: "O2C Agent", actionType: "approve_discount", orgPath: "/root/finance/o2c/", resourcePrefix: "ORD", min: 10_000, max: 700_000 },
  { actor: "aisha.khan", agent: "T&E Agent", actionType: "approve_expense", orgPath: "/root/finance/te/", resourcePrefix: "EXP", min: 1_000, max: 80_000 },
  { actor: "leo.tanaka", agent: "MDM Agent", actionType: "update_master_data", orgPath: "/root/finance/mdm/", resourcePrefix: "MD", min: 0, max: 0 },
  { actor: "ap-agent", agent: "AP Agent", actionType: "grant_privilege", orgPath: "/root/finance/p2p/", resourcePrefix: "ROLE", min: 0, max: 0 },
];

function roundedAmount(min: number, max: number): number {
  if (max <= min) return min;
  return Math.round((min + Math.random() * (max - min)) / 1000) * 1000;
}

export async function runFleet(count = 8): Promise<{ count: number }> {
  for (let i = 0; i < count; i++) {
    const t = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)]!;
    const resource = `${t.resourcePrefix}-${Math.floor(10000 + Math.random() * 89999)}`;
    await decide({
      requestId: randomUUID(),
      actor: t.actor,
      actionType: t.actionType,
      resource,
      amount: roundedAmount(t.min, t.max),
      orgPath: t.orgPath,
      context: { agent: t.agent },
    });
  }
  return { count };
}

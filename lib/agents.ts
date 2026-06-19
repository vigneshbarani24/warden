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
  { actor: "maya.chen", agent: "Crude Desk Agent", actionType: "capture_trade", orgPath: "/global/trading/crude/", resourcePrefix: "DEAL-CR", min: 500_000, max: 8_000_000 },
  { actor: "raj.patel", agent: "Products Desk Agent", actionType: "capture_trade", orgPath: "/global/trading/products/", resourcePrefix: "DEAL-PR", min: 200_000, max: 4_000_000 },
  { actor: "liam.obrien", agent: "Gas Desk Agent", actionType: "capture_trade", orgPath: "/global/trading/gas/", resourcePrefix: "DEAL-NG", min: 200_000, max: 5_000_000 },
  { actor: "sam.rivera", agent: "Settlement Agent", actionType: "approve_settlement", orgPath: "/global/trading/crude/", resourcePrefix: "DEAL-CR", min: 500_000, max: 12_000_000 },
  { actor: "gas-desk-agent", agent: "Gas Desk Agent", actionType: "capture_trade", orgPath: "/global/trading/gas/", resourcePrefix: "DEAL-NG", min: 0, max: 0 },
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

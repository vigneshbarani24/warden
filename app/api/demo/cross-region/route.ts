/**
 * The cross-region money-shot, as a single HTTP beat.
 *
 * Region A and region B are the two endpoints of ONE multi-Region Aurora DSQL
 * cluster (one logical, strongly-consistent database). The sequence proves the
 * property no async-replica topology can: a revoke committed in region A is seen
 * by the very next decision in region B, with no stale allow.
 *
 *   1. re-arm the London gas mandate on A (so the demo is re-runnable)
 *   2. $2M capture under the active mandate, evaluated in A  -> allow (sealed)
 *   3. revoke the mandate in A
 *   4. the identical action, evaluated in B, immediately     -> deny (no authority)
 */
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { decide, revokeGrant, reactivateGrant } from "@/lib/pdp";
import { logAndMessage } from "@/lib/http";
import type { DecisionInput } from "@/lib/types";

export const runtime = "nodejs";

const GAS_MANDATE = "11111111-1111-4111-8111-111111111111";
const REGION_A_LABEL = process.env.DSQL_REGION?.trim() ?? process.env.AWS_REGION?.trim() ?? "region-A";
const REGION_B_LABEL = process.env.DSQL_REGION_B?.trim() ?? "region-B";

export async function POST() {
  if (!process.env.DSQL_ENDPOINT_B?.trim()) {
    return NextResponse.json(
      { error: "region B is not configured — set DSQL_ENDPOINT_B and DSQL_REGION_B to the peer endpoint of a multi-Region DSQL cluster" },
      { status: 503 },
    );
  }

  // Identical proposed action for both regions; only the requestId (idempotency key) differs.
  const action: Omit<DecisionInput, "requestId"> = {
    actor: "liam.obrien",
    actionType: "capture_trade",
    resource: `DEAL-NG-XR-${randomUUID().slice(0, 8)}`,
    amount: 2_000_000,
    orgPath: "/global/trading/gas/",
    context: { agent: "Gas Desk Agent", demo: "cross-region" },
  };

  try {
    // 1. Re-arm the mandate on region A so the beat re-runs cleanly.
    await reactivateGrant(GAS_MANDATE, "A");

    // 2. $2M capture under the active mandate, evaluated in region A -> allow.
    const a = await decide({ requestId: `xr-a-${randomUUID()}`, ...action }, "A");

    // 3. Revoke the mandate in region A.
    const revoke = await revokeGrant(GAS_MANDATE, "A");
    const revokedAtMs = Date.now();

    // 4. The identical action, evaluated in region B, immediately after -> deny.
    const b = await decide({ requestId: `xr-b-${randomUUID()}`, ...action }, "B");
    const denyObservedMs = Date.now();

    return NextResponse.json({
      consistent: a.verdict === "allow" && b.verdict === "deny",
      crossRegionGapMs: denyObservedMs - revokedAtMs,
      action: { actor: action.actor, actionType: action.actionType, resource: action.resource, amount: action.amount },
      regionA: {
        region: REGION_A_LABEL,
        endpoint: process.env.DSQL_ENDPOINT?.trim(),
        verdict: a.verdict,
        reason: a.reason,
        requestId: a.requestId,
      },
      revoke: { grantId: revoke.id, revokedAt: revoke.revokedAt },
      regionB: {
        region: REGION_B_LABEL,
        endpoint: process.env.DSQL_ENDPOINT_B?.trim(),
        verdict: b.verdict,
        reason: b.reason,
        requestId: b.requestId,
        firedRuleIds: b.firedRuleIds,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: logAndMessage("demo/cross-region", e) }, { status: 500 });
  }
}

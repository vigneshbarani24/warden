/**
 * Exercise the cross-region revoke beat against the real multi-region cluster:
 * re-arm + allow on region A, revoke on A, deny on region B. Same code path the
 * /api/demo/cross-region route uses.
 *
 *   npx tsx scripts/xr-test.ts
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { decide, revokeGrant, reactivateGrant } from "../lib/pdp";
import type { DecisionInput } from "../lib/types";

const GAS_MANDATE = "11111111-1111-4111-8111-111111111111";

async function main(): Promise<void> {
  const action: Omit<DecisionInput, "requestId"> = {
    actor: "liam.obrien",
    actionType: "capture_trade",
    resource: `DEAL-NG-XR-${randomUUID().slice(0, 8)}`,
    amount: 2_000_000,
    orgPath: "/global/trading/gas/",
    context: { agent: "Gas Desk Agent", demo: "cross-region" },
  };

  console.log(`A endpoint: ${process.env.DSQL_ENDPOINT}`);
  console.log(`B endpoint: ${process.env.DSQL_ENDPOINT_B}`);

  await reactivateGrant(GAS_MANDATE, "A");
  const a = await decide({ requestId: `xr-a-${randomUUID()}`, ...action }, "A");
  console.log(`\nA (${process.env.DSQL_REGION}) -> ${a.verdict.toUpperCase()}  "${a.reason}"`);

  const rev = await revokeGrant(GAS_MANDATE, "A");
  const revAt = Date.now();
  console.log(`revoke on A -> ${rev.revokedAt}`);

  const b = await decide({ requestId: `xr-b-${randomUUID()}`, ...action }, "B");
  const gap = Date.now() - revAt;
  console.log(`B (${process.env.DSQL_REGION_B}) -> ${b.verdict.toUpperCase()}  "${b.reason}"  (+${gap}ms after revoke)`);

  const ok = a.verdict === "allow" && b.verdict === "deny";
  console.log(`\nCROSS-REGION CONSISTENCY: ${ok ? "PASS" : "FAIL"} (allow on A, deny on B after revoke)`);
  process.exit(ok ? 0 : 1);
}

main().catch((e: unknown) => {
  console.error("xr-test failed:", e);
  process.exit(1);
});

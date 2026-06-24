/**
 * Live end-to-end proof against the real DSQL cluster (Global Trading world):
 *   1) clean capture -> allow      2) revoke mandate    3) same capture -> deny
 *   4) over-limit -> escalate      5) idempotent replay 6) tamper -> chain break -> restore
 *
 *   npx tsx scripts/demo-verify.ts
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { decide, revokeGrant, verifyLedger, getLedger } from "../lib/pdp";
import { getPool } from "../lib/db";

const GAS_MANDATE = "11111111-1111-4111-8111-111111111111"; // liam.obrien capture_trade gas, $3M

async function reactivate(): Promise<void> {
  const pool = await getPool();
  await pool.query("UPDATE authority_grants SET revoked_at = NULL WHERE id = $1", [GAS_MANDATE]);
}

async function main(): Promise<void> {
  await reactivate();
  const base = {
    actor: "liam.obrien",
    actionType: "capture_trade",
    resource: "DEAL-NG-VERIFY",
    orgPath: "/global/trading/gas/",
  };

  const r1 = await decide({ requestId: randomUUID(), ...base, amount: 2_000_000 });
  console.log("1) clean $2M capture       ->", r1.verdict.toUpperCase(), "|", r1.reason);

  const rev = await revokeGrant(GAS_MANDATE);
  console.log("2) revoke gas mandate      -> revoked at", rev.revokedAt);

  const r2 = await decide({ requestId: randomUUID(), ...base, amount: 2_000_000 });
  console.log("3) same $2M after revoke   ->", r2.verdict.toUpperCase(), "|", r2.reason);

  await reactivate();
  const r3 = await decide({ requestId: randomUUID(), ...base, amount: 5_000_000 });
  console.log("4) $5M over $3M mandate     ->", r3.verdict.toUpperCase(), "|", r3.reason);

  const rid = randomUUID();
  const a = await decide({ requestId: rid, ...base, amount: 1_000 });
  const b = await decide({ requestId: rid, ...base, amount: 1_000 });
  console.log("5) idempotent replay       ->", a.verdict.toUpperCase(), "/", b.verdict.toUpperCase(), "| replay:", b.idempotentReplay);

  const pool = await getPool();
  const tip = (await pool.query("SELECT seq, payload FROM ledger ORDER BY seq DESC LIMIT 1")).rows[0];
  if (!tip) throw new Error("no ledger rows");
  const originalPayload = JSON.stringify(tip.payload);
  await pool.query("UPDATE ledger SET payload = $1 WHERE seq = $2", [
    JSON.stringify({ ...tip.payload, amount: "1" }),
    tip.seq,
  ]);
  const broken = await verifyLedger();
  await pool.query("UPDATE ledger SET payload = $1 WHERE seq = $2", [originalPayload, tip.seq]);
  const restored = await verifyLedger();
  const led = await getLedger();
  console.log(
    "6) ledger " + led.length + " rows; tamper seq " + Number(tip.seq) + " ->",
    broken.ok ? "NO BREAK (!)" : "BREAK at " + broken.breakAtSeq,
    "| after restore:",
    restored.ok ? "INTACT" : "BROKEN",
  );

  const pass =
    r1.verdict === "allow" &&
    r2.verdict === "deny" &&
    r3.verdict === "escalate" &&
    b.idempotentReplay === true &&
    !broken.ok &&
    broken.breakAtSeq === Number(tip.seq) &&
    restored.ok;
  console.log(pass ? "\n[PASS] all live checks passed" : "\n[FAIL] checks failed");
  await pool.end();
  if (!pass) process.exit(1);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});

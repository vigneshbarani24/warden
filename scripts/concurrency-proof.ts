/**
 * Live proof that the FOR UPDATE lock closes DSQL's write-skew gap.
 *
 * Two overlapping transactions on the real cluster:
 *   A (the decision) locks the covering grant with SELECT ... FOR UPDATE, then
 *   B (a concurrent revoke) updates and commits that same grant, then
 *   A writes its decision and commits -> expect 40001 (OC000), forcing withRetry.
 *
 * Without the FOR UPDATE in A, A's commit would NOT conflict (plain reads don't
 * participate in OCC), and a stale "allow" would slip through.
 *
 *   npx tsx scripts/concurrency-proof.ts
 */
import "dotenv/config";
import { getPool } from "../lib/db";

const GRANT = "11111111-1111-4111-8111-111111111111";

async function main(): Promise<void> {
  const pool = await getPool();
  await pool.query("UPDATE authority_grants SET revoked_at = NULL WHERE id = $1", [GRANT]);

  const a = await pool.connect();
  const b = await pool.connect();
  let conflicted = false;
  try {
    await a.query("BEGIN");
    // A models the decision transaction: lock the covering grant (engine.lockGrants).
    await a.query("SELECT id FROM authority_grants WHERE id = $1 FOR UPDATE", [GRANT]);

    // B is a concurrent revoke that commits while A is mid-decision.
    await b.query("BEGIN");
    await b.query("UPDATE authority_grants SET revoked_at = now() WHERE id = $1", [GRANT]);
    await b.query("COMMIT");

    // A now writes its (would-be stale "allow") decision and tries to commit.
    try {
      await a.query(
        `INSERT INTO decisions (id, request_id, actor, action_type, resource, amount, verdict, reason, evaluated_context)
         VALUES (gen_random_uuid(), $1, 'liam.obrien', 'capture_trade', 'DEAL-NG-CONC', '2000000', 'allow', 'would-be stale allow', '{}')`,
        ["conc-" + Date.now().toString()],
      );
      await a.query("COMMIT");
    } catch (e) {
      conflicted = (e as { code?: string }).code === "40001";
      await a.query("ROLLBACK").catch(() => undefined);
    }
  } finally {
    a.release();
    b.release();
  }

  // Re-arm the mandate and clean up any decision this proof committed (on the non-conflict path),
  // so it never pollutes the live feed.
  await pool.query("UPDATE authority_grants SET revoked_at = NULL WHERE id = $1", [GRANT]);
  await pool.query("DELETE FROM decisions WHERE request_id LIKE 'conc-%'");
  await pool.end();

  console.log("Concurrent revoke during a FOR UPDATE-locked decision -> A conflicted (40001):", conflicted);
  console.log(
    conflicted
      ? "[PASS] OCC aborted the decision; withRetry re-evaluates against the revoked grant. No stale allow."
      : "[FAIL] no conflict detected -- a stale allow could slip through.",
  );
  if (!conflicted) process.exit(1);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});

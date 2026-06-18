/**
 * Walk the ledger and verify the hash chain.
 *
 *   npm run db:verify
 *
 * Exit code 1 (and the first broken seq) if any row fails verification.
 */
import "dotenv/config";
import { getPool } from "../lib/db";
import { verifyChain, type LedgerRow } from "../lib/ledger";

async function main(): Promise<void> {
  const pool = await getPool();
  const { rows } = await pool.query(
    "SELECT seq, prev_hash, payload, hash FROM ledger ORDER BY seq ASC",
  );
  const ledger: LedgerRow[] = rows.map((r) => ({
    seq: Number(r.seq),
    prevHash: String(r.prev_hash),
    payload: r.payload as object,
    hash: String(r.hash),
  }));

  const result = verifyChain(ledger);
  if (result.ok) {
    console.log(`Chain intact through ${ledger.length} row(s).`);
  } else {
    console.error(`Break detected at seq ${result.breakAtSeq}.`);
    process.exitCode = 1;
  }
  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});

/**
 * Local Phase 0 gate: prove we can reach DSQL and run a query.
 *
 *   npm run health
 *
 * Requires DSQL_ENDPOINT + AWS_REGION in .env and AWS credentials in the default
 * provider chain (~/.aws/credentials).
 */
import "dotenv/config";
import { getPool } from "../lib/db";

async function main(): Promise<void> {
  const pool = await getPool();
  const { rows } = await pool.query<{ ok: number; ts: string }>("SELECT 1 AS ok, now()::text AS ts");
  console.log("DSQL reachable:", rows[0]);
  await pool.end();
}

main().catch((e: unknown) => {
  console.error("DSQL health check failed:", e);
  process.exit(1);
});

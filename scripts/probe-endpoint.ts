/**
 * Probe a specific Aurora DSQL endpoint: connect, SELECT 1, and report row
 * counts for the core tables (so we know if a cluster is seeded or empty).
 *
 *   npx tsx scripts/probe-endpoint.ts <endpoint-host> <region>
 */
import "dotenv/config";
import { Pool } from "pg";
import { DsqlSigner } from "@aws-sdk/dsql-signer";

async function main(): Promise<void> {
  const host = process.argv[2];
  const region = process.argv[3];
  if (!host || !region) {
    console.error("usage: probe-endpoint.ts <endpoint-host> <region>");
    process.exit(1);
  }
  const signer = new DsqlSigner({ hostname: host, region });
  const pool = new Pool({
    host,
    port: 5432,
    database: "postgres",
    user: "admin",
    ssl: { rejectUnauthorized: true, servername: host },
    password: async () => signer.getDbConnectAdminAuthToken(),
    max: 1,
  });
  try {
    const ping = await pool.query("SELECT 1 AS ok");
    console.log(`${host} (${region}) -> connect OK, SELECT 1 = ${ping.rows[0]?.ok}`);
    for (const t of ["org_units", "authority_grants", "policy_rules", "decisions", "ledger"]) {
      try {
        const r = await pool.query(`SELECT count(*)::int AS n FROM ${t}`);
        console.log(`  ${t}: ${r.rows[0]?.n}`);
      } catch (e) {
        console.log(`  ${t}: (missing) ${(e as Error).message.split("\n")[0]}`);
      }
    }
  } catch (e) {
    console.log(`${host} (${region}) -> ERROR: ${(e as Error).message.split("\n")[0]}`);
  } finally {
    await pool.end().catch(() => undefined);
  }
}

main().catch((e: unknown) => {
  console.error("probe failed:", e);
  process.exit(1);
});

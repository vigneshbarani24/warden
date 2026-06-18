/**
 * Run ordered SQL migrations against DSQL.
 *
 *   npm run db:migrate
 *
 * DSQL runs one DDL statement per transaction, so statements are issued
 * individually (autocommit) rather than wrapped in a single BEGIN/COMMIT.
 * CREATE INDEX ASYNC returns immediately; afterwards we poll pg_index.indisvalid
 * until every index is valid.
 */
import "dotenv/config";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getPool } from "../lib/db";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "..", "db", "migrations");

function statements(sql: string): string[] {
  const stripped = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  return stripped
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function runStatement(stmt: string): Promise<void> {
  const pool = await getPool();
  for (let i = 0; i < 5; i++) {
    try {
      await pool.query(stmt);
      return;
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "40001" && i < 4) {
        await sleep(2 ** i * 50);
        continue;
      }
      throw err;
    }
  }
}

async function waitForIndexes(): Promise<void> {
  const pool = await getPool();
  for (let i = 0; i < 90; i++) {
    const { rows } = await pool.query<{ invalid: string }>(
      "SELECT count(*)::text AS invalid FROM pg_index WHERE indisvalid = false",
    );
    if (rows[0] && Number(rows[0].invalid) === 0) return;
    await sleep(2_000);
  }
  throw new Error("Timed out waiting for async indexes to become valid");
}

async function main(): Promise<void> {
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    console.log(`\n== ${file} ==`);
    for (const stmt of statements(readFileSync(join(migrationsDir, file), "utf8"))) {
      console.log(`  -> ${stmt.replace(/\s+/g, " ").slice(0, 72)}`);
      await runStatement(stmt);
    }
  }
  console.log("\nWaiting for async indexes to validate...");
  await waitForIndexes();
  const pool = await getPool();
  await pool.end();
  console.log("Migrations complete.");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((e: unknown) => {
  console.error("\nMigration failed:", e);
  process.exit(1);
});

/**
 * Aurora DSQL connection for Vercel Fluid Compute and local dev/scripts.
 *
 * - On Vercel (AWS_ROLE_ARN set): credentials come from OIDC federation, no stored keys.
 * - Locally (scripts): credentials come from the default AWS provider chain
 *   (~/.aws/credentials or AWS_* env vars).
 *
 * A fresh IAM auth token is minted per physical connection (tokens are short-lived).
 * The pool is created once at module scope so Fluid reuses it across invocations.
 */
import { Pool, type PoolClient } from "pg";
import { DsqlSigner } from "@aws-sdk/dsql-signer";

let pool: Pool | null = null;

async function makeSigner(): Promise<DsqlSigner> {
  const hostname = requireEnv("DSQL_ENDPOINT");
  const region = requireEnv("AWS_REGION");
  const roleArn = process.env.AWS_ROLE_ARN;
  if (roleArn) {
    // Vercel: federate via OIDC; no long-lived keys.
    const { awsCredentialsProvider } = await import("@vercel/oidc-aws-credentials-provider");
    return new DsqlSigner({ hostname, region, credentials: awsCredentialsProvider({ roleArn }) });
  }
  // Local: default AWS provider chain.
  return new DsqlSigner({ hostname, region });
}

export async function getPool(): Promise<Pool> {
  if (pool) return pool;
  const signer = await makeSigner();
  const p = new Pool({
    host: requireEnv("DSQL_ENDPOINT"),
    port: 5432,
    database: "postgres",
    user: "admin",
    ssl: { rejectUnauthorized: true },
    // node-postgres calls this per new connection -> always a fresh, valid token.
    password: async () => signer.getDbConnectAdminAuthToken(),
    // Recycle before DSQL's 60-minute hard connection cap.
    maxLifetimeSeconds: 50 * 60,
    idleTimeoutMillis: 5_000,
  });
  // Fluid-aware idle release on Vercel; harmless/no-op locally.
  try {
    const { attachDatabasePool } = await import("@vercel/functions");
    attachDatabasePool(p);
  } catch {
    // @vercel/functions only meaningful on Vercel.
  }
  pool = p;
  return pool;
}

const RETRYABLE = new Set(["40001"]); // OCC conflict (OC000) / stale schema (OC001)

/**
 * Wrap every write transaction. In DSQL, conflicts surface at COMMIT, not on the
 * statement; retry idempotently with backoff.
 */
export async function withRetry<T>(
  fn: (client: PoolClient) => Promise<T>,
  attempts = 5,
): Promise<T> {
  const p = await getPool();
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    const client = await p.connect();
    try {
      await client.query("BEGIN");
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK").catch(() => undefined);
      lastErr = err;
      const code = (err as { code?: string }).code;
      if (code && RETRYABLE.has(code) && i < attempts - 1) {
        await sleep(2 ** i * 25 + Math.random() * 25);
        continue;
      }
      throw err;
    } finally {
      client.release();
    }
  }
  throw lastErr;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

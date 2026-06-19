/**
 * Aurora DSQL connection for Vercel Fluid Compute and local dev/scripts.
 *
 * - On Vercel (AWS_ROLE_ARN set): credentials come from OIDC federation, no stored keys.
 * - On Vercel (DSQL_AWS_* set): explicit static keys. NOTE: the function runtime is
 *   AWS Lambda, which RESERVES AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY/AWS_REGION — values
 *   set under those names never reach the code. Use the non-reserved DSQL_* names instead.
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
  // DSQL_REGION first: AWS_REGION is Lambda-reserved and pinned to the function's region.
  const region = process.env.DSQL_REGION?.trim() ?? requireEnv("AWS_REGION");
  const roleArn = process.env.AWS_ROLE_ARN;
  if (roleArn) {
    // Vercel: federate via OIDC; no long-lived keys.
    const { awsCredentialsProvider } = await import("@vercel/oidc-aws-credentials-provider");
    return new DsqlSigner({ hostname, region, credentials: awsCredentialsProvider({ roleArn }) });
  }
  // Vercel with static keys: explicit, via non-reserved names (AWS_* can't be passed on Lambda).
  const accessKeyId = process.env.DSQL_AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.DSQL_AWS_SECRET_ACCESS_KEY?.trim();
  if (accessKeyId && secretAccessKey) {
    return new DsqlSigner({ hostname, region, credentials: { accessKeyId, secretAccessKey } });
  }
  // Local: default AWS provider chain (~/.aws/credentials or AWS_* env).
  return new DsqlSigner({ hostname, region });
}

export async function getPool(): Promise<Pool> {
  if (pool) return pool;
  const signer = await makeSigner();
  const host = requireEnv("DSQL_ENDPOINT");
  const p = new Pool({
    host,
    port: 5432,
    database: "postgres",
    user: "admin",
    // servername pins TLS SNI to the cluster host; DSQL rejects connections with mismatched SNI.
    ssl: { rejectUnauthorized: true, servername: host },
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
  // Trim: values piped into the platform env can carry a trailing newline that breaks TLS SNI.
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

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

/**
 * Region key. "A" is the default endpoint (DSQL_ENDPOINT / DSQL_REGION); "B" is the
 * peer endpoint of the same multi-Region cluster (DSQL_ENDPOINT_B / DSQL_REGION_B),
 * used only by the cross-region revoke demo. Both endpoints are one logical,
 * strongly-consistent database, so a commit on A is visible to the next read on B.
 */
export type DsqlRegion = "A" | "B";

// One pool per region key, created lazily at module scope so Fluid reuses them.
const pools = new Map<DsqlRegion, Pool>();

/** Resolve the endpoint host + AWS region for a region key. */
function regionConfig(region: DsqlRegion): { host: string; awsRegion: string } {
  if (region === "B") {
    return { host: requireEnv("DSQL_ENDPOINT_B"), awsRegion: requireEnv("DSQL_REGION_B") };
  }
  // DSQL_REGION first: AWS_REGION is Lambda-reserved and pinned to the function's region.
  const awsRegion = process.env.DSQL_REGION?.trim() ?? requireEnv("AWS_REGION");
  return { host: requireEnv("DSQL_ENDPOINT"), awsRegion };
}

async function makeSigner(region: DsqlRegion): Promise<DsqlSigner> {
  const { host: hostname, awsRegion } = regionConfig(region);
  const roleArn = process.env.AWS_ROLE_ARN;
  if (roleArn) {
    // Vercel: federate via OIDC; no long-lived keys.
    const { awsCredentialsProvider } = await import("@vercel/oidc-aws-credentials-provider");
    return new DsqlSigner({ hostname, region: awsRegion, credentials: awsCredentialsProvider({ roleArn }) });
  }
  // Vercel with static keys: explicit, via non-reserved names (AWS_* can't be passed on Lambda).
  const accessKeyId = process.env.DSQL_AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.DSQL_AWS_SECRET_ACCESS_KEY?.trim();
  if (accessKeyId && secretAccessKey) {
    return new DsqlSigner({ hostname, region: awsRegion, credentials: { accessKeyId, secretAccessKey } });
  }
  // Local: default AWS provider chain (~/.aws/credentials or AWS_* env).
  return new DsqlSigner({ hostname, region: awsRegion });
}

export async function getPool(region: DsqlRegion = "A"): Promise<Pool> {
  const existing = pools.get(region);
  if (existing) return existing;
  const { host } = regionConfig(region);
  const signer = await makeSigner(region);
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
  pools.set(region, p);
  return p;
}

// Two retryable classes. 40001 = OCC conflict (OC000 write-write / OC001 stale schema).
// The connection-reset / token-expiry class is NOT 40001: after an idle gap DSQL can tear
// down the checked-out connection, or the IAM token expired, and the first use throws a
// connection-terminated/auth error. Retrying the *idempotent* transaction (or a read) with
// a fresh client reconnects — a new token is minted per connection — instead of surfacing a
// raw 500 / ok:false on the first request after idle, which is the exact demo flake.
const OCC_CONFLICT = "40001";
const CONN_RESET_CODES = new Set(["57P01", "08006", "08003", "08001", "ECONNRESET", "EPIPE", "ETIMEDOUT"]);

function isRetryable(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  const code = e?.code;
  if (code === OCC_CONFLICT) return true;
  if (code && CONN_RESET_CODES.has(code)) return true;
  const msg = (e?.message ?? "").toLowerCase();
  return (
    msg.includes("connection terminated") ||
    msg.includes("connection reset") ||
    msg.includes("server closed the connection") ||
    msg.includes("timeout expired") ||
    msg.includes("econnreset")
  );
}

/**
 * Wrap every write transaction. In DSQL, conflicts surface at COMMIT, not on the
 * statement; retry idempotently with backoff. Also retries the connection-reset /
 * token-expiry class with a fresh client — safe because every writer is idempotent
 * (decide/revoke/reset use ON CONFLICT DO NOTHING or are naturally idempotent).
 */
export async function withRetry<T>(
  fn: (client: PoolClient) => Promise<T>,
  attempts = 5,
  region: DsqlRegion = "A",
): Promise<T> {
  const p = await getPool(region);
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
      if (isRetryable(err) && i < attempts - 1) {
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

/**
 * Run a read query with a small reconnect retry. Reads use no transaction, but a single
 * pool.query after an idle gap can hit a torn-down connection; retrying acquires a fresh
 * client (and a fresh IAM token) rather than returning a one-off 500 / ok:false. The pool
 * evicts the errored client, so the next attempt gets a healthy connection.
 */
export async function readWithRetry<T>(
  fn: (pool: Pool) => Promise<T>,
  region: DsqlRegion = "A",
  attempts = 3,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const p = await getPool(region);
      return await fn(p);
    } catch (err) {
      lastErr = err;
      if (isRetryable(err) && i < attempts - 1) {
        await sleep(2 ** i * 25 + Math.random() * 25);
        continue;
      }
      throw err;
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

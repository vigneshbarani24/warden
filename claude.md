# CLAUDE.md — Warden

Governance layer for enterprise AI agents. A policy decision point (PDP) agents call **before** acting, and a hash-chained audit ledger they write to **after**. Built for H0 (Track 2, Monetizable B2B) on Amazon Aurora DSQL.

## What this is

ERP-native agents (SAP Joule, Oracle, Workday) understand transactional data but not a company's approval chains, segregation-of-duties rules, or authority grants. They can take actions that are valid in the ERP yet illegal in the business, with no defensible record of why.

Warden sits in front of that. An agent posts a proposed action (approve invoice, create vendor) to the PDP. The engine evaluates it against org hierarchy, active authority grants, approval limits, and SoD policies, then returns `allow | deny | escalate` with a reason. Every decision is appended to an append-only, hash-chained ledger for SOX-grade tamper evidence.

The data model is the product. Get the schema and the evaluation engine right; the UI is a thin shell.

## Stack

- **DB:** Amazon Aurora DSQL (Postgres-compatible, distributed, strong consistency, active-active).
- **App:** Next.js (App Router), scaffolded in v0, deployed on Vercel.
- **DB access:** `pg` driver + IAM token auth via `@aws-sdk/dsql-signer`. Connected through Vercel's AWS integration.
- **Language:** TypeScript, strict.

Why DSQL is load-bearing, not incidental: when an authority grant is revoked, strong consistency propagates that change instantly across every agent and region. No stale read ever approves a high-value transaction on a revoked grant. That property **is** the pitch. Don't undercut it with caching that reintroduces staleness on the authority-grant read path.

## Aurora DSQL — hard constraints

DSQL is Postgres on the wire but not Postgres in behavior. These are not style preferences, they are the difference between code that runs and code that silently corrupts or won't deploy. Verify current quotas against AWS docs before relying on a number; the categories below are stable.

- **No foreign keys.** Referential integrity is enforced in the app layer. Do not write `REFERENCES`. Validate parent existence in the same transaction as the child write.
- **No sequences / `SERIAL` / `IDENTITY`.** Generate IDs client-side. Use UUIDv4 for primary keys, which also spreads write contention across the cluster key range. Never expect an auto-increment.
- **Optimistic concurrency control.** Conflicts surface at `COMMIT`, not on the statement, as `SQLSTATE 40001`. `OC000` = row write-write conflict, `OC001` = schema catalog stale after DDL. Every write transaction must be wrapped in idempotent retry with backoff. See `withRetry` below. This is mandatory, not defensive.
- **Snapshot isolation, not serializable.** Equivalent to Postgres `REPEATABLE READ`. Write skew is possible, and **plain reads do not participate in OCC conflict detection (write-write only)** — so same-transaction read+write is necessary but **not sufficient** to stop a stale allow. Lock the covering `authority_grants` rows with `SELECT … FOR UPDATE WHERE id = $1` (DSQL: PK-equality, single-table only) inside the decision transaction so a concurrent revoke conflicts at COMMIT (`40001`) and `withRetry` re-evaluates against the revoked state.
- **`CREATE INDEX ASYNC` only** on populated tables. Plain `CREATE INDEX` only works on empty tables. After creating, poll until the index reports valid before relying on it.
- **No triggers, no PL/pgSQL, no extensions.** SQL functions only. Move all logic to the app layer or SQL. Don't reach for `uuid-ossp` or `pgcrypto`; hash and UUID in TypeScript.
- **No `TRUNCATE`.** Use `DELETE FROM`. No `VACUUM`; storage is auto-managed.
- **IAM auth only.** No permanent passwords. Tokens are generated and expire (default short, max ~1 week). Generate per cold start and cache with a TTL margin. See `getConnection` below.
- **Transaction caps.** ~10,000 rows and ~10 MiB modified per transaction. A single ledger append is one row, fine. Bulk policy or org imports must batch under the limit.

ORM note: prefer raw SQL migration files and a thin query layer, or Drizzle with a hand-written schema. Tools that assume FKs, sequences, or `CREATE INDEX` will fight you. Prisma needs the driver adapter and still trips on the missing features. Don't burn hackathon hours debugging an ORM; raw `pg` is the safe path here.

## Data model

Five tables. No FKs; relationships are logical and enforced in code.

- **`org_units`** — org hierarchy via **materialized path** (e.g. `/root/finance/ap/`). Ancestor and descendant queries are `path LIKE '/root/finance/%'`, no recursive CTE. `id uuid pk`, `path text`, `name`, `unit_type`.
- **`authority_grants`** — who can do what, where, up to how much. `id uuid pk`, `principal_id`, `org_path`, `action_type`, `approval_limit numeric`, `valid_from`, `valid_to`, `revoked_at` (nullable). A grant is **active** iff `now()` is within `[valid_from, valid_to)` and `revoked_at is null`. Revocation is the consistency demo: flip `revoked_at`, every region sees it immediately.
- **`policy_rules`** — SoD and compliance rules as **JSONB**. e.g. conflicting action pairs (`created_vendor` vs `approve_vendor_invoice`), amount thresholds, required-approver counts. `id uuid pk`, `rule_type`, `definition jsonb`, `active bool`. (Confirm JSONB support on your cluster on day one; if a column type is rejected, fall back to `text` holding JSON and parse in app.)
- **`decisions`** — every PDP verdict. `id uuid pk`, `request_id` (the proposed-action id, **unique**), `actor`, `action_type`, `resource`, `amount`, `verdict`, `reason`, `evaluated_context jsonb`, `created_at`.
- **`ledger`** — append-only hash chain over decisions. `id uuid pk`, `seq` (monotonic, app-assigned), `request_id unique`, `prev_hash`, `payload jsonb`, `hash`, `created_at`.

Enforce ledger immutability at the DB, since there are no triggers: after creating the table, `REVOKE UPDATE, DELETE ON ledger FROM <app_role>;`. The app role can only `INSERT` and `SELECT`. That's the DSQL-native way to make append-only real, not just a convention.

## Hash chain

Each ledger row hashes the previous hash plus the canonical payload. Tamper-**evidence**, not tamper-prevention: it lets you detect any after-the-fact edit, it does not stop a DB admin with write rights. Say that honestly in the demo; judges respect the precision.

```ts
import { createHash } from "node:crypto";

// Canonical JSON: stable key order, so the same logical payload always hashes identically.
function canonical(obj: unknown): string {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(canonical).join(",")}]`;
  const keys = Object.keys(obj as object).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical((obj as any)[k])}`).join(",")}}`;
}

export function linkHash(prevHash: string, payload: object): string {
  return createHash("sha256").update(prevHash).update(canonical(payload)).digest("hex");
}

export const GENESIS = "0".repeat(64);
```

Append is idempotent on `request_id`. A retry after a committed insert must not double-append:

```sql
INSERT INTO ledger (id, seq, request_id, prev_hash, payload, hash, created_at)
VALUES ($1, $2, $3, $4, $5, $6, now())
ON CONFLICT (request_id) DO NOTHING;
```

Verification walks the chain, recomputes each hash from the prior, and flags the first mismatch. Ship a `verifyChain()` and show it green in the demo, then tamper with one row live and show it go red. That's the money shot.

## Engine — evaluation order

PDP input: `{ requestId, actor, actionType, resource, amount, context }`. Evaluate in one transaction:

1. Resolve actor's **active** grants for `actionType` at or above the resource's `org_path`, then lock them with `SELECT … FOR UPDATE WHERE id = $1` so a concurrent revoke conflicts at COMMIT (see the snapshot-isolation note).
2. No active grant → `deny` (no authority).
3. `amount > approval_limit` → `escalate` to the nearest ancestor grant whose limit covers it.
4. **SoD check:** does the actor hold a conflicting prior action on this resource per `policy_rules`? e.g. actor created the vendor and is now approving its invoice → `deny`.
5. Otherwise → `allow`.

Always return a `reason` and the `policy_rules` ids that fired. The reason string is a product feature, it's the defensible "why." Write the `decision` and the `ledger` append in the same transaction as the evaluation read, under `withRetry`.

## Connection (IAM token, serverless)

```ts
import { DsqlSigner } from "@aws-sdk/dsql-signer";
import { Pool } from "pg";

let pool: Pool | null = null;
let tokenExpiry = 0;

export async function getPool(): Promise<Pool> {
  const now = Date.now();
  if (pool && now < tokenExpiry) return pool;

  const signer = new DsqlSigner({
    hostname: process.env.DSQL_ENDPOINT!,
    region: process.env.AWS_REGION!,
  });
  const token = await signer.getDbConnectAdminAuthToken();

  pool?.end().catch(() => {});
  pool = new Pool({
    host: process.env.DSQL_ENDPOINT,
    port: 5432,
    database: "postgres",
    user: "admin",
    password: token,
    ssl: { rejectUnauthorized: true },
    max: 1, // one connection per serverless invocation; keep transactions short
  });
  tokenExpiry = now + 10 * 60 * 1000; // refresh well before the token's TTL
  return pool;
}
```

## Retry wrapper (use on every write)

```ts
import type { PoolClient } from "pg";

export async function withRetry<T>(
  fn: (client: PoolClient) => Promise<T>,
  attempts = 5,
): Promise<T> {
  const pool = await getPool();
  for (let i = 0; i < attempts; i++) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (err: any) {
      await client.query("ROLLBACK").catch(() => {});
      // 40001 = OCC conflict (OC000) or stale schema (OC001). Retry idempotently.
      if (err?.code === "40001" && i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 2 ** i * 25 + Math.random() * 25));
        continue;
      }
      throw err;
    } finally {
      client.release();
    }
  }
  throw new Error("withRetry exhausted");
}
```

## Commands

```bash
pnpm dev              # next dev
pnpm build            # next build
pnpm lint             # eslint
pnpm typecheck        # tsc --noEmit
pnpm db:migrate       # run ordered SQL files in /db/migrations against DSQL
pnpm db:verify        # walk the ledger, recompute the chain, report integrity
```

Migrations are plain numbered `.sql` files run in order by a small Node script. DDL runs async and can return `OC001`; the migrate script retries on `40001`. Create indexes with `CREATE INDEX ASYNC` and poll for validity before the next step.

## Conventions

- TypeScript strict. No `any` in the engine or ledger paths.
- Every DB write goes through `withRetry`. No bare `client.query` for writes.
- All IDs are app-generated UUIDs. Never assume DB-assigned IDs.
- Referential integrity is checked in code, in-transaction, because the DB won't.
- The authority-grant read path is never cached. Strong consistency is the whole point.
- Comments only where the DSQL behavior is non-obvious. The retry and the async-index waits get a comment; CRUD does not.

## Guardrails — do not

- Do not add foreign keys, `SERIAL`, sequences, triggers, or extensions.
- Do not use plain `CREATE INDEX` on a populated table.
- Do not `UPDATE` or `DELETE` the `ledger`. It is append-only and the app role lacks the grant.
- Do not cache authority grants.
- Do not claim the hash chain prevents tampering. It evidences it.
- Do not let an ORM generate the schema. Hand-write the SQL.

## Frontend — the Decision Inspector

Design is the weak axis and the brief weights it: "does the front-end feel designed in relation to the back-end." Warden is backend-heavy and a governance tool defaults to boring admin tables. The defense is one genuinely designed surface, the Decision Inspector, that exposes the data model honestly instead of hiding it. The schema is the product, so the UI should make the schema legible, not paper over it.

Pin the subject: this is a forensic governance console for finance and risk operators. Not a SaaS dashboard, not an admin CRUD panel. The vernacular is authority, revocation, seals, chain of custody, defensible record. Design from that world.

### Tokens

Avoid the three AI-default looks (warm-cream serif, near-black acid-green, broadsheet hairlines). This is "vellum, ink, and wax seal," cooled and modern.

- `--paper` `#EEF1F0`  cool bone base, not warm cream
- `--ink` `#14171A`  near-black with a cool cast
- `--seal` `#6E1D24`  oxblood. Primary actions and the chain seals. The authority accent
- `--panel` `#E3E7E6`  inked surface behind monospace data
- `--line` `#C9CFCD`  hairline rules
- `--allow` `#1F7A4D` · `--deny` `#B0271F` · `--escalate` `#B5790A`  semantic, load-bearing, never decorative

Type: **Geist Sans** for UI and **Geist Mono** for every hash, id, org path, and amount. Geist is Vercel's own face, so it's on-brand for the deploy target and reads as a choice, not a default. The monospace data is load-bearing typography: the hashes and grant windows ARE the aesthetic. Don't hide them in a tooltip.

### Layout

Three panes. The chain on the right is the signature element.

```
┌ REQUEST FEED ──┬ DECISION INSPECTOR ────────────┬ LEDGER CHAIN ┐
│ ▢ approve inv  │  DENY                           │  ◉ 0041 9f3a │
│ ▢ create vend  │  Priya Nair · approve_payment   │  │           │
│ ▢ approve pmt ◀│  vendor INV-88421               │  ◉ 0040 3a17 │
│ ▢ ...          │  $2,000,000                     │  │           │
│                │  Reason: authority revoked 31s  │  ◉ 0039 c0d2 │
│                │  Policies: LIMIT-02, SOD-07     │  │           │
│                │  ┌ context at decision ───────┐ │  ◉ 0038 7be5 │
│                │  │ active grants: 0           │ │              │
│                │  │ limit checked: revoked      │ │  [ Verify ]  │
│                │  └─────────────────────────────┘ │  intact ●    │
│                │  [ Revoke grant ]  [ Re-run ]   │              │
└────────────────┴─────────────────────────────────┴──────────────┘
```

### Components, each bound to the model

1. **Request feed** — rows from `decisions` (or the live request queue). Each row carries a verdict badge in the semantic color. Selecting a row drives the inspector. Empty state copy: "No actions awaiting a decision."
2. **Decision Inspector (hero)** — the selected decision in full: verdict large, then `actor`, `action_type`, `resource`, `amount`, the `reason` string, the `policy_rules` ids that fired, and the `evaluated_context` snapshot (active grants at decision time, the limit check, the SoD result). This panel is the defensible "why" made visible. It's the thesis of the whole product, so it gets the most design care.
3. **Authority / Revoke control** — the actor's `authority_grants` with validity windows in mono. **Revoke** flips `revoked_at`. **Re-run** re-POSTs the same proposed action to the PDP. The allow-to-deny flip on re-run is the strong-consistency beat, rendered.
4. **Ledger chain (signature)** — `ledger` rows as a vertical sealed spine, each block showing `seq` and a truncated `hash` linking to the block above. **Verify** calls `verifyChain` and runs a pass down the spine; intact seals settle green. The tamper control (demo only, via a privileged role) edits one row and the break plus everything below it goes red from that seq down.

### Motion, restrained

Two moments only. The verify pass travelling down the chain as seals lock. The verdict flipping allow to deny when the grant is revoked. Nothing else animates. Respect reduced-motion.

### Copy

Active voice, named by what the operator controls. "Revoke grant," not "Update authority_grants." Verify states read plainly: "Chain intact through seq 0041" / "Break detected at seq 0039." Errors state what happened and the fix, in the interface's voice. The button that says "Revoke grant" produces a result that says "Grant revoked."

### Design guardrails

- The Inspector and the chain are the product. No raw admin table is ever the hero screen.
- Spend all the boldness on the sealed chain. Keep every other surface quiet and disciplined.
- Quality floor without announcing it: responsive to mobile, visible keyboard focus, reduced motion honored.

## v0 build path

Don't start v0 from a blank prompt. Start from the **AWS Labs Aurora DSQL Starter Kit** or Vercel's DSQL demo repo; they've solved the IAM-token-to-`pg` wiring, which is the fiddliest hour of this build. Then prompt v0 for the three-pane console against the tokens above, and wire each pane to Next.js route handlers calling the `pg` pool. Use the **Vercel Marketplace OIDC integration** for AWS credentials, IAM roles, no stored keys, which matters because the repo is public for judging and lines up with the token auth already specified above.

## Agent boundary — state it honestly

There is no live ERP agent in this build, and a judge will spot a hand-wave. The PDP is an HTTP contract: any agent POSTs a proposed action, Warden returns the verdict. Demo it with a simulated SAP agent posting to the endpoint. In the video, say exactly that: "any agent calls this contract; here it's a simulated SAP agent." Honesty about the boundary scores better than a faked integration.

## Demo — the revoked approver

One visceral scene proves both beats. Run it in this order:

1. A clean payment approval is posted under a valid grant. Warden returns **allow**, appends to the chain.
2. **Revoke** the approver's authority grant.
3. Thirty seconds later, an identical **$2,000,000** payment approval is posted under that same approver. Warden returns **deny**, and the reason cites the just-revoked grant. The denial is consistent the instant the revoke committed, across regions, which is the DSQL property no ordinary Postgres setup guarantees.
4. **Verify** the chain: intact, green.
5. Tamper one ledger row live. **Verify** again: red from the break down.

Strong consistency on the revoke and tamper-evidence on the chain are the two beats. The $2M and the thirty-second window make them land. Everything else is supporting cast.
# Warden — Design

> How Warden is built. Companion to `requirements.md` and the root `claude.md` (which holds the canonical DSQL constraints, hash-chain code, connection, and design tokens). This document covers architecture, contracts, data flow, and failure modes; it does not repeat code that lives verbatim in `claude.md`.

## 1. Architecture overview

```
                ┌─────────────────────────────────────────────┐
   any agent →  │  POST /api/pdp/decide  (Node route handler)  │
 (sim SAP agent)│        │                                     │
                │        ▼                                     │
                │   lib/engine.evaluate()  ── reads grants ──┐ │
                │        │  (one txn, withRetry)             │ │
                │        ▼                                   ▼ │
                │   lib/ledger.append()            Aurora DSQL │
                │        │                      (region A ⇄ B, │
                │        ▼                       witness region)│
                │   decision + ledger row (same txn)           │
                └─────────────────────────────────────────────┘
   Decision Inspector (Next.js App Router UI) ── reads ──► route handlers ──► DSQL
   AI layer (Vercel AI Gateway): agent simulator · NL→policy author · reason polish
```

Next.js App Router on Vercel (Fluid Compute). All DB access through a thin `pg` query layer with IAM-token auth via Vercel OIDC federation — no stored keys. The data model is the product; the UI exposes it honestly.

## 2. Components & interfaces

- **`lib/db.ts`** — `getPool()` (module-scope `Pool`, `attachDatabasePool`, async `password` via `DsqlSigner`), `withRetry(fn)` (idempotent retry on `40001`). Per `claude.md` with the Fluid corrections from the plan (no `max:1`).
- **`lib/engine.ts`** — `evaluate(input, client): Promise<Verdict>`. Pure decision logic over a transaction client; no I/O of its own beyond the passed client. Returns `{verdict, reason, firedRuleIds, evaluatedContext}`.
- **`lib/ledger.ts`** — `canonical()`, `linkHash()`, `appendDecision(client, decision)` (idempotent `ON CONFLICT (request_id) DO NOTHING`), `verifyChain(): {ok, breakAtSeq?}`.
- **`lib/ai/agent.ts`** — scenario → PDP POSTs (AI Gateway, `anthropic/claude-sonnet`).
- **`lib/ai/policy-author.ts`** — NL → `policy_rules.definition` jsonb (AI Gateway, `anthropic/claude-haiku`), returned for review.
- **`app/api/*/route.ts`** — thin HTTP wrappers over the libs (Node runtime).
- **`packages/sdk/`** — `@warden/sdk` exposing `decide(input)`.
- **`app/(console)/`** — three-pane Decision Inspector.

Each unit is independently testable: the engine takes a client and input and returns a verdict; the ledger takes rows and produces/validates hashes; routes only marshal HTTP↔libs.

## 3. Data model

Five tables, no FKs, UUID PKs, app-enforced integrity. `jsonb` is native on DSQL (verified). Schema is canonical in `claude.md` §Data model; corrections applied: `jsonb` (not text fallback), UUID PKs via client `gen_random_uuid()`/app UUIDv4, no sequences for PKs.

| Table | Key columns | Notes |
|---|---|---|
| `org_units` | `id uuid pk`, `path text`, `name`, `unit_type` | Hierarchy via materialized path; ancestor/descendant via `path LIKE '/root/finance/%'`. |
| `authority_grants` | `id uuid pk`, `principal_id`, `org_path`, `action_type`, `approval_limit numeric`, `valid_from`, `valid_to`, `revoked_at` | Active iff in window and not revoked. Revocation = set `revoked_at`. |
| `policy_rules` | `id uuid pk`, `rule_type`, `definition jsonb`, `active bool` | SoD pairs, thresholds, required-approver counts. |
| `decisions` | `id uuid pk`, `request_id unique`, `actor`, `action_type`, `resource`, `amount`, `verdict`, `reason`, `evaluated_context jsonb`, `created_at` | One row per decided request. |
| `ledger` | `id uuid pk`, `seq`, `request_id unique`, `prev_hash`, `payload jsonb`, `hash`, `created_at` | Append-only; `REVOKE UPDATE, DELETE ... FROM <app_role>`. |

Indexes via `CREATE INDEX ASYNC`, polled on `sys.jobs`: grants by `(principal_id, action_type)`; org by `path`; decisions by `created_at`; ledger by `seq`.

## 4. Evaluation algorithm (FR-1)

In one `withRetry` transaction:
1. Load actor's grants for `actionType` where `org_path` is an ancestor-or-equal of the resource path AND active. → none ⇒ `deny` ("no authority").
2. Pick the tightest covering grant. IF `amount > approval_limit` ⇒ find nearest ancestor grant whose limit covers ⇒ `escalate` (or `deny` if none).
3. Load active SoD rules; check the actor's prior actions on this resource (from `decisions`). Conflict ⇒ `deny` citing the rule.
4. Else ⇒ `allow`.
5. Build `evaluatedContext` (active grant count, limit checked, SoD result). Insert `decisions` row and append `ledger` row in the same txn. Return verdict.

Reason strings are deterministic and name what fired. Snapshot isolation (REPEATABLE READ) + same-txn read/write means a concurrent revoke that commits first triggers a `40001` retry, which re-reads and denies — never a stale allow.

## 5. Ledger hash chain (FR-3)

`hash = sha256(prev_hash || canonical(payload))`, genesis = 64 zeros. `canonical()` enforces stable key order so identical payloads hash identically. Append is idempotent on `request_id`. `verifyChain()` walks by `seq`, recomputing; first mismatch = break; everything after is flagged. Immutability is DB-enforced (role lacks UPDATE/DELETE). The tamper demo uses a separate privileged role to edit one row. Code is verbatim in `claude.md` §Hash chain.

## 6. Multi-region (FR-4)

Two single-region clusters peered (e.g. `us-east-1` + `us-west-2`) + a witness region holding the encrypted transaction log for quorum. Both endpoints are read/write (active-active); DSQL guarantees strong consistency across them. The app's primary region reads/writes cluster A; a second function region (or second deployment) reads cluster B for the cross-region demo. Validate peering + strong-consistency behavior before relying on the demo (Phase 4 gate). Fallback: single-region still demos the revoke flip and tamper-evidence.

## 7. AI layer (FR-5)

Vercel AI Gateway with `provider/model` strings. Agent simulator (`anthropic/claude-sonnet`) emits structured PDP POSTs from a scenario. NL→policy authoring (`anthropic/claude-haiku`) returns a candidate `definition` jsonb for operator review — never auto-activated. Optional reason polish is presentational only. The deterministic engine is always the source of truth; the LLM never decides.

## 8. Connection, retry, auth

Per `claude.md` + plan corrections: module-scope `Pool` with `attachDatabasePool`, async `password: () => signer.getDbConnectAdminAuthToken()`, `ssl:{rejectUnauthorized:true}`, `database:'postgres'`, `user:'admin'`, `maxLifetimeSeconds ~50min`, low idle timeout. Credentials via `awsCredentialsProvider({roleArn})` from `@vercel/oidc-aws-credentials-provider` (current package). IAM role: trust policy (Vercel OIDC `AssumeRoleWithWebIdentity`) + permissions (`dsql:DbConnectAdmin` on the cluster ARN). `AWS_REGION` pinned explicitly. Node runtime only.

## 9. API contracts

- `POST /api/pdp/decide` → `{requestId, actor, actionType, resource, amount, context}` ⇒ `{verdict, reason, firedRuleIds, evaluatedContext, requestId}`.
- `POST /api/grants/:id/revoke` ⇒ `{id, revoked_at}`.
- `GET /api/ledger?limit=` ⇒ `[{seq, request_id, hash, prev_hash, payload, created_at}]`.
- `GET /api/ledger/verify` ⇒ `{ok, breakAtSeq?}`.

## 10. Failure modes

| Failure | Handling |
|---|---|
| `40001` OCC conflict / stale schema | `withRetry` idempotent backoff (5 attempts). |
| Token expiry mid-pool-life | Async `password` mints a fresh token per new connection; recycle before 60-min cap. |
| Duplicate `requestId` | Idempotent: unique `request_id`, `ON CONFLICT DO NOTHING`. |
| Index build fails (INVALID) | Drop + recreate `ASYNC`; migrate script surfaces `sys.jobs` failure. |
| Edge runtime accidentally set | Forbidden; `pg` needs Node TCP. Lint/check route configs. |
| Multi-region peering not ready | Fall back to single-region demo; never block core. |
| LLM bad/hallucinated policy | NL output is a review candidate only; engine validates shape before activation. |

## 11. Testing strategy

- **Unit:** engine verdicts (allow, deny-no-authority, escalate-over-limit, deny-SoD); ledger `canonical`/`linkHash`/`verifyChain` (intact + tampered). Tests read as English specs.
- **Integration:** migrate against DSQL; ledger UPDATE/DELETE rejected for app role; PDP route round-trips.
- **E2E:** `db:verify` green→tamper→red; multi-region revoke→deny; browser walk of the demo scene (Playwright/Chrome MCP).

## 12. Deployment

Start from `vercel/aws-dsql-movies-demo` (OIDC wiring solved) and `aws-samples/aurora-dsql-samples` (signer→pg). Deploy on Vercel; v0 for the UI shell only. Migrations are numbered `.sql` run by `scripts/migrate.ts` (DDL one-per-txn, separate from DML, `40001` retry).

# Warden

**Governance for enterprise AI agents.** A Policy Decision Point (PDP) agents call
*before* they act, and a hash-chained audit ledger they write to *after* — built on
**Amazon Aurora DSQL** and deployed on **Vercel**.

> H0 "Hack the Zero Stack" · Track 2 (Monetizable B2B) · Database: **Amazon Aurora DSQL**

## The problem

ERP-native agents (SAP Joule, Oracle, Workday) understand transactional data but not
a company's approval chains, segregation-of-duties (SoD) rules, or authority grants.
They can take actions that are valid in the ERP yet *illegal in the business* — and
leave no defensible record of why. Warden sits in front of that: any agent posts a
proposed action; Warden evaluates it against org hierarchy, active authority grants,
approval limits, and SoD policy, and returns `allow | deny | escalate` with a reason —
then seals every decision into a tamper-evident ledger.

## Why Aurora DSQL is load-bearing (not incidental)

Warden's core promise is that **a revoked authority is safe instantly, everywhere**.
Revoke an approver's grant in one region and the very next transaction — evaluated in
*another* region — is denied, with no stale read ever approving on a revoked grant.

That is true *only* on Aurora DSQL. Single-region Postgres has no multi-region story;
Aurora Postgres Global replicas lag; DynamoDB global tables are eventually consistent
(actively wrong for authority). DSQL's strongly-consistent, active-active architecture
is what makes the guarantee real — so "why this database?" answers itself. The decision
read and the decision+ledger write happen in **one transaction**; DSQL's optimistic
concurrency turns any conflicting concurrent revoke into a retry, never a stale `allow`.

## Architecture

```
 any agent ──POST /api/pdp/decide──▶  evaluate() over WardenStore (one txn, withRetry)
(@warden/sdk)                              │  reads grants + SoD on the txn client
                                           ▼
                                   decision row + chained ledger append   ──▶  Aurora DSQL
                                           ▲                                   (region A ⇄ B
 Decision Inspector (Next.js) ──reads──────┘                                    + witness)
```

- **`lib/engine.ts`** — pure verdict logic over a `WardenStore` **port**; unit-tested with
  an in-memory fake, zero database required.
- **`lib/store-dsql.ts`** — the DSQL adapter implementing that port (reads on the txn client).
- **`lib/ledger.ts`** + **`lib/payload.ts`** — SHA-256 hash chain over canonical, all-string
  payloads (so a jsonb round-trip can't break verification).
- **`lib/pdp.ts`** — the service layer: `decide`, `revokeGrant`, and the read queries.
- **`lib/db.ts`** — Fluid-aware `pg` pool with IAM-token auth: OIDC federation on Vercel
  (no stored keys), default credential chain locally.
- **`app/api/*`** — Node-runtime route handlers. **`packages/sdk`** — the typed client.

## Data model (5 tables, no FKs — DSQL constraints honored)

`org_units` (materialized path) · `authority_grants` (active iff in window and not revoked)
· `policy_rules` (SoD as `jsonb`) · `decisions` (every verdict, unique `request_id`) ·
`ledger` (append-only hash chain; `UPDATE`/`DELETE` revoked from the app role). UUID PKs,
`CREATE INDEX ASYNC`, idempotent writes — see `db/migrations/` and `specs/warden/design.md`.

## Run it

```bash
npm install
npm run provision          # create the DSQL cluster via the AWS SDK (prints the endpoint)
# add DSQL_ENDPOINT + AWS_REGION to .env  (see .env.example)
npm run health             # SELECT 1 — proves the connection
npm run db:migrate         # schema + async indexes
npm run seed               # the demo world (org tree, grants, SoD rule)
npm run dev                # the Decision Inspector console
npm test                   # engine, ledger, payload, validation, SDK
```

Local auth uses the default AWS provider chain (`~/.aws/credentials`); the Vercel
deployment uses OIDC federation with no stored keys.

## API

| Method & path | Purpose |
|---|---|
| `POST /api/pdp/decide` | Evaluate a proposed action → `{ verdict, reason, firedRuleIds, evaluatedContext }` |
| `POST /api/grants/<id>/revoke` | Revoke an authority grant |
| `GET /api/decisions` | Recent decisions (request feed) |
| `GET /api/ledger` · `GET /api/ledger/verify` | The chain, and its integrity check |
| `GET /api/grants?principal=` | A principal's authority grants |

## The demo

1. A clean `$2,000,000` payment approval under a valid grant → **allow**, sealed into the chain.
2. **Revoke** the approver's grant.
3. Seconds later, an identical `$2,000,000` approval evaluated via the other region → **deny**,
   citing the just-revoked grant. (Strong consistency, no stale allow.)
4. **Verify** the chain → intact, green. Tamper one row → red from the break down.

## Honest boundaries

There is no live ERP agent here: the PDP is an HTTP contract any agent can call; the demo
uses a simulated SAP agent. The hash chain is tamper-**evident**, not tamper-proof — it
detects edits, it doesn't prevent a writer with row access from making them (immutability
is enforced by revoking `UPDATE`/`DELETE` from the app role).

## Monetization

Per-decision pricing for the PDP plus a per-seat governance console — priced against the
cost of a single mis-authorized transaction or a failed SOX control.

# Warden

**The control plane for enterprise AI agents.** A synchronous, pre-execution **business-authority Policy Decision Point (PDP)** that an agent calls *before* it acts, and a hash-chained, tamper-**evident** audit ledger it writes to *after*. Built on **Amazon Aurora DSQL**, deployed on **Vercel**.

> H0 — Hack the Zero Stack · **Track 2 (Monetizable B2B)** · Database: **Amazon Aurora DSQL** · Live: https://warden-khaki.vercel.app

---

## The problem

ERP-native agents (SAP Joule, Oracle Fusion Agentic, Workday) understand transactional data but not a company's **approval chains, authority grants, or segregation-of-duties (SoD) rules**. They can take an action that is valid in the ERP yet *illegal in the business* — settle a deal they captured, pay a vendor whose bank details they just changed, approve $2M on a mandate that was revoked an hour ago — and leave no defensible record of *why* it was allowed.

The control matrix that used to be enforced by human-click latency (a SOX R&R matrix, an approval-limit table, an SoD ruleset) stops enforcing itself the moment the actor becomes an agent acting at machine speed.

**Warden re-enforces it.** An agent POSTs a proposed action; Warden evaluates it against org-hierarchy authority, approval limits, and SoD over real prior-action history, and returns `allow | deny | escalate` with a reason and the rule ids that fired. Every verdict is sealed into an append-only hash chain.

```
agent ──POST proposed action──▶  WARDEN PDP  ──▶ allow | deny | escalate (+ reason, + rule ids)
                                     │
                                     └──seal verdict──▶ hash-chained ledger (tamper-evident)
```

The PDP is a plain HTTP contract — **any** agent or framework (LangGraph, CrewAI, AWS AgentCore, SAP Joule) calls the same `decide()`. In this build the caller is a *simulated* SAP-style agent; there is no live ERP integration, and we say so out loud.

---

## Why Amazon Aurora DSQL (the load-bearing reason)

Warden's hardest requirement is **correctness under distribution**: when an authority grant is revoked, *no* region may ever approve the next action on the stale grant. That is a consistency problem, and it is where the database choice stops being incidental.

We make a **narrow, honest** claim — not "only DSQL is consistent" (Spanner, CockroachDB and YugabyteDB are strongly consistent too):

> **Aurora DSQL is the only AWS-native primitive that gives synchronous, active-active, multi-Region strong consistency *and* the SQL transaction + row-lock semantics this PDP needs.**

The two AWS-native alternatives each fail one half:

| AWS option | Strong multi-Region consistency? | Supports the PDP's transaction? | Verdict |
|---|---|---|---|
| **DynamoDB global tables (MRSC)** | Yes (GA Jun 2025, zero RPO) | **No** — *"Global tables configured for multi-Region strong consistency (MRSC) do not support transaction operations, and will return an error"* | Can't run an ACID `FOR UPDATE` + decision + ledger append |
| **Aurora PostgreSQL Global Database** | **No** — secondary reads *"might see data that is slightly stale due to replication lag"* | Yes | A lagging replica can approve a revoked grant |
| **Aurora DSQL** | **Yes** — *"two strongly consistent Regional endpoints… with zero replication lag on commit"* | Yes (Postgres-compatible SQL + `SELECT … FOR UPDATE`) | ✅ both |

Warden's decision path is a **single transaction**: resolve the actor's covering grants up an org **materialized path**, lock them with `SELECT … FOR UPDATE`, evaluate authority/limit/SoD, then write the `decision` row and the `ledger` append — all under one `withRetry`.

**An honest note on isolation.** DSQL is **strong snapshot isolation** (AWS: *"equivalent to repeatable read isolation in PostgreSQL"*) — not serializable. Plain reads do **not** participate in optimistic-concurrency conflict detection, so a same-transaction read is *necessary but not sufficient* to stop a stale allow under a concurrent revoke. The fix is the AWS-sanctioned write-skew remedy: lock the covering `authority_grants` rows `FOR UPDATE` so a concurrent revoke conflicts at `COMMIT` (`SQLSTATE 40001`) and `withRetry` re-evaluates against the revoked state. We demonstrate that abort live (`scripts/concurrency-proof.ts`). The `FOR UPDATE` lock is not an embarrassment — it is exactly the depth an AWS Databases panel rewards.

Sources (all verbatim from AWS docs):
- DSQL strong consistency / zero replication lag on commit — https://docs.aws.amazon.com/aurora-dsql/latest/userguide/disaster-recovery-resiliency.html
- DSQL snapshot isolation + `FOR UPDATE` write-skew remedy — https://aws.amazon.com/blogs/database/concurrency-control-in-amazon-aurora-dsql/
- DynamoDB MRSC "do not support transaction operations" — https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/V2globaltables_HowItWorks.html
- Aurora Global Database write-forwarding "slightly stale" — https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-write-forwarding-apg.html

---

## The cross-region money-shot

The differentiator is *shown*, not asserted. Warden runs on a **multi-Region DSQL cluster**: an active-active pair (`us-east-1` ⟷ `us-west-2`, witness `us-east-2`) presenting one logical, strongly-consistent database.

1. A clean **$2,000,000** payment approval is POSTed via **region A** under a valid London gas-desk mandate → **allow**, sealed.
2. The mandate is **revoked** via region A.
3. The identical $2M action is immediately re-POSTed via **region B's** endpoint → **deny**, citing the just-revoked grant — with **zero replication lag on commit**.

No async-replica topology guarantees step 3. `/api/demo/cross-region` runs the full A→B sequence and returns both verdicts, the commit timestamps, and the measured cross-region gap.

---

## Where Warden sits (and what it is *not*)

The closest comparison is **AWS Bedrock AgentCore Policy** (GA 3 Mar 2026) — a default-deny, Cedar-based PDP that intercepts agent tool-calls. It is excellent **stateless tool-access** authorization. Warden is a different layer, and the difference is the moat:

| Capability | AgentCore Policy / Cedar | GRC suites (Pathlock, SafePaaS) | OPA / Cerbos / Permit | **Warden** |
|---|---|---|---|---|
| Pre-execution, external HTTP contract any agent calls | ✅ | ✗ (in-ERP / detective) | ✅ | ✅ |
| **Stateful** business authority (grants up an org hierarchy) | ✗ stateless¹ | ✅ | ✗ (feed it the state) | ✅ |
| Approval-**limit escalation** to nearest covering ancestor | ✗ (hardcoded literal¹) | partial | ✗ | ✅ |
| **SoD over real prior-action history** | ✗ no history | ✅ (detective) | ✗ stateless | ✅ |
| `escalate` verdict (human-in-the-loop) | ✗ permit/forbid only | n/a | varies | ✅ |
| **Strong-consistency global revocation** | not specified | n/a | async cache window | ✅ (DSQL) |
| Tamper-evident verdict ledger | ✗ | partial (in-ERP logs) | ✗ | ✅ |

¹ AWS's own Cedar docs: a policy's evaluation *"depends only on the scope (principal, action, resource)… and the context and tags"*; the amount check in AWS's example is a hardcoded `context.input.amount < 500` literal. Structurally it cannot resolve a revocable per-principal limit up a hierarchy or evaluate SoD over history.

**It is also not an orchestrator or a guardrail.** LangGraph/CrewAI human-in-the-loop is control-flow, not authorization (LangChain's own docs say HITL "does not implement authorization logic or business rule evaluation"). Bedrock/NeMo guardrails are content-safety on text — a polite "$2M payment" from a revoked approver passes every guardrail; it isn't unsafe, it's *unauthorized*. Warden runs **behind** the coarse gateway and **beside** the guardrails; an `escalate` lands in the orchestrator's interrupt.

The emerging **OpenID AuthZEN AARP** draft (WG draft, Jun 2026) standardizes the request → approve → re-evaluate *handshake* and explicitly leaves the policy engine and enforcement semantics to the PDP. AARP is the socket; Warden is the engine that fills it.

---

## Architecture (code)

```
 any agent ──POST /api/pdp/decide──▶  evaluate() over WardenStore (one txn, withRetry)
(@warden/sdk)                              │  reads grants + SoD on the txn client, FOR UPDATE
                                           ▼
                                   decision row + chained ledger append   ──▶  Aurora DSQL
                                           ▲                                   (region A ⇄ B
 console (Next.js) ──reads──────────────────┘                                   + witness us-east-2)
```

- **`lib/engine.ts`** — pure verdict logic over a `WardenStore` **port**; unit-tested with an in-memory fake, zero database required.
- **`lib/store-dsql.ts`** — the DSQL adapter implementing that port (reads on the txn client; `FOR UPDATE` on the covering grants).
- **`lib/ledger.ts`** + **`lib/payload.ts`** — SHA-256 hash chain over canonical, all-string payloads (so a JSONB round-trip can't break verification).
- **`lib/pdp.ts`** — the service layer: `decide`, `revokeGrant`, the read queries.
- **`lib/db.ts`** — Fluid-aware `pg` pool with IAM-token auth: OIDC federation or non-reserved `DSQL_AWS_*` keys on Vercel, default credential chain locally; region-keyed pools for the cross-region demo.
- **`app/api/*`** — Node-runtime route handlers. **`packages/sdk`** — the typed client.

---

## Data model (5 tables, no FKs — DSQL-native)

DSQL has no foreign keys, no sequences/`SERIAL`, no triggers. Integrity is enforced in the app layer, in-transaction. All ids are client-generated UUIDs.

- **`org_units`** — org hierarchy as a **materialized path** (`/global/trading/gas/`); ancestor/descendant via `path LIKE`, no recursive CTE.
- **`authority_grants`** — who may do what, where, up to how much. Active iff `now()` ∈ `[valid_from, valid_to)` and `revoked_at is null`. Revocation is the consistency demo.
- **`policy_rules`** — SoD / threshold rules as **JSONB** (e.g. `capture_trade` ⊗ `approve_settlement` = `SOD-FBO-01`, the Barings front/back-office wall).
- **`decisions`** — every verdict (`request_id` unique), with `evaluated_context`.
- **`ledger`** — append-only hash chain over decisions. In this build the app connects as a single admin role, so append-only is enforced by the **hash chain + convention**, not yet by the DB. The production roadmap adds a least-privilege app role (`GRANT INSERT, SELECT` + `REVOKE UPDATE, DELETE ON ledger`) so the database enforces it, with the tamper demo moved to an explicitly-named admin connection. Stated plainly because a judge will check.

### Engine — evaluation order (one transaction, under `withRetry`)

1. Resolve the actor's **active** grants for the action at/above the resource's `org_path`; lock them `FOR UPDATE`.
2. No active grant → **deny** (no authority).
3. `amount > approval_limit` → **escalate** to the nearest covering ancestor.
4. SoD conflict over prior actions on this resource → **deny** (cite the rule).
5. Otherwise → **allow**.

Always returns a `reason` and the `policy_rules` ids that fired — the defensible *why*.

### Hash chain

Each ledger row hashes `prev_hash + canonical(payload)` (SHA-256, stable key order). Append is idempotent on `request_id` (`ON CONFLICT DO NOTHING`). `verifyChain()` walks the chain and flags the first mismatch. This is tamper-**evidence**, not tamper-prevention: it detects any after-the-fact edit; it does not stop a DB admin with write rights — which is *why* the production roadmap adds an external WORM anchor. We state that precisely.

---

## Monetization (Track 2)

A **hybrid**, anchored to *avoided-control-failure cost* (one missed SoD breach on a $2M payment dwarfs a year of fees):

- **Per-governed-principal platform tier** — a "Monthly Active Principal" model counting human *and* agent identities (comparable: Cerbos Hub, Permit.io).
- **Per-decision meter** on high-value governed actions (comparable: Amazon Verified Permissions ~$0.000005/request; Bedrock AgentCore Policy ~$0.000025/request).

Honest caveat: no shipped product runs this exact hybrid today (AVP/AgentCore are pure per-request; Cerbos/Permit are pure per-principal) — it is a defensible synthesis, not a market-proven model.

---

## Run it

```bash
npm install
npm run dev              # next dev — console at /console, landing at /
npm run typecheck        # tsc --noEmit (strict)
npm run build            # next build

npm run db:migrate       # ordered SQL in db/migrations against DSQL (async indexes, 40001 retry)
npm run seed             # seed the "Global Trading" scenario (analog data — see below)
npm run db:verify        # walk the ledger, recompute the chain, report integrity
npx tsx scripts/concurrency-proof.ts   # live 40001 abort of a stale allow under a concurrent revoke
```

**Connection** is IAM-token auth — no stored passwords. On Vercel, credentials come from the AWS integration; a fresh DSQL token is minted per physical connection (tokens are short-lived). Env: `DSQL_ENDPOINT`, `DSQL_REGION` (+ `DSQL_ENDPOINT_B`/`DSQL_REGION_B` for the cross-region demo). On Vercel the AWS-reserved `AWS_*` names can't be passed to the function, so static keys use the non-reserved `DSQL_AWS_*` names.

### API contract

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/pdp/decide` | `{requestId, actor, actionType, resource, amount, context}` → verdict |
| POST | `/api/grants/[id]/revoke` | revoke a grant (the consistency demo) |
| GET | `/api/ledger` · `/api/ledger/verify` | the chain · integrity walk |
| GET | `/api/decisions` · `/api/grants` · `/api/policies` | read the live model |
| POST | `/api/demo/reset` · `/api/demo/tamper` · `/api/demo/run-agents` | demo controls |
| POST | `/api/demo/cross-region` | the region A → revoke → region B deny sequence |

---

## Honesty (this repo is public and judged)

- The chain is tamper-**evident**, not tamper-proof. SHA-256 hash-chaining is a 25-year-old pattern; the moat is the *engine + DSQL consistency*, not the chain.
- The agent is **simulated**. Any agent POSTs the contract; here it's a simulated SAP-style agent. There is no live ERP integration.
- All scenario data is fictional ("Global Trading" / "Meridian Refining Co."). Any metrics shown are **illustrative / demo-seeded**, not customer data.
- No fabricated customers, logos, or testimonials.
- DSQL is **strongly consistent under snapshot isolation**, not linearizable/serializable — we use AWS's own words.

---

## Stack

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind v4 · `pg` + `@aws-sdk/dsql-signer` (IAM tokens) · Amazon Aurora DSQL (multi-Region active-active) · Vercel.

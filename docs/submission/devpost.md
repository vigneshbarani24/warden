# Warden — Devpost submission copy

> **DRAFT in VB's voice — edit before pasting.** The judges said outright they can tell an
> AI-written description and it counts against you. Read it aloud, cut what doesn't sound
> like you, add a sentence only you would write. The structure and the facts are grounded;
> the voice has to be yours.

---

## Project name
**Warden**

## Tagline (one line)
The control plane for enterprise AI agents — a pre-execution authority check, and a tamper-evident record of every decision, on Amazon Aurora DSQL.

## Which AWS Database (state it plainly — they asked)
**Amazon Aurora DSQL.** We chose it because Warden's core promise — *a revoked authority is denied in every region the instant it's revoked, with no stale read ever approving a high-value action* — is only true on a synchronously strong-consistent, active-active, multi-Region SQL database. DSQL is the only AWS-native primitive that gives that **and** the `SELECT … FOR UPDATE` transaction semantics the decision path needs. DynamoDB global tables in strong-consistency mode don't support transactions; Aurora PostgreSQL Global Database secondaries can read slightly stale. DSQL is the one that does both.

## Inspiration
ERP-native agents — SAP Joule, Oracle Fusion's agents, Workday — understand transactional data. They do not understand a company's approval chains, authority grants, or segregation-of-duties rules. So an agent can take an action that's perfectly valid in the ERP yet illegal in the business: settle a deal it just captured, pay a vendor whose bank details it changed an hour ago, approve $2M on a mandate that was revoked this morning. The control matrix that used to be enforced by human-click latency — a SOX approval table, an SoD ruleset — stops enforcing itself the moment the actor is an agent moving at machine speed. The gap is invisible — every action looks valid, so nothing alarms — and it widens with every agent you deploy, until it surfaces all at once: at the audit, or the first regulator who asks an agentic firm why a $2M payment cleared. We built the layer that re-enforces the controls at the moment of action.

## What it does
An agent POSTs a proposed action to Warden's decision point. Warden, in **one Aurora DSQL transaction**:
- resolves the actor's **active** authority grants up an org-hierarchy materialized path,
- locks the covering grants `FOR UPDATE` so a concurrent revoke can't be read stale,
- evaluates authority → approval limit → **segregation of duties over real prior actions** → verdict,
- returns `allow | deny | escalate` with a human-readable **reason** and the **rule ids** that fired,
- and appends the verdict to an **append-only, hash-chained ledger** for tamper-evidence.

Traceable to code: the engine is `lib/engine.ts`; the DSQL transaction + `FOR UPDATE` is `lib/pdp.ts` + `lib/store-dsql.ts`; the hash chain is `lib/ledger.ts`; the published contract is `POST /api/pdp/decide` and the typed `@warden/sdk` (`packages/sdk/`). The forensic console (`/console`) shows it live: a Decision Inspector that exposes the "why," and a sealed ledger spine you can Verify (intact, green) and Tamper (break, red).

## How we built it
- **Data model first.** Five tables, no foreign keys (DSQL doesn't have them — integrity is enforced in-transaction in app code), client-generated UUIDs (no sequences), org hierarchy as a materialized path (no recursive CTEs), SoD rules as JSONB.
- **The decision is one transaction under an idempotent retry.** DSQL surfaces optimistic-concurrency conflicts at COMMIT as `40001`; every write is wrapped in `withRetry` with backoff. Plain reads don't join conflict detection, so the covering grants are locked `FOR UPDATE` — that's the AWS-sanctioned write-skew remedy, and it's what makes a concurrent revoke abort the decision instead of approving stale.
- **Multi-Region, real.** Two peered DSQL clusters (us-east-1 ⟷ us-west-2, witness us-east-2) as one logical database. `POST /api/demo/cross-region` runs allow-in-A → revoke-in-A → deny-in-B live and returns the measured gap.
- **IAM-token auth, no stored passwords.** `pg` pool with a fresh DSQL token minted per connection via `@aws-sdk/dsql-signer`; on Vercel via OIDC federation or non-reserved env keys (the `AWS_*` names are Lambda-reserved).
- **A thin, honest AI layer.** A simulated ERP agent (`@ai-sdk/openai`, gpt-4.1) calls Warden-gated tools and can only act on `allow`; an NL→policy feature compiles an English SoD control into a rule. The LLM never decides a verdict — the deterministic engine is always the source of truth.
- **Frontend** on Next.js 16 / React 19, deployed on Vercel.

## Challenges we ran into
- **DSQL is Postgres on the wire, not in behaviour.** No FKs, no sequences, no triggers, no `TRUNCATE`, snapshot isolation not serializable. We had to unlearn Postgres reflexes and design *for* optimistic concurrency.
- **The stale-allow race.** A same-transaction read is necessary but *not sufficient* to stop a revoked grant approving an action — plain reads don't trigger conflict detection. The fix was locking the grant rows `FOR UPDATE`; we prove the abort live in `scripts/concurrency-proof.ts`.
- **Vercel ↔ Lambda env traps.** `AWS_ACCESS_KEY_ID`/`AWS_REGION` are Lambda-reserved and never reach the function; piped env values carry a trailing newline that breaks TLS SNI. Both cost real debugging; both are now handled (non-reserved `DSQL_AWS_*` names, `.trim()` everywhere, SNI pinned on the pool).

## Accomplishments we're proud of
- The cross-region revoke→deny runs **live on the public URL**, with a measured gap, across two AWS regions — not a slide.
- The data model is the product, and it's honest about DSQL's constraints instead of fighting them.
- One genuinely designed surface — the forensic Decision Inspector + sealed ledger — instead of an admin CRUD panel.
- We say the boundaries out loud: the agent is simulated, the chain is tamper-*evident* not tamper-*proof*, and the metrics are illustrative.

## What we learned
That the database choice can *be* the product thesis. Warden's pitch and its hardest technical property are the same sentence — "revoked everywhere, instantly, no stale allow" — and that's only true because of how Aurora DSQL handles consistency. We also learned how much rigor `FOR UPDATE` + OCC retry buys you over a naive read-then-write.

## What's next (roadmap — not built yet)
- **DB-enforced ledger immutability**: a least-privilege app role with `REVOKE UPDATE, DELETE ON ledger`, so append-only is enforced by the database, not just by convention. Today the app connects as a single admin role — we state this plainly.
- **Auth on the demo/admin endpoints** (currently open so judges can test freely).
- **Money as decimal end-to-end** (currently JS number — fine for whole-dollar demo values, a precision smell for a real SOX ledger).
- **An external WORM anchor** for the chain, and real ERP connectors behind the same HTTP contract.

## Built with
TypeScript · Next.js 16 (App Router) · React 19 · Tailwind v4 · Amazon Aurora DSQL (multi-Region active-active) · `pg` · `@aws-sdk/dsql-signer` · `@aws-sdk/client-dsql` · `@vercel/oidc-aws-credentials-provider` · `@vercel/functions` · Vercel AI SDK (`ai`) · `@ai-sdk/openai` (gpt-4.1) · `zod` · Vercel

## Links
- **Live app:** https://warden-khaki.vercel.app  (try `/console` → Simulation → Play; then Cross-region → Run)
- **Repo:** https://github.com/vigneshbarani24/warden
- **Demo video:** <add the YouTube link>
- **Vercel Team ID:** `<paste from your Vercel dashboard or local .vercel/project.json — deliberately kept out of the public repo>`
- **Screenshots to capture:** (1) the Decision Inspector showing the SOD-FBO-01 deny; (2) the ledger Verify→Tamper break; (3) the Cross-region "✓ strongly consistent" result; (4) the AWS DSQL console showing the two ACTIVE multi-Region clusters (proof of AWS DB usage).

## Testing instructions (for the judges — paste into Devpost)
No login required. Open https://warden-khaki.vercel.app/console. In **Simulation**, press **Play** to run the full governed-agent demo on the live Aurora DSQL database (allow → revoke → deny → SoD deny → escalate → verify → tamper → break). Then open **Cross-region** and press **Run** to see a revoke in us-east-1 deny the same action in us-west-2. The PDP is also a plain HTTP contract: `POST /api/pdp/decide` with `{requestId, actor, actionType, resource, amount, orgPath}`.

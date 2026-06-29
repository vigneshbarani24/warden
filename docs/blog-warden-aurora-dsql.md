<!-- DRAFT — edit into your own voice before publishing, then DELETE this comment.
     Publish publicly (LinkedIn / dev.to / Medium / builder.aws.com), NOT unlisted,
     before the deadline. Add #H0Hackathon when you share it on social. -->

# Why an AI-agent permission check needs a strongly-consistent database (and how we built one on Aurora DSQL)

*By Vignesh Barani Sivakumar. I created this post for the purpose of entering the H0 "Hack the Zero Stack" hackathon (AWS Databases × Vercel). #H0Hackathon*

## The problem nobody noticed until the actor stopped being human

For decades, two of the most important controls in enterprise finance — approval limits and segregation of duties — were enforced largely by accident. Not by code. By latency. A purchase order over your limit sat in someone's inbox. The person who created a vendor was, in practice, a different human from the one who approved its first invoice, because routing it took a day and crossed a desk.

In 2026 that accident stopped holding. ERP agents — SAP Joule, Oracle Fusion's agentic features, in-house copilots — started taking real finance actions at machine speed. The agent is fast, tireless, and has no inbox. It can take an action that is valid in the ERP's own data model yet illegal in the business: approve a payment above its granted authority, or approve an invoice for a vendor it created moments earlier. And when the auditor asks *why was this allowed*, there's no defensible record. The ERP logged *what* happened. Nothing logged *why it was permitted*.

That gap is what I built Warden for.

## What Warden is

Warden is two things, deliberately small.

First, a **synchronous, pre-execution Policy Decision Point (PDP)**. An agent POSTs a proposed action *before* it acts — "capture this trade," "approve this $2M payment" — and Warden returns `allow | deny | escalate` with a human-readable reason and the rule ids that fired. It evaluates against three things: authority grants resolved *up* an org hierarchy (a materialized path, so "who can approve here" walks ancestors with a `LIKE`, not a recursive CTE); approval limits, with escalation to the nearest ancestor grant whose limit actually covers the amount; and segregation-of-duties rules checked against the actor's *real* prior-action history.

The developer contract is one call:

```ts
const v = await warden.decide({ actor, actionType, resource, amount, orgPath });
if (v.verdict !== "allow") halt(v);   // allow | deny | escalate, with a reason
```

Second, an **append-only, hash-chained ledger** the PDP writes to after every decision. Each row hashes the previous hash plus a canonical serialization of the decision. That makes the record tamper-*evident*: you can detect any after-the-fact edit, and prove the chain is intact.

## The database is the story

A governance gate has three requirements that fight each other:

1. **Correctness.** A revoked authority must *never* approve an action, anywhere, even for a second. The instant a grant is revoked, every region must already see it.
2. **Latency.** This check is in the hot path of *every* action an agent takes. It has to answer with region-local latency, not a cross-ocean round trip.
3. **No single point of failure.** It's a control plane. If it's down, agents either block (and the business stops) or bypass it (and the control is theater).

Now watch them collide. Async read replicas give you (2) and (3) but break (1): a stale replica can approve an action under a grant that was revoked seconds ago. A single primary with synchronous reads gives you (1) but breaks (2) and (3) — every region pays the round trip, and the primary is the thing that takes you down.

Amazon Aurora DSQL satisfies all three. It's active-active with synchronous commit — in AWS's own words, two strongly consistent Regional endpoints with **zero replication lag on commit**. A write isn't acknowledged until it's durable across regions, so there's no stale replica to read from. Reads are region-local. There's no single primary to lose.

So the one-sentence why, the version I'd say to a judge: **we built it on Aurora DSQL because a revoked authority must be denied in every region instantly — that needs synchronous, active-active strong consistency, and DSQL is the only AWS-native database that delivers it with full SQL transactions.**

## The honest engineering: a same-transaction read is not enough

Here's the part I'd want another engineer to push on, because it's where Warden could have been quietly wrong.

DSQL gives you **strong snapshot isolation** — equivalent to Postgres `REPEATABLE READ`, not `SERIALIZABLE`. And it uses optimistic concurrency: conflicts surface at `COMMIT` as `SQLSTATE 40001`, not on the statement. The catch is that **plain reads don't participate in conflict detection** — only writes do. DSQL detects write-write conflicts.

Think through the race. My decision transaction reads the actor's authority grant, sees it active, and is about to write `allow`. Concurrently, someone revokes that grant. Both started from the same snapshot. My transaction only *read* the grant row, so under snapshot isolation there's no write-write conflict on it — classic write skew. My `allow` could commit against a grant that, by wall-clock time, was already revoked. "I read it in the same transaction" is *necessary but not sufficient*.

The fix is the AWS-sanctioned one: turn the read into a write-intent. The decision transaction does `SELECT … FOR UPDATE` on the covering authority-grant row. Now a concurrent revoke is a genuine write-write conflict. One side loses at `COMMIT` with `40001`, a `withRetry` wrapper re-runs the whole transaction against the *now-revoked* state, and the verdict comes back `deny`.

```ts
// DSQL is snapshot isolation; plain reads don't trigger conflict detection.
// Lock the covering grant so a concurrent revoke conflicts at COMMIT (40001).
await client.query("SELECT id FROM authority_grants WHERE id = $1 FOR UPDATE", [grantId]);
// ... evaluate authority / limit / SoD, write the decision + the hash-chained ledger append ...
// withRetry re-runs the whole transaction on 40001, re-evaluating against the revoked state.
```

That `FOR UPDATE` line is the most important line in the codebase. It's the difference between a demo that looks consistent and one that is.

The rest of the data model is hand-built to respect DSQL's other constraints, none of which are optional: no foreign keys (referential integrity is checked in app code, in the same transaction as the write); no sequences or `SERIAL`, so all ids are client-generated UUIDs; `CREATE INDEX ASYNC` with a poll for validity; IAM-token auth, no stored passwords. You don't fight these — you design around them, and the schema comes out cleaner for it.

## The Vercel half: a serverless function that authenticates to DSQL with no stored secret

The PDP runs as Next.js route handlers on Vercel, and two things made the deployment more than a hello-world.

First, **IAM-token auth with no stored password.** DSQL doesn't take a static DB password — you mint a short-lived IAM auth token per connection. The `pg` pool generates a fresh token on every physical connection via `@aws-sdk/dsql-signer`, and the AWS credentials themselves come from Vercel's OIDC federation (`@vercel/oidc-aws-credentials-provider`): the function assumes an IAM role at runtime, so there are no long-lived keys in the project at all. For a public, judged repo, that matters — there's nothing to leak.

Second, **the traps that cost real debugging.** Vercel functions run on AWS Lambda, which *reserves* `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION` — set them as env vars and your code never sees the values, so the function can't authenticate to DSQL. The fix is non-reserved names (`DSQL_AWS_*`) passed explicitly to the signer. And env values piped into the platform can carry a trailing newline that breaks DSQL's TLS SNI routing, so every endpoint read is `.trim()`-ed and the pool pins `servername` to the host. On Fluid Compute the pool is created once at module scope and reused across invocations, so the token mint and TLS handshake amortize instead of being paid per request.

The result is the "prototype on a weekend, same foundation as production" story the stack promises: strong-consistency multi-Region SQL behind a serverless function, no keys on disk.

## The honest comparison

I won't tell you DSQL is the only consistent database. Spanner is strongly consistent. CockroachDB is. That claim would be wrong and an expert judge would catch it.

The claim is narrower and survives scrutiny: DSQL is the only **AWS-native** primitive that gives synchronous active-active strong consistency *plus* the SQL transaction and row-lock semantics this PDP needs. DynamoDB's multi-Region strong consistency mode does not support transaction operations — and the correctness argument above depends entirely on `SELECT … FOR UPDATE` inside a transaction. Aurora Global Database gives fast cross-region reads, but secondary reads are slightly stale — exactly the failure mode I'm eliminating. DSQL threads that needle inside AWS. (And I say "strongly consistent," never "linearizable" — precision matters here.)

## What got built, and the money shot

There's a working PDP live at the link below, running on a real multi-region DSQL cluster: us-east-1 ⇄ us-west-2, with a witness in us-east-2.

The scene that proves both halves at once: a $2M trade is posted under a valid mandate and Warden returns **allow**, appending a sealed block to the ledger. Then the mandate is revoked. Seconds later the *identical* $2M action is evaluated **in the other region** — and comes back **deny**, citing the just-revoked grant, with `consistent = true`. That cross-region flip is the DSQL property no ordinary Postgres setup gives you. Around it: an SoD deny (a trading agent captures a deal, then tries to settle the very deal it just booked — front office can't be back office, `SOD-FBO-01`), an escalate (over limit, routed to the covering ancestor), and verify → tamper → break on the hash chain, where editing one row turns every seal from that sequence down red.

## Honest boundaries

A judge will spot a hand-wave, so here are the edges, stated plainly. The chain is tamper-*evident*, not tamper-*proof* — it detects edits, it doesn't stop a DB admin with write rights, and locking the app role down to insert-only is on the roadmap, not in this build. The agent is *simulated*: any agent POSTs the same HTTP contract, and here it's a simulated SAP-style agent, with no live ERP integration behind it. The scenario data is fictional ("Global Trading"). Ledger immutability today is convention plus the hash chain; a least-privilege DB role is the next step.

None of that changes the thesis. The data model is the product, the strong-consistency property is the reason it's correct, and the `FOR UPDATE` lock is the reason the property actually holds.

---

Live demo: https://warden-khaki.vercel.app
Repo: https://github.com/vigneshbarani24/warden

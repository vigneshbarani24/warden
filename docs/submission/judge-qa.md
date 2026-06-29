# Warden — judge Q&A prep

Grounded in the actual build. Answers are honest first; where a question exposes a real gap,
the gap is named and then framed at its strongest. Know these cold — the panel is AWS Database
experts and they will probe the consistency and durability claims.

---

**1. Is this real, or a mock?**
The engine, the Aurora DSQL transaction, the hash-chained ledger, and the cross-region revoke are real and run live on the public URL. The *ERP* and the *agent fleet* are simulated — but the governance decisions they produce are real (every simulated action goes through the same `decide()` the SDK exposes). We say this out loud rather than fake an ERP. `lib/engine.ts`, `lib/pdp.ts`, `lib/store-dsql.ts`.

**2. Why Aurora DSQL and not Aurora PostgreSQL Global Database or DynamoDB?**
Warden's promise is "a revoked authority is denied in every region instantly, no stale allow." That needs synchronous, active-active, multi-Region strong consistency **and** a `SELECT … FOR UPDATE` transaction. Aurora PostgreSQL Global secondaries can read slightly stale (replication lag) — a lagging replica could approve a revoked grant. DynamoDB global tables in strong-consistency mode don't support transactions. DSQL is the only AWS-native primitive that gives both. The DB choice *is* the thesis.

**3. The cross-region gap showed ~1.5 seconds — isn't that replication lag?**
No. That number is the HTTP round-trip to *observe* the deny in region B — issue the request, run the decision transaction, return. DSQL's guarantee is zero replication lag *on commit*: the moment the revoke committed in A, it was visible to the next read in B. The 1.5s is request latency, not staleness. We're precise about this because conflating them would be the easy overclaim.

**4. You call the ledger tamper-evident, but the app connects as admin — so it's not actually immutable?**
Correct, and we disclose it in the README. Today append-only is enforced by the hash chain plus convention, not by the database — the app runs as a single admin role. The chain *detects* any after-the-fact edit (the live tamper demo proves it); it doesn't *prevent* a privileged write. The roadmap is a least-privilege app role with `REVOKE UPDATE, DELETE ON ledger` so the database enforces it, with the tamper demo moved to an explicitly-named admin connection. Tamper-**evidence**, stated honestly, beats a false tamper-proof claim.

**5. The demo endpoints are unauthenticated on a public URL — security hole?**
Deliberate, so judges can test freely without credentials. `reset` restores a known-good state, so it's self-healing. In production these would sit behind Vercel deployment protection or auth. It's a demo-scope decision, not an architectural one.

**6. How does the stale-allow race actually get prevented?**
DSQL is snapshot isolation, and plain reads don't participate in conflict detection — so a same-transaction read is necessary but not sufficient. We lock the covering `authority_grants` rows `FOR UPDATE` inside the decision transaction. A concurrent revoke writes one of those rows, so the decision aborts at COMMIT with `40001`, and `withRetry` re-evaluates against the revoked state. We prove the abort live in `scripts/concurrency-proof.ts`.

**7. How does it scale? Throughput?**
The decision is a handful of indexed reads plus two writes (decision + ledger) in one transaction. Contention exists only on the specific grant rows being locked, and only while a revoke is racing a decision — normal traffic doesn't contend. DSQL is active-active, so read/decision load spreads across regional endpoints. Honest limit: we haven't run a formal load test; that's a next step, not a claim.

**8. Why doesn't the LLM decide the verdict — isn't that the point of an AI agent?**
Defensibility requires determinism and auditability; an LLM verdict is neither. So the split is deliberate: the LLM *proposes* actions (the agent) and *compiles* English controls into rules (NL→policy), and the deterministic engine *authorizes*. The "why" in the ledger has to be reproducible. `lib/ai/*` never returns a verdict.

**9. How is this different from Cedar / Bedrock AgentCore Policy / OPA / Cerbos?**
Those are excellent stateless tool-access authorization. Warden is stateful business authority: grants resolved up an org hierarchy, approval-limit escalation to a covering ancestor, segregation of duties over real prior-action history, an `escalate` verdict, strong-consistency global revocation, and a tamper-evident verdict ledger. Cedar's own docs show its amount check as a hardcoded literal; it can't resolve a revocable per-principal limit up a hierarchy. (Full comparison table in the README.)

**10. No foreign keys — how do you keep referential integrity?**
Enforced in app code, in the same transaction as the write. Example: `createGrant` checks the org path exists in `org_units` (or is a descendant) before inserting the grant, inside one transaction — so we never write authority scoped to a non-existent org. `lib/pdp.ts:createGrant`.

**11. What's the weakest part / what breaks first?**
Three honest ones: ledger immutability is convention not DB-enforced (roadmap above); money flows as a JS number into the ledger (fine for whole-dollar demo values, a precision smell for a real SOX record — fix is decimal end-to-end); and it isn't load-tested. None affect the demo's correctness; all are disclosed.

**12. Is any of the data real?**
No. All scenario data is fictional ("Global Trading" / "Meridian Refining Co."), the shape modelled on a real commodity-trading control framework. Any metric shown is illustrative/demo-seeded. No customer data, no real names, no fabricated testimonials.

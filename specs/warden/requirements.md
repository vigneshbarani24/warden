# Warden — Requirements

> Governance layer for enterprise AI agents. A Policy Decision Point (PDP) agents call **before** acting, and a hash-chained audit ledger they write to **after**. H0 Track 2 (Monetizable B2B), Amazon Aurora DSQL.
> Notation: EARS — `WHEN <trigger> THE SYSTEM SHALL <behavior>` / `IF <condition> THEN THE SYSTEM SHALL <behavior>` / `WHILE <state> THE SYSTEM SHALL <behavior>` / ubiquitous `THE SYSTEM SHALL <behavior>`.

## Problem & audience

ERP-native agents (SAP Joule, Oracle, Workday) understand transactional data but not a company's approval chains, segregation-of-duties (SoD) rules, or authority grants. They can take actions valid in the ERP yet illegal in the business, with no defensible record of why. **Audience:** finance and risk operators in regulated enterprises (SOX scope). **Value:** a single PDP any agent calls to get an authoritative `allow | deny | escalate` with a defensible reason, plus a tamper-evident audit trail.

## Glossary

- **Actor / principal** — the human or agent identity an action is attributed to.
- **Authority grant** — a time-bounded, revocable permission for a principal to take an action type within an org scope up to an amount limit.
- **Org unit** — a node in the org hierarchy, addressed by materialized path (e.g. `/root/finance/ap/`).
- **SoD rule** — a policy forbidding one principal from holding conflicting roles on the same resource (e.g. created a vendor and approves its invoice).
- **PDP** — Policy Decision Point: the evaluation endpoint.
- **Verdict** — `allow`, `deny`, or `escalate`.
- **Ledger** — append-only, hash-chained record of every verdict.

## Functional requirements

### FR-1 PDP evaluation
- FR-1.1 — WHEN an agent POSTs a proposed action `{requestId, actor, actionType, resource, amount, context}` THE SYSTEM SHALL return a verdict (`allow | deny | escalate`), a human-readable `reason`, and the ids of the `policy_rules` that fired.
- FR-1.2 — IF the actor holds no active grant for `actionType` at or above the resource's `org_path` THEN THE SYSTEM SHALL return `deny` with reason "no authority".
- FR-1.3 — IF the requested `amount` exceeds the actor's covering grant `approval_limit` THEN THE SYSTEM SHALL return `escalate`, naming the nearest ancestor grant whose limit covers it (or `deny` if none exists).
- FR-1.4 — IF the actor holds a conflicting prior action on the same resource per an active SoD rule THEN THE SYSTEM SHALL return `deny` citing that rule.
- FR-1.5 — WHEN no denial or escalation condition holds THE SYSTEM SHALL return `allow`.
- FR-1.6 — THE SYSTEM SHALL perform the grant/SoD read and the decision+ledger write in a single transaction, so a concurrent conflicting change forces a retry rather than a stale `allow`.
- FR-1.7 — WHEN the same `requestId` is submitted more than once THE SYSTEM SHALL be idempotent (one decision row, one ledger entry).

### FR-2 Authority & revocation
- FR-2.1 — THE SYSTEM SHALL treat a grant as active iff `now()` is within `[valid_from, valid_to)` and `revoked_at IS NULL`.
- FR-2.2 — WHEN an operator revokes a grant THE SYSTEM SHALL set `revoked_at` and make the revocation effective for the very next evaluation in any region.
- FR-2.3 — THE SYSTEM SHALL NOT cache the authority-grant read path.

### FR-3 Audit ledger
- FR-3.1 — WHEN a decision is made THE SYSTEM SHALL append one ledger row hashing the previous hash plus the canonical decision payload.
- FR-3.2 — THE SYSTEM SHALL prevent UPDATE and DELETE on the ledger by the application role (DB-enforced grant).
- FR-3.3 — WHEN `verifyChain` runs THE SYSTEM SHALL recompute each hash from its predecessor and report the first mismatch (seq) or confirm integrity.
- FR-3.4 — IF a ledger row is altered THEN `verifyChain` SHALL report a break at that seq and flag every subsequent row.

### FR-4 Multi-region consistency (the differentiator)
- FR-4.1 — THE SYSTEM SHALL run across two peered DSQL clusters (active-active) plus a witness region.
- FR-4.2 — WHEN a grant is revoked via region A THE SYSTEM SHALL deny an identical subsequent action evaluated via region B, with no stale `allow`.

### FR-5 AI layer (thin; never authoritative)
- FR-5.1 — THE SYSTEM SHALL provide an LLM-driven agent simulator that converts a scenario into real PDP POSTs.
- FR-5.2 — WHEN an operator describes a policy in natural language THE SYSTEM SHALL compile it to a valid `policy_rules.definition` (jsonb) for review before activation.
- FR-5.3 — THE SYSTEM SHALL compute the structured verdict and reason deterministically; any LLM-polished reason SHALL be presentational only and SHALL NOT change the verdict.

### FR-6 API & SDK (shippable)
- FR-6.1 — THE SYSTEM SHALL expose `POST /api/pdp/decide`, `POST /api/grants/:id/revoke`, `GET /api/ledger`, `GET /api/ledger/verify`.
- FR-6.2 — THE SYSTEM SHALL publish a typed SDK exposing a single `decide()` call over the PDP contract.

### FR-7 Decision Inspector UI
- FR-7.1 — THE SYSTEM SHALL present three panes: request feed, Decision Inspector (hero), and ledger chain spine.
- FR-7.2 — WHEN a request row is selected THE SYSTEM SHALL show the verdict, actor, action, resource, amount, reason, fired rule ids, and the evaluated-context snapshot.
- FR-7.3 — WHEN an operator revokes a grant and re-runs the action THE SYSTEM SHALL render the `allow → deny` flip.
- FR-7.4 — WHEN an operator triggers Verify THE SYSTEM SHALL animate a pass down the chain, settling seals green when intact and red from a detected break.

## Non-functional requirements

### NFR-1 Aurora DSQL conformance
- NFR-1.1 — THE SYSTEM SHALL use no foreign keys, sequences-for-PKs, triggers, PL/pgSQL, or extensions; integrity is enforced in the app layer in-transaction.
- NFR-1.2 — THE SYSTEM SHALL generate all PKs as client-side UUIDs.
- NFR-1.3 — WHEN a write transaction fails with `SQLSTATE 40001` THE SYSTEM SHALL retry idempotently with backoff.
- NFR-1.4 — THE SYSTEM SHALL keep any transaction under 3,000 mutated rows and 10 MiB, and under 5 minutes.
- NFR-1.5 — THE SYSTEM SHALL create indexes with `CREATE INDEX ASYNC` and poll `sys.jobs` for validity before relying on them.

### NFR-2 Security
- NFR-2.1 — THE SYSTEM SHALL authenticate to DSQL with IAM tokens only (no stored passwords/keys), via Vercel OIDC → AWS IAM federation.
- NFR-2.2 — THE SYSTEM SHALL run all DB code on the Node runtime (never Edge).

### NFR-3 Design quality
- NFR-3.1 — THE Decision Inspector and ledger chain SHALL be the hero surfaces; no raw admin table is ever the hero.
- NFR-3.2 — THE SYSTEM SHALL be responsive to mobile, show visible keyboard focus, and honor reduced-motion.

### NFR-4 Honesty
- NFR-4.1 — THE SYSTEM SHALL describe the hash chain as tamper-**evident**, not tamper-proof.
- NFR-4.2 — THE SYSTEM SHALL state the agent boundary plainly: any agent calls the PDP contract; the demo uses a simulated SAP agent.

## Out of scope (YAGNI)

Live ERP integration; user management/SSO beyond the demo; full policy-rule editor beyond NL authoring + review; historical analytics dashboards; billing implementation (monetization is narrative only).

## Acceptance (demo definition of done)

A clean $2M approval is allowed and sealed → the approver's grant is revoked → an identical $2M approval evaluated via the other region is denied citing the just-revoked grant → Verify shows the chain intact (green) → a live tamper turns the chain red from the break down.

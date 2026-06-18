# Warden — Tasks

> Atomic, ordered, checkable. Tick boxes as you go. Each phase ends at a verification gate. Single-region (Phases 0–3) is a working fallback; multi-region (Phase 4) is isolated.

## Phase 0 — Provision infra + prove wiring
- [ ] T0.1 Write specs (`requirements.md`, `design.md`, `tasks.md`). ✅ done in this batch.
- [ ] T0.2 Create/confirm v0.app account; submit the hackathon form to claim AWS + v0 credits. *(needs VB)*
- [ ] T0.3 Configure AWS CLI with the hackathon account/credentials. *(needs VB)*
- [ ] T0.4 Provision a single-region DSQL cluster: `aws dsql create-cluster --region <region>`; poll `aws dsql get-cluster`. Record cluster id + endpoint.
- [ ] T0.5 Clone `vercel/aws-dsql-movies-demo` as the wiring baseline; strip movie domain code, keep the OIDC→token→`pg` plumbing.
- [ ] T0.6 Create the Vercel project; link git repo.
- [ ] T0.7 AWS: add Vercel OIDC identity provider; create IAM role with trust policy (Vercel `AssumeRoleWithWebIdentity`) + permissions policy (`dsql:DbConnectAdmin` on cluster ARN). *(needs VB / AWS console)*
- [ ] T0.8 Set Vercel env: `DSQL_ENDPOINT`, `AWS_REGION` (pinned), `AWS_ROLE_ARN`.
- [ ] T0.9 Add `lib/db.ts` (Fluid-correct pool + signer + `withRetry`).
- [ ] **GATE T0.10** Deploy a `GET /api/health` route running `SELECT 1` against DSQL; confirm 200 from the deployed URL with zero stored keys.

## Phase 1 — Schema + migrations
- [ ] T1.1 `scripts/migrate.ts`: run numbered `/db/migrations/*.sql` in order, `40001` retry, DDL one-per-txn.
- [ ] T1.2 `001_tables.sql`: 5 tables, UUID PKs, `jsonb` columns, `unique(request_id)` on `decisions` and `ledger`.
- [ ] T1.3 `002_indexes.sql`: `CREATE INDEX ASYNC` on grants `(principal_id, action_type)`, org `path`, decisions `created_at`, ledger `seq`; poll `sys.jobs` / `sys.wait_for_job`.
- [ ] T1.4 `003_ledger_immutability.sql`: `REVOKE UPDATE, DELETE ON ledger FROM <app_role>`.
- [ ] **GATE T1.5** `pnpm db:migrate` succeeds; tables + valid indexes exist; an UPDATE/DELETE on `ledger` by the app role is rejected.

## Phase 2 — Engine + ledger core
- [ ] T2.1 `lib/ledger.ts`: `canonical`, `linkHash`, `GENESIS`, idempotent `appendDecision`, `verifyChain`.
- [ ] T2.2 `lib/engine.ts`: `evaluate()` — grant resolution, limit/escalate, SoD, allow; deterministic reason + fired rule ids + evaluatedContext.
- [ ] T2.3 Wire engine + ledger into one `withRetry` transaction (decision + append together).
- [ ] T2.4 Unit tests: allow / deny-no-authority / escalate-over-limit / deny-SoD; ledger intact + tampered.
- [ ] T2.5 `scripts/verify-chain.ts` (`pnpm db:verify`).
- [ ] **GATE T2.6** Tests green; `db:verify` reports intact; tampering one row reports a break from that seq down. `pnpm typecheck`/`lint` clean (no `any` in engine/ledger).

## Phase 3 — PDP HTTP contract + SDK
- [ ] T3.1 `POST /api/pdp/decide` (Node runtime).
- [ ] T3.2 `POST /api/grants/[id]/revoke`.
- [ ] T3.3 `GET /api/ledger`, `GET /api/ledger/verify`.
- [ ] T3.4 `packages/sdk/` — `@warden/sdk` with typed `decide()`.
- [ ] **GATE T3.5** `curl` each path returns correct verdicts/data on the deployed URL; SDK round-trip from a script works.

## Phase 4 — Multi-region demo
- [ ] T4.1 Create a peer cluster in a second region + designate witness; peer them.
- [ ] T4.2 Configure a second function region / deployment reading cluster B.
- [ ] T4.3 Cross-region read path for the demo (region A writes, region B reads).
- [ ] **GATE T4.4** Revoke a grant via region A; an identical $2M action evaluated via region B returns `deny` citing the revoked grant, seconds later.

## Phase 5 — Thin AI layer
- [ ] T5.1 `lib/ai/agent.ts`: scenario → PDP POSTs via AI Gateway (`anthropic/claude-sonnet`).
- [ ] T5.2 `lib/ai/policy-author.ts`: NL → candidate `policy_rules.definition` jsonb (`anthropic/claude-haiku`), returned for review.
- [ ] T5.3 (Optional) presentational reason polish; verdict unchanged.
- [ ] **GATE T5.4** Agent run produces real POSTs; an NL rule compiles to valid jsonb and fires correctly; engine remains source of truth.

## Phase 6 — Decision Inspector UI
- [ ] T6.1 v0: scaffold three-pane shell against tokens (`--paper/--ink/--seal/--allow/--deny/--escalate`), Geist Sans/Mono.
- [ ] T6.2 Request feed bound to `decisions`; selection drives the inspector.
- [ ] T6.3 Decision Inspector hero: verdict, actor/action/resource/amount, reason, fired rules, evaluated-context snapshot (mono).
- [ ] T6.4 Authority/Revoke control + Re-run (renders allow→deny flip).
- [ ] T6.5 Ledger chain spine + Verify (pass animation; seals green/red); tamper control (demo role).
- [ ] T6.6 Two motions only; reduced-motion + keyboard focus + mobile.
- [ ] **GATE T6.7** Browser walk on deployed app: golden path → revoke→deny flip → verify green → tamper → red.

## Phase 7 — Seed + demo + submission
- [ ] T7.1 `scripts/seed.ts`: realistic multi-tenant org tree, grants, SoD rules, clean decision history (batched < 3,000 rows/txn).
- [ ] T7.2 Rehearse the demo scene end-to-end on the deployed app.
- [ ] T7.3 Record < 3-min YouTube video (problem → who → why DSQL → working app → revoke beat → tamper beat → DB named).
- [ ] T7.4 Architecture diagram (app ↔ route handlers ↔ DSQL multi-region + witness).
- [ ] T7.5 Screenshots proving DSQL usage (AWS console + Vercel config).
- [ ] T7.6 Submission text: track, DB used, Vercel project link + Team ID.
- [ ] T7.7 One-pager + monetization story (per-decision / per-seat enterprise pricing) + design-partner narrative.
- [ ] T7.8 (Bonus) Publish a build write-up with `#H0Hackathon`.
- [ ] **GATE T7.9** All Devpost deliverables present; demo runs clean twice in a row.

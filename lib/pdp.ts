/**
 * The PDP service layer: the write paths (decide, revoke) and read paths
 * (decisions, ledger) the API and UI call.
 *
 * `decide` runs the grant/SoD read, the engine evaluation, the decision write,
 * and the chained ledger append in ONE retryable transaction. The ledger's
 * unique seq index turns concurrent appends into OCC conflicts that withRetry
 * resolves — so the chain stays gap-free and ordered without a sequence object.
 */
import { randomUUID } from "node:crypto";
import { readWithRetry, withRetry, type DsqlRegion } from "./db";
import { evaluate } from "./engine";
import { DsqlStore } from "./store-dsql";
import { GENESIS, linkHash, verifyChain, type LedgerRow, type VerifyResult } from "./ledger";
import { buildLedgerPayload } from "./payload";
import type { DecisionInput, EvaluationResult, Verdict } from "./types";

/** Map a resource org path to its business tower label, for the views. */
function towerFromPath(path: string): string {
  const seg = path.split("/").filter(Boolean).pop() ?? "";
  const map: Record<string, string> = {
    crude: "Crude Desk",
    products: "Products Desk",
    gas: "Gas Desk",
    risk: "Risk / Middle Office",
    scheduling: "Scheduling",
    ops: "Operations",
    backoffice: "Back Office",
    trading: "Front Office",
    global: "Global",
  };
  return map[seg] ?? seg.toUpperCase();
}

export interface DecideOutput extends EvaluationResult {
  requestId: string;
  /** True when this requestId was already decided and the stored verdict was replayed. */
  idempotentReplay: boolean;
}

export async function decide(input: DecisionInput, region: DsqlRegion = "A"): Promise<DecideOutput> {
  return withRetry(async (client) => {
    const existing = await client.query(
      "SELECT verdict, reason, evaluated_context FROM decisions WHERE request_id = $1",
      [input.requestId],
    );
    const prior = existing.rows[0];
    if (prior) {
      const ctx = prior.evaluated_context ?? {};
      return {
        requestId: input.requestId,
        verdict: prior.verdict as Verdict,
        reason: String(prior.reason),
        firedRuleIds: Array.isArray(ctx.firedRuleIds)
          ? ctx.firedRuleIds.filter((x: unknown): x is string => typeof x === "string")
          : [],
        evaluatedContext: ctx,
        idempotentReplay: true,
      };
    }

    const result = await evaluate(input, new DsqlStore(client));

    await client.query(
      `INSERT INTO decisions
         (id, request_id, actor, action_type, resource, amount, verdict, reason, evaluated_context)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (request_id) DO NOTHING`,
      [
        randomUUID(),
        input.requestId,
        input.actor,
        input.actionType,
        input.resource,
        String(input.amount),
        result.verdict,
        result.reason,
        JSON.stringify({
          ...result.evaluatedContext,
          firedRuleIds: result.firedRuleIds,
          orgPath: input.orgPath,
          tower: towerFromPath(input.orgPath),
          agent: typeof input.context?.agent === "string" ? input.context.agent : null,
        }),
      ],
    );

    const tip = await client.query("SELECT seq, hash FROM ledger ORDER BY seq DESC LIMIT 1");
    const tipRow = tip.rows[0];
    const prevSeq = tipRow ? Number(tipRow.seq) : -1;
    const prevHash = tipRow ? String(tipRow.hash) : GENESIS;
    const seq = prevSeq + 1;
    const payload = buildLedgerPayload(input, result);
    const hash = linkHash(prevHash, payload);

    await client.query(
      `INSERT INTO ledger (id, seq, request_id, prev_hash, payload, hash)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (request_id) DO NOTHING`,
      [randomUUID(), String(seq), input.requestId, prevHash, JSON.stringify(payload), hash],
    );

    return { requestId: input.requestId, ...result, idempotentReplay: false };
  }, 5, region);
}

export async function revokeGrant(
  grantId: string,
  region: DsqlRegion = "A",
): Promise<{ id: string; revokedAt: string }> {
  return withRetry(async (client) => {
    const updated = await client.query(
      "UPDATE authority_grants SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL RETURNING id, revoked_at",
      [grantId],
    );
    const row = updated.rows[0];
    if (row) return { id: String(row.id), revokedAt: String(row.revoked_at) };

    const current = await client.query("SELECT id, revoked_at FROM authority_grants WHERE id = $1", [grantId]);
    const curRow = current.rows[0];
    if (!curRow) throw new Error(`Grant ${grantId} not found`);
    return { id: String(curRow.id), revokedAt: String(curRow.revoked_at) };
  }, 5, region);
}

/**
 * DEMO ONLY: re-arm a revoked grant so the cross-region demo re-runs cleanly.
 * Targets a specific region endpoint (the revoke/re-arm happen on region A; the
 * deny is read from region B to prove strong-consistency global revocation).
 */
export async function reactivateGrant(
  grantId: string,
  region: DsqlRegion = "A",
): Promise<{ id: string }> {
  return withRetry(async (client) => {
    await client.query("UPDATE authority_grants SET revoked_at = NULL WHERE id = $1", [grantId]);
    return { id: grantId };
  }, 5, region);
}

export interface DecisionRow {
  requestId: string;
  actor: string;
  actionType: string;
  resource: string;
  amount: number;
  verdict: Verdict;
  reason: string;
  evaluatedContext: unknown;
  createdAt: string;
}

export async function getRecentDecisions(limit = 50): Promise<DecisionRow[]> {
  const { rows } = await readWithRetry((pool) =>
    pool.query(
      `SELECT request_id, actor, action_type, resource, amount, verdict, reason, evaluated_context, created_at
         FROM decisions ORDER BY created_at DESC LIMIT $1`,
      [limit],
    ),
  );
  return rows.map((r) => ({
    requestId: String(r.request_id),
    actor: String(r.actor),
    actionType: String(r.action_type),
    resource: String(r.resource),
    amount: Number(r.amount),
    verdict: r.verdict as Verdict,
    reason: String(r.reason),
    evaluatedContext: r.evaluated_context,
    createdAt: String(r.created_at),
  }));
}

export interface LedgerView extends LedgerRow {
  requestId: string;
  createdAt: string;
}

export async function getLedger(limit = 200): Promise<LedgerView[]> {
  const { rows } = await readWithRetry((pool) =>
    pool.query(
      `SELECT seq, request_id, prev_hash, payload, hash, created_at
         FROM ledger ORDER BY seq ASC LIMIT $1`,
      [limit],
    ),
  );
  return rows.map((r) => ({
    seq: Number(r.seq),
    prevHash: String(r.prev_hash),
    payload: r.payload as object,
    hash: String(r.hash),
    requestId: String(r.request_id),
    createdAt: String(r.created_at),
  }));
}

export async function verifyLedger(): Promise<VerifyResult> {
  const { rows } = await readWithRetry((pool) =>
    pool.query("SELECT seq, prev_hash, payload, hash FROM ledger ORDER BY seq ASC"),
  );
  const ledger: LedgerRow[] = rows.map((r) => ({
    seq: Number(r.seq),
    prevHash: String(r.prev_hash),
    payload: r.payload as object,
    hash: String(r.hash),
  }));
  return verifyChain(ledger);
}

export interface GrantView {
  id: string;
  principalId: string;
  orgPath: string;
  actionType: string;
  approvalLimit: number;
  validFrom: string;
  validTo: string;
  revokedAt: string | null;
  active: boolean;
}

export async function getGrants(principalId?: string): Promise<GrantView[]> {
  const { rows } = await readWithRetry((pool) =>
    principalId
      ? pool.query(
          `SELECT id, principal_id, org_path, action_type, approval_limit, valid_from, valid_to, revoked_at
             FROM authority_grants WHERE principal_id = $1 ORDER BY org_path`,
          [principalId],
        )
      : pool.query(
          `SELECT id, principal_id, org_path, action_type, approval_limit, valid_from, valid_to, revoked_at
             FROM authority_grants ORDER BY principal_id, org_path`,
        ),
  );
  const now = Date.now();
  return rows.map((r) => {
    const validFrom = new Date(r.valid_from);
    const validTo = new Date(r.valid_to);
    const revokedAt = r.revoked_at ? new Date(r.revoked_at) : null;
    return {
      id: String(r.id),
      principalId: String(r.principal_id),
      orgPath: String(r.org_path),
      actionType: String(r.action_type),
      approvalLimit: Number(r.approval_limit),
      validFrom: validFrom.toISOString(),
      validTo: validTo.toISOString(),
      revokedAt: revokedAt ? revokedAt.toISOString() : null,
      active: !revokedAt && validFrom.getTime() <= now && validTo.getTime() > now,
    };
  });
}

export interface PolicyRuleView {
  id: string;
  ruleType: string;
  code: string;
  conflicting: string[];
  active: boolean;
}

/** The SoD / compliance rules, read straight from the policy_rules table for the Controls view. */
export async function getPolicyRules(): Promise<PolicyRuleView[]> {
  const { rows } = await readWithRetry((pool) =>
    pool.query("SELECT id, rule_type, definition, active FROM policy_rules ORDER BY active DESC, rule_type"),
  );
  return rows.map((r) => {
    const def = (r.definition ?? {}) as { code?: string; conflicting?: string[] };
    return {
      id: String(r.id),
      ruleType: String(r.rule_type),
      code: typeof def.code === "string" ? def.code : String(r.id).slice(0, 8),
      conflicting: Array.isArray(def.conflicting) ? def.conflicting.map(String) : [],
      active: Boolean(r.active),
    };
  });
}

/**
 * DEMO ONLY: corrupt the latest ledger row so verifyChain detects the break.
 * In production the app role lacks UPDATE on the ledger; this uses the admin role
 * to simulate a privileged tamper, exactly as the demo narrates.
 */
export async function tamperLatestLedger(): Promise<{ seq: number }> {
  // Wrapped in withRetry: a concurrent decide() append can conflict this UPDATE at COMMIT
  // (40001). The tamper-then-verify-red step is the demo money shot, so it must not flake.
  return withRetry(async (client) => {
    const { rows } = await client.query("SELECT seq, payload FROM ledger ORDER BY seq DESC LIMIT 1");
    const tip = rows[0];
    if (!tip) throw new Error("ledger is empty");
    await client.query("UPDATE ledger SET payload = $1 WHERE seq = $2", [
      JSON.stringify({ ...tip.payload, amount: "1" }),
      tip.seq,
    ]);
    return { seq: Number(tip.seq) };
  });
}

/** DEMO ONLY: clear decisions + ledger and reactivate every grant, for repeatable runs. */
export async function resetDemo(): Promise<{ ok: boolean }> {
  await withRetry(async (c) => {
    await c.query("DELETE FROM ledger");
    await c.query("DELETE FROM decisions");
    await c.query("UPDATE authority_grants SET revoked_at = NULL");
  });
  return { ok: true };
}

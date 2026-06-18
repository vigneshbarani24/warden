/**
 * The Policy Decision Point evaluation logic.
 *
 * Pure decision logic over the `WardenStore` port — no I/O of its own. The DSQL
 * adapter performs the reads (and the decision + ledger write) inside one
 * transaction, so a concurrent revoke that commits first forces an OCC retry
 * rather than letting a stale read approve a revoked grant.
 *
 * Evaluation order (first match wins):
 *   1. No covering active grant            -> deny  (no authority)
 *   2. No covering grant covers the amount -> escalate
 *   3. Segregation-of-duties conflict      -> deny
 *   4. Otherwise                           -> allow
 */
import type {
  DecisionInput,
  EvaluationResult,
  Grant,
  SodDefinition,
  WardenStore,
} from "./types";

/** A grant covers a resource when its org path is an ancestor-or-equal of the resource path. */
function covers(grant: Grant, resourceOrgPath: string): boolean {
  return resourceOrgPath.startsWith(grant.orgPath);
}

/** Most specific grant = longest matching org path. Assumes a non-empty list. */
function mostSpecific(grants: Grant[]): Grant {
  return grants.reduce((best, g) => (g.orgPath.length > best.orgPath.length ? g : best));
}

export async function evaluate(
  input: DecisionInput,
  store: WardenStore,
  now: Date = new Date(),
): Promise<EvaluationResult> {
  const covering = (await store.activeGrants(input.actor, input.actionType, now)).filter((g) =>
    covers(g, input.orgPath),
  );

  if (covering.length === 0) {
    return {
      verdict: "deny",
      reason: `No active authority grant for ${input.actor} to ${input.actionType} at ${input.orgPath}.`,
      firedRuleIds: [],
      evaluatedContext: {
        activeGrantCount: 0,
        coveringGrantId: null,
        limitChecked: null,
        sodResult: "pass",
      },
    };
  }

  const sufficient = covering.filter((g) => g.approvalLimit >= input.amount);

  if (sufficient.length === 0) {
    const best = covering.reduce((m, g) => (g.approvalLimit > m.approvalLimit ? g : m));
    return {
      verdict: "escalate",
      reason: `Amount ${input.amount} exceeds ${input.actor}'s authority (max limit ${best.approvalLimit} via grant ${best.id}); escalate to a higher approver.`,
      firedRuleIds: [],
      evaluatedContext: {
        activeGrantCount: covering.length,
        coveringGrantId: best.id,
        limitChecked: best.approvalLimit,
        sodResult: "pass",
      },
    };
  }

  const grant = mostSpecific(sufficient);

  const rules = await store.activeSodRules();
  const priorTypes = new Set((await store.priorActions(input.actor, input.resource)).map((p) => p.actionType));

  for (const rule of rules) {
    const def: SodDefinition = rule.definition;
    if (def.type !== "sod" || !def.conflicting.includes(input.actionType)) continue;
    const conflictWith = def.conflicting.find((a) => a !== input.actionType && priorTypes.has(a));
    if (conflictWith) {
      return {
        verdict: "deny",
        reason: `Segregation of duties: ${input.actor} already performed ${conflictWith} on ${input.resource}; cannot also ${input.actionType}.`,
        firedRuleIds: [rule.id],
        evaluatedContext: {
          activeGrantCount: covering.length,
          coveringGrantId: grant.id,
          limitChecked: grant.approvalLimit,
          sodResult: "conflict",
        },
      };
    }
  }

  return {
    verdict: "allow",
    reason: `Authorized: grant ${grant.id} permits ${input.actionType} up to ${grant.approvalLimit} at ${grant.orgPath}.`,
    firedRuleIds: [],
    evaluatedContext: {
      activeGrantCount: covering.length,
      coveringGrantId: grant.id,
      limitChecked: grant.approvalLimit,
      sodResult: "pass",
    },
  };
}

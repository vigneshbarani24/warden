/**
 * Builds the canonical ledger payload for a decision.
 *
 * Every value is a string on purpose: jsonb may normalize numbers and whitespace
 * on round-trip, which would change the canonical serialization and break hash
 * verification. Keeping all leaves as strings makes write-time and verify-time
 * hashing identical. Pure and side-effect-free, so it is unit-testable.
 */
import type { DecisionInput, EvaluationResult } from "./types";

export function buildLedgerPayload(
  input: DecisionInput,
  result: EvaluationResult,
): Record<string, string> {
  return {
    requestId: input.requestId,
    actor: input.actor,
    actionType: input.actionType,
    resource: input.resource,
    amount: String(input.amount),
    orgPath: input.orgPath,
    verdict: result.verdict,
    reason: result.reason,
    firedRuleIds: result.firedRuleIds.join(","),
  };
}

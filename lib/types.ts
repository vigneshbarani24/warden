/**
 * Core domain types for the Warden PDP.
 *
 * The engine depends on the `WardenStore` port, not on a database driver, so the
 * decision logic is unit-testable with an in-memory fake and the DSQL adapter is
 * a swappable implementation detail.
 */

export type Verdict = "allow" | "deny" | "escalate";

export interface DecisionInput {
  /** Caller-supplied id of the proposed action; the idempotency key. */
  requestId: string;
  /** Principal the action is attributed to. */
  actor: string;
  actionType: string;
  /** Resource id the action targets, e.g. "INV-88421". */
  resource: string;
  amount: number;
  /** Org path the resource lives under, e.g. "/root/finance/ap/". Matched against grants. */
  orgPath: string;
  context?: Record<string, unknown>;
}

export interface Grant {
  id: string;
  principalId: string;
  /** Org scope the grant applies to (materialized path, trailing slash). */
  orgPath: string;
  actionType: string;
  approvalLimit: number;
  validFrom: Date;
  validTo: Date;
  /** Non-null once revoked. A grant is active iff in window AND revokedAt is null. */
  revokedAt: Date | null;
}

/** Segregation-of-duties rule: a set of action types that conflict on the same resource. */
export interface SodDefinition {
  type: "sod";
  conflicting: string[];
}

export type PolicyDefinition = SodDefinition;

export interface PolicyRule {
  id: string;
  ruleType: string;
  definition: PolicyDefinition;
  active: boolean;
}

export interface PriorAction {
  actor: string;
  resource: string;
  actionType: string;
}

export interface EvaluatedContext {
  activeGrantCount: number;
  coveringGrantId: string | null;
  limitChecked: number | null;
  sodResult: "pass" | "conflict";
}

export interface EvaluationResult {
  verdict: Verdict;
  reason: string;
  firedRuleIds: string[];
  evaluatedContext: EvaluatedContext;
}

/**
 * Data the engine needs, expressed as a port. Implemented by the DSQL adapter
 * (reads inside the decision transaction) or by an in-memory fake in tests.
 */
export interface WardenStore {
  /** Active grants for a principal + action type, as of `at`. Implementations filter on window + revocation. */
  activeGrants(principalId: string, actionType: string, at: Date): Promise<Grant[]>;
  /**
   * Lock specific grant rows (SELECT ... FOR UPDATE) inside the decision transaction.
   * DSQL is snapshot isolation and plain reads do NOT participate in conflict detection,
   * so a concurrent revoke would not force a retry. Locking the grants the decision
   * depends on promotes them into the write/conflict set: a concurrent revoke then
   * conflicts at COMMIT (40001) and withRetry re-evaluates against the revoked state.
   */
  lockGrants(ids: string[]): Promise<void>;
  activeSodRules(): Promise<PolicyRule[]>;
  /** Prior decided actions by this actor on this resource. */
  priorActions(actor: string, resource: string): Promise<PriorAction[]>;
}

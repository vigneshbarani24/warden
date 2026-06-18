/**
 * DSQL implementation of the WardenStore port. All reads run on the transaction
 * client passed in, so they share the decision transaction's snapshot — a
 * concurrent revoke that commits first forces an OCC retry rather than a stale read.
 */
import type { PoolClient } from "pg";
import type { Grant, PolicyRule, PriorAction, WardenStore } from "./types";

export class DsqlStore implements WardenStore {
  constructor(private readonly client: PoolClient) {}

  async activeGrants(principalId: string, actionType: string, at: Date): Promise<Grant[]> {
    const { rows } = await this.client.query(
      `SELECT id, principal_id, org_path, action_type, approval_limit, valid_from, valid_to, revoked_at
         FROM authority_grants
        WHERE principal_id = $1
          AND action_type = $2
          AND valid_from <= $3
          AND valid_to   >  $3
          AND revoked_at IS NULL`,
      [principalId, actionType, at],
    );
    return rows.map((r) => ({
      id: String(r.id),
      principalId: String(r.principal_id),
      orgPath: String(r.org_path),
      actionType: String(r.action_type),
      approvalLimit: Number(r.approval_limit),
      validFrom: new Date(r.valid_from),
      validTo: new Date(r.valid_to),
      revokedAt: r.revoked_at ? new Date(r.revoked_at) : null,
    }));
  }

  async activeSodRules(): Promise<PolicyRule[]> {
    const { rows } = await this.client.query(
      `SELECT id, rule_type, definition, active
         FROM policy_rules
        WHERE active = true AND rule_type = 'sod'`,
    );
    return rows.map((r) => ({
      id: String(r.id),
      ruleType: String(r.rule_type),
      definition: r.definition, // jsonb -> { type: 'sod', conflicting: [...] }
      active: Boolean(r.active),
    }));
  }

  /** Prior actions the actor actually performed (allowed) on this resource. */
  async priorActions(actor: string, resource: string): Promise<PriorAction[]> {
    const { rows } = await this.client.query(
      `SELECT actor, resource, action_type
         FROM decisions
        WHERE actor = $1 AND resource = $2 AND verdict = 'allow'`,
      [actor, resource],
    );
    return rows.map((r) => ({
      actor: String(r.actor),
      resource: String(r.resource),
      actionType: String(r.action_type),
    }));
  }
}

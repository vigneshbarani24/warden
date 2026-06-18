/**
 * Dependency-free validation for the PDP HTTP contract. Pure and unit-testable;
 * keeps the route handlers thin and avoids a schema-library version dependency.
 */
import type { DecisionInput } from "./types";

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function parseDecisionInput(body: unknown): ParseResult<DecisionInput> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "body must be a JSON object" };
  }
  const b = body as Record<string, unknown>;
  const str = (k: string): string | null =>
    typeof b[k] === "string" && (b[k] as string).length > 0 ? (b[k] as string) : null;

  const requestId = str("requestId");
  const actor = str("actor");
  const actionType = str("actionType");
  const resource = str("resource");
  const orgPath = str("orgPath");
  if (!requestId) return { ok: false, error: "requestId is required" };
  if (!actor) return { ok: false, error: "actor is required" };
  if (!actionType) return { ok: false, error: "actionType is required" };
  if (!resource) return { ok: false, error: "resource is required" };
  if (!orgPath) return { ok: false, error: "orgPath is required" };

  const amount = b.amount;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
    return { ok: false, error: "amount must be a non-negative number" };
  }

  const context =
    typeof b.context === "object" && b.context !== null
      ? (b.context as Record<string, unknown>)
      : undefined;

  return { ok: true, value: { requestId, actor, actionType, resource, orgPath, amount, context } };
}

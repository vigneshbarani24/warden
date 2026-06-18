import { describe, it, expect } from "vitest";
import { evaluate } from "../lib/engine";
import type { DecisionInput, Grant, PolicyRule, PriorAction, WardenStore } from "../lib/types";

const NOW = new Date("2026-06-18T12:00:00Z");

function grant(partial: Partial<Grant> & Pick<Grant, "orgPath" | "approvalLimit">): Grant {
  return {
    id: partial.id ?? "g1",
    principalId: partial.principalId ?? "priya",
    actionType: partial.actionType ?? "approve_payment",
    validFrom: partial.validFrom ?? new Date("2026-01-01T00:00:00Z"),
    validTo: partial.validTo ?? new Date("2027-01-01T00:00:00Z"),
    revokedAt: partial.revokedAt ?? null,
    orgPath: partial.orgPath,
    approvalLimit: partial.approvalLimit,
  };
}

function makeStore(opts: {
  grants?: Grant[];
  rules?: PolicyRule[];
  priors?: PriorAction[];
}): WardenStore {
  return {
    activeGrants: async (principalId, actionType) =>
      (opts.grants ?? []).filter(
        (g) => g.principalId === principalId && g.actionType === actionType && g.revokedAt === null,
      ),
    activeSodRules: async () => opts.rules ?? [],
    priorActions: async () => opts.priors ?? [],
  };
}

const baseInput: DecisionInput = {
  requestId: "req-1",
  actor: "priya",
  actionType: "approve_payment",
  resource: "INV-88421",
  amount: 50_000,
  orgPath: "/root/finance/ap/",
};

describe("evaluate", () => {
  it("allows when a covering grant authorizes within limit", async () => {
    const store = makeStore({
      grants: [grant({ orgPath: "/root/finance/", approvalLimit: 1_000_000 })],
    });
    const r = await evaluate(baseInput, store, NOW);
    expect(r.verdict).toBe("allow");
    expect(r.evaluatedContext.coveringGrantId).toBe("g1");
  });

  it("denies when the actor has no grant covering the resource path", async () => {
    const store = makeStore({
      grants: [grant({ orgPath: "/root/hr/", approvalLimit: 1_000_000 })],
    });
    const r = await evaluate(baseInput, store, NOW);
    expect(r.verdict).toBe("deny");
    expect(r.reason).toMatch(/no active authority/i);
  });

  it("escalates when the amount exceeds every covering grant's limit", async () => {
    const store = makeStore({
      grants: [grant({ orgPath: "/root/finance/ap/", approvalLimit: 10_000 })],
    });
    const r = await evaluate({ ...baseInput, amount: 2_000_000 }, store, NOW);
    expect(r.verdict).toBe("escalate");
    expect(r.evaluatedContext.limitChecked).toBe(10_000);
  });

  it("allows under a broader high-limit grant even if a tighter grant is too low", async () => {
    const store = makeStore({
      grants: [
        grant({ id: "tight", orgPath: "/root/finance/ap/", approvalLimit: 10_000 }),
        grant({ id: "broad", orgPath: "/root/finance/", approvalLimit: 5_000_000 }),
      ],
    });
    const r = await evaluate({ ...baseInput, amount: 2_000_000 }, store, NOW);
    expect(r.verdict).toBe("allow");
    expect(r.evaluatedContext.coveringGrantId).toBe("broad");
  });

  it("denies on a segregation-of-duties conflict and names the rule", async () => {
    const store = makeStore({
      grants: [grant({ orgPath: "/root/finance/", approvalLimit: 1_000_000 })],
      rules: [
        {
          id: "SOD-07",
          ruleType: "sod",
          active: true,
          definition: { type: "sod", conflicting: ["created_vendor", "approve_payment"] },
        },
      ],
      priors: [{ actor: "priya", resource: "INV-88421", actionType: "created_vendor" }],
    });
    const r = await evaluate(baseInput, store, NOW);
    expect(r.verdict).toBe("deny");
    expect(r.firedRuleIds).toContain("SOD-07");
    expect(r.evaluatedContext.sodResult).toBe("conflict");
  });

  it("treats a revoked grant as absent (deny no authority)", async () => {
    const store = makeStore({
      grants: [
        grant({ orgPath: "/root/finance/", approvalLimit: 1_000_000, revokedAt: new Date("2026-06-18T11:00:00Z") }),
      ],
    });
    const r = await evaluate(baseInput, store, NOW);
    expect(r.verdict).toBe("deny");
  });
});

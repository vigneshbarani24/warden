import { describe, it, expect } from "vitest";
import { buildLedgerPayload } from "../lib/payload";
import { GENESIS, linkHash } from "../lib/ledger";
import type { DecisionInput, EvaluationResult } from "../lib/types";

const input: DecisionInput = {
  requestId: "r1",
  actor: "priya",
  actionType: "approve_payment",
  resource: "INV-88421",
  amount: 2_000_000,
  orgPath: "/root/finance/",
};

const result: EvaluationResult = {
  verdict: "deny",
  reason: "authority revoked",
  firedRuleIds: ["LIMIT-02", "SOD-07"],
  evaluatedContext: { activeGrantCount: 0, coveringGrantId: null, limitChecked: null, sodResult: "pass" },
};

describe("buildLedgerPayload", () => {
  it("produces an all-string payload", () => {
    for (const value of Object.values(buildLedgerPayload(input, result))) {
      expect(typeof value).toBe("string");
    }
  });

  it("serializes the amount as a string", () => {
    expect(buildLedgerPayload(input, result).amount).toBe("2000000");
  });

  it("hashes identically after a jsonb-style round-trip", () => {
    const payload = buildLedgerPayload(input, result);
    const roundTripped = JSON.parse(JSON.stringify(payload));
    expect(linkHash(GENESIS, roundTripped)).toBe(linkHash(GENESIS, payload));
  });
});

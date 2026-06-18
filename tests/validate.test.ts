import { describe, it, expect } from "vitest";
import { parseDecisionInput } from "../lib/validate";

const valid = {
  requestId: "r1",
  actor: "priya",
  actionType: "approve_payment",
  resource: "INV-1",
  amount: 50_000,
  orgPath: "/root/finance/",
};

describe("parseDecisionInput", () => {
  it("accepts a well-formed input", () => {
    const r = parseDecisionInput(valid);
    expect(r.ok).toBe(true);
  });

  it("rejects a non-object body", () => {
    expect(parseDecisionInput(null).ok).toBe(false);
    expect(parseDecisionInput("nope").ok).toBe(false);
  });

  it("rejects a missing required field", () => {
    const rest = {
      requestId: "r1",
      actionType: "approve_payment",
      resource: "INV-1",
      amount: 50_000,
      orgPath: "/root/finance/",
    };
    expect(parseDecisionInput(rest).ok).toBe(false);
  });

  it("rejects a negative or non-numeric amount", () => {
    expect(parseDecisionInput({ ...valid, amount: -1 }).ok).toBe(false);
    expect(parseDecisionInput({ ...valid, amount: "50000" }).ok).toBe(false);
  });
});

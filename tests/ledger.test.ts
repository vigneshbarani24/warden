import { describe, it, expect } from "vitest";
import { GENESIS, canonical, linkHash, verifyChain, type LedgerRow } from "../lib/ledger";

function buildChain(payloads: object[]): LedgerRow[] {
  const rows: LedgerRow[] = [];
  let prev = GENESIS;
  payloads.forEach((payload, i) => {
    const hash = linkHash(prev, payload);
    rows.push({ seq: i, prevHash: prev, payload, hash });
    prev = hash;
  });
  return rows;
}

describe("canonical", () => {
  it("produces identical output regardless of key order", () => {
    expect(canonical({ a: 1, b: 2 })).toBe(canonical({ b: 2, a: 1 }));
  });

  it("sorts keys recursively in nested structures", () => {
    expect(canonical({ x: { c: 3, a: 1 }, y: [1, 2] })).toBe('{"x":{"a":1,"c":3},"y":[1,2]}');
  });
});

describe("verifyChain", () => {
  it("reports intact for a correctly linked chain", () => {
    const rows = buildChain([{ v: "allow" }, { v: "deny" }, { v: "escalate" }]);
    expect(verifyChain(rows)).toEqual({ ok: true });
  });

  it("detects a tampered payload at its seq", () => {
    const rows = buildChain([{ v: "allow" }, { v: "deny" }, { v: "escalate" }]);
    // Edit row seq 1's payload without recomputing its stored hash.
    rows[1] = { ...rows[1]!, payload: { v: "allow" } };
    expect(verifyChain(rows)).toEqual({ ok: false, breakAtSeq: 1 });
  });

  it("detects a broken prev_hash link", () => {
    const rows = buildChain([{ v: "a" }, { v: "b" }]);
    rows[1] = { ...rows[1]!, prevHash: GENESIS };
    expect(verifyChain(rows)).toEqual({ ok: false, breakAtSeq: 1 });
  });
});

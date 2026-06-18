/**
 * Hash-chained audit ledger primitives.
 *
 * Tamper-EVIDENCE, not tamper-prevention: the chain lets you detect any
 * after-the-fact edit; it does not stop a writer with row-level access.
 * Immutability is enforced at the DB by revoking UPDATE/DELETE from the app role.
 */
import { createHash } from "node:crypto";

export const GENESIS = "0".repeat(64);

/**
 * Canonical JSON with stable (sorted) key order, so the same logical payload
 * always serializes — and therefore hashes — identically.
 */
export function canonical(obj: unknown): string {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(canonical).join(",")}]`;
  const record = obj as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(record[k])}`).join(",")}}`;
}

/** Each link hashes the previous hash concatenated with the canonical payload. */
export function linkHash(prevHash: string, payload: object): string {
  return createHash("sha256").update(prevHash).update(canonical(payload)).digest("hex");
}

export interface LedgerRow {
  seq: number;
  prevHash: string;
  payload: object;
  hash: string;
}

export type VerifyResult = { ok: true } | { ok: false; breakAtSeq: number };

/**
 * Walk rows in seq order, recomputing each hash from its predecessor.
 * Returns the first seq where the stored prevHash or hash disagrees with the
 * recomputed value (a tampered payload, broken link, or edited hash).
 */
export function verifyChain(rows: LedgerRow[]): VerifyResult {
  const ordered = [...rows].sort((a, b) => a.seq - b.seq);
  let prev = GENESIS;
  for (const row of ordered) {
    const expected = linkHash(prev, row.payload);
    if (row.prevHash !== prev || row.hash !== expected) {
      return { ok: false, breakAtSeq: row.seq };
    }
    prev = row.hash;
  }
  return { ok: true };
}

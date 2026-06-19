/**
 * Browser-side typed client for the Warden API. Type-only imports of the server
 * types (erased at build) keep the `pg`/AWS server code out of the client bundle.
 */
import type { DecisionRow, LedgerView, GrantView, DecideOutput } from "./pdp";
import type { VerifyResult } from "./ledger";
import type { DecisionInput } from "./types";

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return (await res.json()) as T;
}

const post = (path: string, body?: unknown): Promise<Response> =>
  fetch(path, {
    method: "POST",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

export const api = {
  decisions: () => fetch("/api/decisions").then((r) => unwrap<DecisionRow[]>(r)),
  ledger: () => fetch("/api/ledger").then((r) => unwrap<LedgerView[]>(r)),
  verify: () => fetch("/api/ledger/verify").then((r) => unwrap<VerifyResult>(r)),
  grants: (principal: string) =>
    fetch(`/api/grants?principal=${encodeURIComponent(principal)}`).then((r) => unwrap<GrantView[]>(r)),
  decide: (input: DecisionInput) => post("/api/pdp/decide", input).then((r) => unwrap<DecideOutput>(r)),
  revoke: (id: string) =>
    post(`/api/grants/${id}/revoke`).then((r) => unwrap<{ id: string; revokedAt: string }>(r)),
  tamper: () => post("/api/demo/tamper").then((r) => unwrap<{ seq: number }>(r)),
  reset: () => post("/api/demo/reset").then((r) => unwrap<{ ok: boolean }>(r)),
};

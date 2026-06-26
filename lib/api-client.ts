/**
 * Browser-side typed client for the Warden API. Type-only imports of the server
 * types (erased at build) keep the `pg`/AWS server code out of the client bundle.
 */
import type { DecisionRow, LedgerView, GrantView, DecideOutput, PolicyRuleView } from "./pdp";
import type { VerifyResult } from "./ledger";
import type { CreateGrantInput, DecisionInput, CrossRegionResult } from "./types";

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
  allGrants: () => fetch("/api/grants").then((r) => unwrap<GrantView[]>(r)),
  policies: () => fetch("/api/policies").then((r) => unwrap<PolicyRuleView[]>(r)),
  decide: (input: DecisionInput) => post("/api/pdp/decide", input).then((r) => unwrap<DecideOutput>(r)),
  revoke: (id: string) =>
    post(`/api/grants/${id}/revoke`).then((r) => unwrap<{ id: string; revokedAt: string }>(r)),
  createGrant: (input: CreateGrantInput) => post("/api/grants", input).then((r) => unwrap<GrantView>(r)),
  createPolicy: (def: { code: string; conflicting: string[] }) =>
    post("/api/policies", def).then((r) => unwrap<PolicyRuleView>(r)),
  togglePolicy: (id: string, active: boolean) =>
    post(`/api/policies/${id}/toggle`, { active }).then((r) => unwrap<{ id: string; active: boolean }>(r)),
  // /api/policies/author is built by another agent; this just wires the client call.
  authorPolicy: (text: string) => post("/api/policies/author", { text }).then((r) => unwrap<PolicyRuleView>(r)),
  tamper: () => post("/api/demo/tamper").then((r) => unwrap<{ seq: number }>(r)),
  reset: () => post("/api/demo/reset").then((r) => unwrap<{ ok: boolean }>(r)),
  runFleet: (count = 12) => post(`/api/demo/run-agents?count=${count}`).then((r) => unwrap<{ count: number }>(r)),
  crossRegion: () => post("/api/demo/cross-region").then((r) => unwrap<CrossRegionResult>(r)),
};

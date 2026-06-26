/**
 * The ERP agent's tools. Each tool is Warden-gated: before any action "happens"
 * it calls the deterministic PDP, and proceeds ONLY on an `allow` verdict.
 *
 * The LLM never decides a verdict. It chooses which tool to call with what args;
 * Warden's decide() is the source of truth. A deny/escalate halts the action —
 * the mock execution lives strictly inside the allow branch.
 */
import { randomUUID } from "node:crypto";
import { tool } from "ai";
import { z } from "zod";
import { decide } from "@/lib/pdp";

const ACTOR = "maya.chen";
const ORG_PATH = "/global/trading/crude/";
const AGENT_LABEL = "Crude Desk Agent";

const actionInput = z.object({
  resource: z.string().describe("The deal or document id the action targets, e.g. DEAL-CR-9001."),
  amount: z.number().describe("The notional amount of the action in USD."),
});

/** Gate one proposed action through Warden, then mock-execute only on allow. */
async function gatedExecute(actionType: string, resource: string, amount: number) {
  const verdict = await decide({
    requestId: randomUUID(),
    actor: ACTOR,
    actionType,
    resource,
    amount,
    orgPath: ORG_PATH,
    context: { agent: AGENT_LABEL },
  });

  if (verdict.verdict !== "allow") {
    return {
      executed: false,
      verdict: verdict.verdict,
      reason: verdict.reason,
      firedRuleIds: verdict.firedRuleIds,
      resource,
      amount,
    };
  }

  // Allow branch: this is where the action actually "happens" (mocked — no real ERP).
  return {
    executed: true,
    verdict: "allow" as const,
    reason: verdict.reason,
    firedRuleIds: verdict.firedRuleIds,
    resource,
    amount,
  };
}

export const captureTrade = tool({
  description:
    "Capture (book) a new crude trade in the ERP. Warden authorizes this against the desk's capture authority and limit before it is booked.",
  inputSchema: actionInput,
  execute: async ({ resource, amount }) => gatedExecute("capture_trade", resource, amount),
});

export const approveSettlement = tool({
  description:
    "Approve settlement on an existing crude deal. Warden checks segregation-of-duties (the same agent cannot capture and then settle the same deal) before it is approved.",
  inputSchema: actionInput,
  execute: async ({ resource, amount }) => gatedExecute("approve_settlement", resource, amount),
});

export const approvePayment = tool({
  description:
    "Approve a payment against a crude deal. Warden authorizes this against the desk's payment authority and limit before it is released.",
  inputSchema: actionInput,
  execute: async ({ resource, amount }) => gatedExecute("approve_payment", resource, amount),
});

export const erpTools = { captureTrade, approveSettlement, approvePayment };

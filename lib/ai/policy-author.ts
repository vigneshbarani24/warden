/**
 * NL→policy authoring. The LLM ONLY compiles an English segregation-of-duties control
 * into a pair of conflicting action types — it never decides a verdict. Warden's
 * deterministic engine then enforces the compiled rule. The LLM output is a typed,
 * schema-constrained object (AI SDK v7 Output.object), so a malformed compilation
 * can't slip through; createPolicyRule persists it as a JSONB SoD rule.
 */
import { generateText, Output } from "ai";
import { z } from "zod";
import { FAST_MODEL } from "./model";
import { createPolicyRule, type PolicyRuleView } from "@/lib/pdp";
import type { DsqlRegion } from "@/lib/db";

/** The known action verbs the engine recognises; the LLM must pick the conflicting pair from this set. */
const KNOWN_ACTION_TYPES = [
  "capture_trade",
  "approve_settlement",
  "approve_confirmation",
  "approve_counterparty",
  "override_credit_limit",
  "approve_payment",
  "approve_invoice",
] as const;

const compiledPolicySchema = z.object({
  code: z.string().describe("short uppercase code like SOD-XXX-NN"),
  conflicting: z
    .array(z.string())
    .length(2)
    .describe("the two conflicting actionType verbs from the known set"),
});

/**
 * Compile an English SoD control into a conflicting-action pair and persist it as a rule.
 * Returns the created PolicyRuleView. Throws if the LLM compilation fails or the text is unusable.
 */
export async function authorPolicy(text: string, region: DsqlRegion = "A"): Promise<PolicyRuleView> {
  const result = await generateText({
    model: FAST_MODEL,
    output: Output.object({ schema: compiledPolicySchema }),
    prompt:
      "Compile this segregation-of-duties control into a pair of conflicting action types. " +
      `Known action types: ${KNOWN_ACTION_TYPES.join(", ")}. ` +
      `Control: "${text}"`,
  });

  const { code, conflicting } = result.output;
  return createPolicyRule({ type: "sod", code, conflicting }, region);
}

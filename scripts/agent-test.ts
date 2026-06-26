/**
 * Live end-to-end test of the Warden-gated LLM agent: a real model (via the AI
 * Gateway) reasons, calls the gated ERP tools, and Warden's decide() governs each.
 * Proves the chain: gateway -> tool-calling -> gatedExecute -> decide() -> verdict.
 *
 *   npx tsx scripts/agent-test.ts
 */
import "dotenv/config";
import { generateText, stepCountIs } from "ai";
import { AGENT_MODEL } from "../lib/ai/model";
import { erpTools } from "../lib/tools/erp-tools";

async function run(label: string, prompt: string): Promise<void> {
  console.log(`\n=== ${label} ===\n> ${prompt}`);
  const r = (await generateText({
    model: AGENT_MODEL,
    tools: erpTools,
    stopWhen: stepCountIs(5),
    prompt,
  })) as unknown as {
    text: string;
    steps?: Array<{
      toolCalls?: Array<{ toolName: string; input?: unknown; args?: unknown }>;
      toolResults?: Array<{ output?: unknown; result?: unknown }>;
    }>;
  };
  for (const s of r.steps ?? []) {
    for (const c of s.toolCalls ?? []) console.log("  CALL  ", c.toolName, JSON.stringify(c.input ?? c.args ?? {}));
    for (const t of s.toolResults ?? []) console.log("  WARDEN", JSON.stringify(t.output ?? t.result ?? t));
  }
  console.log("  agent:", (r.text || "").replace(/\s+/g, " ").slice(0, 240));
}

async function main(): Promise<void> {
  // 1. capture a deal within the mandate -> allow, agent proceeds
  await run("capture (expect allow)", "Capture a $4,200,000 crude trade for deal DEAL-CR-TEST1.");
  // 2. settle the SAME deal -> deny SOD-FBO-01 (front office can't be back office)
  await run("settle own deal (expect deny SOD-FBO-01)", "Now settle deal DEAL-CR-TEST1 for $4,200,000.");
  // 3. capture over the $5M mandate -> escalate
  await run("over-limit (expect escalate)", "Capture a $6,000,000 crude trade for deal DEAL-CR-TEST2.");
  process.exit(0);
}

main().catch((e: unknown) => {
  console.error("agent-test failed:", e);
  process.exit(1);
});

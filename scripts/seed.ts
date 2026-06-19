/**
 * Seed the demo world: a global hydrocarbon trading operation (fictional
 * "Global Trading"), mirroring the real commodity-trading control framework —
 * trader mandates, position/credit/deal limits, and front/middle/back-office
 * segregation of duties. Names/values are fictional; the SHAPE is authentic
 * (RightAngle-style deal lifecycle; the Barings/SocGen control model).
 *
 *   npm run seed
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { getPool, withRetry } from "../lib/db";
import { decide } from "../lib/pdp";

const LONDON_GAS_MANDATE = "11111111-1111-4111-8111-111111111111"; // fixed id — the revoke demo
const FROM = "2026-01-01T00:00:00Z";
const TO = "2027-01-01T00:00:00Z";

const ORG: Array<[string, string, string]> = [
  ["/global/", "Global Trading", "firm"],
  ["/global/trading/", "Front Office — Trading", "division"],
  ["/global/trading/crude/", "Crude Desk", "desk"],
  ["/global/trading/products/", "Refined Products Desk", "desk"],
  ["/global/trading/gas/", "Natural Gas Desk", "desk"],
  ["/global/risk/", "Middle Office — Risk", "division"],
  ["/global/ops/", "Operations", "division"],
  ["/global/ops/scheduling/", "Scheduling", "team"],
  ["/global/backoffice/", "Back Office — Settlements", "division"],
];

// [id, principal, orgPath, actionType, approvalLimit]
const GRANTS: Array<[string, string, string, string, string]> = [
  // Front office — trader mandates (desk-scoped)
  [randomUUID(), "maya.chen", "/global/trading/crude/", "capture_trade", "5000000"],
  [randomUUID(), "maya.chen", "/global/trading/crude/", "approve_settlement", "5000000"], // enables the SoD demo
  [randomUUID(), "raj.patel", "/global/trading/products/", "capture_trade", "2000000"],
  [LONDON_GAS_MANDATE, "liam.obrien", "/global/trading/gas/", "capture_trade", "3000000"], // the revoke demo
  // Desk head — broad approval authority across the front office
  [randomUUID(), "dana.kessler", "/global/trading/", "approve_settlement", "50000000"],
  [randomUUID(), "dana.kessler", "/global/trading/", "approve_confirmation", "50000000"],
  // Back office — settlement authority firm-wide, but NO trade capture
  [randomUUID(), "sam.rivera", "/global/trading/", "approve_settlement", "10000000"],
  // Middle office — counterparty onboarding (independent of trading)
  [randomUUID(), "nadia.haddad", "/global/", "approve_counterparty", "0"],
  // CRO — escalation ceiling
  [randomUUID(), "victor.hale", "/global/", "override_credit_limit", "250000000"],
  [randomUUID(), "victor.hale", "/global/", "approve_settlement", "250000000"],
];

// [code, conflicting action pair]
const RULES: Array<[string, string[]]> = [
  ["SOD-FBO-01", ["capture_trade", "approve_settlement"]], // front/back wall — the Leeson rule
  ["SOD-DEAL-02", ["capture_trade", "approve_confirmation"]], // can't confirm your own deal
  ["SOD-CPTY-03", ["approve_counterparty", "capture_trade"]], // onboard vs trade the counterparty
  ["SOD-CREDIT-04", ["override_credit_limit", "capture_trade"]], // self-override credit to fit a trade
];

async function main(): Promise<void> {
  await withRetry(async (c) => {
    for (const t of ["ledger", "decisions", "policy_rules", "authority_grants", "org_units"]) {
      await c.query(`DELETE FROM ${t}`);
    }
  });

  await withRetry(async (c) => {
    for (const [path, name, unitType] of ORG) {
      await c.query("INSERT INTO org_units (id, path, name, unit_type) VALUES (gen_random_uuid(), $1, $2, $3)", [
        path,
        name,
        unitType,
      ]);
    }
  });

  await withRetry(async (c) => {
    for (const [id, principal, orgPath, action, limit] of GRANTS) {
      await c.query(
        `INSERT INTO authority_grants (id, principal_id, org_path, action_type, approval_limit, valid_from, valid_to, revoked_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,NULL)`,
        [id, principal, orgPath, action, limit, FROM, TO],
      );
    }
  });

  await withRetry(async (c) => {
    for (const [code, conflicting] of RULES) {
      await c.query(
        "INSERT INTO policy_rules (id, rule_type, definition, active) VALUES (gen_random_uuid(), 'sod', $1, true)",
        [JSON.stringify({ type: "sod", code, conflicting })],
      );
    }
  });

  // Starter agentic decisions across the trade lifecycle.
  const run = (actor: string, agent: string, actionType: string, resource: string, amount: number, orgPath: string) =>
    decide({ requestId: randomUUID(), actor, actionType, resource, amount, orgPath, context: { agent } });

  await run("maya.chen", "Crude Desk Agent", "capture_trade", "DEAL-CR-8801", 4_200_000, "/global/trading/crude/"); // allow
  await run("raj.patel", "Products Desk Agent", "capture_trade", "DEAL-PR-5520", 2_500_000, "/global/trading/products/"); // escalate (> $2M)
  await run("maya.chen", "Settlement Agent", "approve_settlement", "DEAL-CR-8801", 4_200_000, "/global/trading/crude/"); // deny SOD-FBO-01 (settling own captured deal)
  await run("sam.rivera", "Settlement Agent", "approve_settlement", "DEAL-CR-8801", 4_200_000, "/global/trading/crude/"); // allow (back office, no conflict)
  await run("nadia.haddad", "Onboarding Agent", "approve_counterparty", "CPTY-NORDIC-OIL", 0, "/global/"); // allow
  await run("gas-desk-agent", "Gas Desk Agent", "capture_trade", "DEAL-NG-4410", 900_000, "/global/trading/gas/"); // deny (agent has no mandate)
  await run("liam.obrien", "Gas Desk Agent", "capture_trade", "DEAL-NG-7702", 1_500_000, "/global/trading/gas/"); // allow (the mandate to be revoked)

  console.log("Seeded Global Trading: 9 org units, 10 mandates, 4 SoD rules, 7 agentic decisions across the trade lifecycle.");
  console.log(`London gas-desk mandate id (revoke for the demo): ${LONDON_GAS_MANDATE}`);
  await (await getPool()).end();
}

main().catch((e: unknown) => {
  console.error("Seed failed:", e);
  process.exit(1);
});

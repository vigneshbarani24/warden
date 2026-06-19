/**
 * Seed the demo world for "Meridian Refining Co." (fictional) — a finance
 * operation run across BPO towers, mirroring the SHAPE of a real outsourcing
 * Schedule A (Roles & Responsibilities Matrix + Segregation-of-Duty controls).
 * All names/values are fictional.
 *
 *   npm run seed
 *
 * Seeds: org towers, an R&R-matrix of authority grants, SoD policy rules, and a
 * starter stream of agentic decisions across towers (allow / escalate / deny).
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { getPool, withRetry } from "../lib/db";
import { decide } from "../lib/pdp";

const PRIYA_GRANT = "11111111-1111-4111-8111-111111111111"; // fixed id so the demo can revoke it
const FROM = "2026-01-01T00:00:00Z";
const TO = "2027-01-01T00:00:00Z";

const ORG: Array<[string, string, string]> = [
  ["/root/", "Meridian Refining Co.", "company"],
  ["/root/finance/", "Finance Operations", "division"],
  ["/root/finance/p2p/", "Procure-to-Pay", "tower"],
  ["/root/finance/o2c/", "Order-to-Cash", "tower"],
  ["/root/finance/mdm/", "Master Reference Data", "tower"],
  ["/root/finance/te/", "Travel & Expense", "tower"],
  ["/root/finance/rtr/", "Record-to-Report", "tower"],
  ["/root/finance/kyc/", "Know Your Counterparty", "tower"],
];

// [id, principal, orgPath, actionType, approvalLimit]
const GRANTS: Array<[string, string, string, string, string]> = [
  [PRIYA_GRANT, "priya.nair", "/root/finance/p2p/", "approve_payment", "5000000"],
  [randomUUID(), "marcus.cole", "/root/finance/", "approve_payment", "20000000"],
  [randomUUID(), "elena.vasquez", "/root/", "approve_payment", "100000000"],
  [randomUUID(), "dan.ortiz", "/root/finance/p2p/", "create_vendor", "0"],
  [randomUUID(), "dan.ortiz", "/root/finance/p2p/", "approve_vendor_invoice", "1000000"],
  [randomUUID(), "leo.tanaka", "/root/finance/mdm/", "change_vendor_bank", "0"],
  [randomUUID(), "leo.tanaka", "/root/finance/mdm/", "update_master_data", "0"],
  [randomUUID(), "leo.tanaka", "/root/finance/p2p/", "approve_payment", "2000000"],
  [randomUUID(), "sofia.reyes", "/root/finance/o2c/", "approve_discount", "500000"],
  [randomUUID(), "sofia.reyes", "/root/finance/o2c/", "approve_credit_override", "1000000"],
  [randomUUID(), "aisha.khan", "/root/finance/te/", "approve_expense", "50000"],
  [randomUUID(), "tomas.berg", "/root/finance/te/", "submit_expense", "100000"],
  [randomUUID(), "tomas.berg", "/root/finance/te/", "approve_expense", "50000"],
];

// [code, conflicting action pair]
const RULES: Array<[string, string[]]> = [
  ["SOD-P2P-07", ["create_vendor", "approve_vendor_invoice"]],
  ["SOD-MDM-04", ["change_vendor_bank", "approve_payment"]],
  ["SOD-OTC-02", ["create_customer", "approve_credit_override"]],
  ["SOD-TE-01", ["submit_expense", "approve_expense"]],
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

  // Starter agentic decisions across towers — a believable, diverse history.
  const run = (actor: string, agent: string, actionType: string, resource: string, amount: number, orgPath: string) =>
    decide({ requestId: randomUUID(), actor, actionType, resource, amount, orgPath, context: { agent } });

  await run("priya.nair", "AP Agent", "approve_payment", "INV-88421", 2_000_000, "/root/finance/p2p/"); // allow
  await run("priya.nair", "AP Agent", "approve_payment", "INV-90233", 9_000_000, "/root/finance/p2p/"); // escalate
  await run("dan.ortiz", "AP Agent", "create_vendor", "VEND-4471", 0, "/root/finance/p2p/"); // allow
  await run("dan.ortiz", "AP Agent", "approve_vendor_invoice", "VEND-4471", 250_000, "/root/finance/p2p/"); // deny SoD
  await run("leo.tanaka", "MDM Agent", "change_vendor_bank", "VEND-2210", 0, "/root/finance/mdm/"); // allow
  await run("leo.tanaka", "MDM Agent", "approve_payment", "VEND-2210", 1_500_000, "/root/finance/p2p/"); // deny SoD
  await run("sofia.reyes", "O2C Agent", "approve_discount", "ORD-7782", 120_000, "/root/finance/o2c/"); // allow
  await run("sofia.reyes", "O2C Agent", "approve_credit_override", "CUST-559", 2_000_000, "/root/finance/o2c/"); // escalate
  await run("aisha.khan", "T&E Agent", "approve_expense", "EXP-3391", 18_000, "/root/finance/te/"); // allow
  await run("tomas.berg", "T&E Agent", "submit_expense", "EXP-7120", 42_000, "/root/finance/te/"); // allow
  await run("tomas.berg", "T&E Agent", "approve_expense", "EXP-7120", 42_000, "/root/finance/te/"); // deny SoD
  await run("o2c-agent", "O2C Agent", "grant_privilege", "ROLE-ADMIN", 0, "/root/finance/o2c/"); // deny no-authority

  console.log("Seeded Meridian Refining Co.: 8 org units, 13 grants, 4 SoD rules, 12 agentic decisions across towers.");
  console.log(`Priya's approve_payment grant id (revoke for the demo): ${PRIYA_GRANT}`);
  await (await getPool()).end();
}

main().catch((e: unknown) => {
  console.error("Seed failed:", e);
  process.exit(1);
});

/**
 * Seed the demo world: an org tree, Priya's payment-approval authority, and a
 * segregation-of-duties rule. Decisions and the ledger are produced by running
 * the demo (calls to the PDP), not seeded raw, so the hash chain stays valid.
 *
 *   npm run seed
 *
 * Idempotent: clears the five tables (DSQL has no TRUNCATE) and re-inserts.
 */
import "dotenv/config";
import { withRetry } from "../lib/db";

// Fixed id so the demo / UI can revoke this exact grant.
const PRIYA_GRANT_ID = "11111111-1111-4111-8111-111111111111";

async function main(): Promise<void> {
  await withRetry(async (c) => {
    for (const table of ["ledger", "decisions", "policy_rules", "authority_grants", "org_units"]) {
      await c.query(`DELETE FROM ${table}`);
    }
  });

  await withRetry(async (c) => {
    for (const [path, name, unitType] of [
      ["/root/", "Acme Corp", "company"],
      ["/root/finance/", "Finance", "department"],
      ["/root/finance/ap/", "Accounts Payable", "team"],
    ]) {
      await c.query(
        "INSERT INTO org_units (id, path, name, unit_type) VALUES (gen_random_uuid(), $1, $2, $3)",
        [path, name, unitType],
      );
    }
  });

  await withRetry(async (c) => {
    await c.query(
      `INSERT INTO authority_grants
         (id, principal_id, org_path, action_type, approval_limit, valid_from, valid_to, revoked_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NULL)`,
      [
        PRIYA_GRANT_ID,
        "priya.nair",
        "/root/finance/ap/",
        "approve_payment",
        "5000000",
        "2026-01-01T00:00:00Z",
        "2027-01-01T00:00:00Z",
      ],
    );
    // A vendor-creator grant, to set up the SoD conflict scenario.
    await c.query(
      `INSERT INTO authority_grants
         (id, principal_id, org_path, action_type, approval_limit, valid_from, valid_to, revoked_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NULL)`,
      ["dan.ops", "/root/finance/", "create_vendor", "0", "2026-01-01T00:00:00Z", "2027-01-01T00:00:00Z"],
    );
  });

  await withRetry(async (c) => {
    await c.query(
      "INSERT INTO policy_rules (id, rule_type, definition, active) VALUES (gen_random_uuid(), $1, $2, true)",
      ["sod", JSON.stringify({ type: "sod", conflicting: ["created_vendor", "approve_vendor_invoice"] })],
    );
  });

  console.log("Seeded org tree, grants, and SoD rule.");
  console.log(`Priya's approve_payment grant id (revoke this in the demo): ${PRIYA_GRANT_ID}`);
}

main().catch((e: unknown) => {
  console.error("Seed failed:", e);
  process.exit(1);
});

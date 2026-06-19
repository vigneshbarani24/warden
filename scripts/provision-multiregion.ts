/**
 * Provision a multi-region Aurora DSQL cluster: two active peers + a witness.
 * Create both clusters with the witness region, then peer them by setting each
 * other's ARN; poll both to ACTIVE.
 *
 *   npx tsx scripts/provision-multiregion.ts
 */
import "dotenv/config";
import {
  DSQLClient,
  CreateClusterCommand,
  UpdateClusterCommand,
  GetClusterCommand,
} from "@aws-sdk/client-dsql";

const A = "us-east-1";
const B = "us-west-2";
const WITNESS = "us-east-2";

async function waitActive(client: DSQLClient, identifier: string, label: string): Promise<void> {
  for (;;) {
    const got = await client.send(new GetClusterCommand({ identifier }));
    if (got.status === "ACTIVE") {
      console.log(`  ${label} ACTIVE`);
      return;
    }
    if (["FAILED", "DELETING", "PENDING_DELETE"].includes(got.status ?? "")) {
      throw new Error(`${label} entered ${got.status}`);
    }
    process.stdout.write(".");
    await new Promise((r) => setTimeout(r, 6000));
  }
}

async function main(): Promise<void> {
  const ca = new DSQLClient({ region: A });
  const cb = new DSQLClient({ region: B });

  console.log(`Creating cluster in ${A} (witness ${WITNESS}) ...`);
  const ra = await ca.send(
    new CreateClusterCommand({
      deletionProtectionEnabled: false,
      tags: { project: "warden-mr" },
      multiRegionProperties: { witnessRegion: WITNESS },
    }),
  );
  console.log(`Creating cluster in ${B} (witness ${WITNESS}) ...`);
  const rb = await cb.send(
    new CreateClusterCommand({
      deletionProtectionEnabled: false,
      tags: { project: "warden-mr" },
      multiRegionProperties: { witnessRegion: WITNESS },
    }),
  );

  const idA = ra.identifier;
  const arnA = ra.arn;
  const idB = rb.identifier;
  const arnB = rb.arn;
  if (!idA || !arnA || !idB || !arnB) throw new Error("CreateCluster did not return identifier/arn");
  console.log(`  A=${idA}  B=${idB}`);

  console.log("Peering clusters ...");
  await ca.send(
    new UpdateClusterCommand({ identifier: idA, multiRegionProperties: { witnessRegion: WITNESS, clusters: [arnB] } }),
  );
  await cb.send(
    new UpdateClusterCommand({ identifier: idB, multiRegionProperties: { witnessRegion: WITNESS, clusters: [arnA] } }),
  );

  process.stdout.write("waiting for ACTIVE");
  await waitActive(ca, idA, `A(${A})`);
  await waitActive(cb, idB, `B(${B})`);

  console.log("\nMulti-region cluster ready:");
  console.log(`  REGION_A_ENDPOINT=${idA}.dsql.${A}.on.aws`);
  console.log(`  REGION_B_ENDPOINT=${idB}.dsql.${B}.on.aws`);
}

main().catch((e: unknown) => {
  console.error("\nMulti-region provisioning failed:", e);
  process.exit(1);
});

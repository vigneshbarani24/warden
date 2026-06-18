/**
 * Provision a single-region Aurora DSQL cluster via the AWS SDK (no AWS CLI needed).
 *
 *   npm run provision
 *
 * Requires AWS credentials in the default provider chain (~/.aws/credentials or
 * AWS_* env vars) and AWS_REGION (defaults to us-east-1).
 */
import "dotenv/config";
import { DSQLClient, CreateClusterCommand, GetClusterCommand } from "@aws-sdk/client-dsql";

const region = process.env.AWS_REGION ?? "us-east-1";

async function main(): Promise<void> {
  const client = new DSQLClient({ region });
  console.log(`Creating single-region DSQL cluster in ${region} ...`);
  const created = await client.send(
    new CreateClusterCommand({ deletionProtectionEnabled: false, tags: { project: "warden" } }),
  );
  const identifier = created.identifier;
  if (!identifier) throw new Error("CreateCluster returned no identifier");
  console.log(`  cluster id: ${identifier}`);
  console.log(`  arn:        ${created.arn ?? "(n/a)"}`);

  process.stdout.write("  waiting for ACTIVE");
  for (;;) {
    const got = await client.send(new GetClusterCommand({ identifier }));
    if (got.status === "ACTIVE") break;
    if (got.status === "FAILED" || got.status === "DELETING" || got.status === "PENDING_DELETE") {
      throw new Error(`Cluster entered ${got.status}`);
    }
    process.stdout.write(".");
    await sleep(5_000);
  }

  const endpoint = `${identifier}.dsql.${region}.on.aws`;
  console.log("\n\nACTIVE. Add these to .env:\n");
  console.log(`  DSQL_ENDPOINT=${endpoint}`);
  console.log(`  AWS_REGION=${region}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((e: unknown) => {
  console.error("\nProvisioning failed:", e);
  process.exit(1);
});

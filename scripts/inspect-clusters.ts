/**
 * Inspect existing Aurora DSQL clusters across the candidate regions so we know
 * what multi-region infra already exists before provisioning more.
 *
 *   npx tsx scripts/inspect-clusters.ts
 */
import "dotenv/config";
import { DSQLClient, ListClustersCommand, GetClusterCommand } from "@aws-sdk/client-dsql";

const REGIONS = ["us-east-1", "us-west-2", "us-east-2"];

async function inspectRegion(region: string): Promise<void> {
  const client = new DSQLClient({ region });
  console.log(`\n=== ${region} ===`);
  try {
    const list = await client.send(new ListClustersCommand({}));
    const clusters = list.clusters ?? [];
    if (clusters.length === 0) {
      console.log("  (no clusters)");
      return;
    }
    for (const c of clusters) {
      const id = c.identifier;
      if (!id) continue;
      const got = await client.send(new GetClusterCommand({ identifier: id }));
      console.log(`  ${id}  status=${got.status}`);
      console.log(`    endpoint=${id}.dsql.${region}.on.aws`);
      console.log(`    arn=${got.arn}`);
      const mrp = got.multiRegionProperties;
      if (mrp) {
        console.log(`    witnessRegion=${mrp.witnessRegion ?? "(none)"}`);
        console.log(`    peers=${JSON.stringify(mrp.clusters ?? [])}`);
      } else {
        console.log(`    multiRegionProperties=(none) -> single-region`);
      }
    }
  } catch (e) {
    console.log(`  ERROR: ${(e as Error).message}`);
  }
}

async function main(): Promise<void> {
  for (const r of REGIONS) await inspectRegion(r);
}

main().catch((e: unknown) => {
  console.error("inspect failed:", e);
  process.exit(1);
});

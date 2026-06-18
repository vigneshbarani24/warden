# @warden/sdk

Typed client for the [Warden](../../README.md) Policy Decision Point. Any agent
calls `decide()` **before** it acts; Warden returns an authoritative
`allow | deny | escalate` with a defensible reason and records the decision in a
tamper-evident audit ledger.

```ts
import { WardenClient } from "@warden/sdk";

const warden = new WardenClient({ baseUrl: "https://warden.vercel.app" });

const verdict = await warden.decide({
  requestId: crypto.randomUUID(),
  actor: "priya.nair",
  actionType: "approve_payment",
  resource: "INV-88421",
  amount: 2_000_000,
  orgPath: "/root/finance/ap/",
});

if (verdict.verdict !== "allow") {
  throw new Error(`Blocked by Warden: ${verdict.reason}`);
}
// ...proceed with the action in the ERP.
```

`decide()` is idempotent on `requestId` — retrying a request returns the original
verdict (`idempotentReplay: true`) rather than recording a second decision.

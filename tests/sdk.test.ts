import { describe, it, expect } from "vitest";
import { WardenClient } from "../packages/sdk/index";

const sample = {
  requestId: "r1",
  verdict: "allow" as const,
  reason: "ok",
  firedRuleIds: [],
  evaluatedContext: {},
  idempotentReplay: false,
};

describe("WardenClient.decide", () => {
  it("posts to /api/pdp/decide (trimming a trailing slash) and parses the verdict", async () => {
    const calls: string[] = [];
    const fakeFetch = (async (url: string | URL | Request) => {
      calls.push(String(url));
      return { ok: true, status: 200, json: async () => sample, text: async () => "" };
    }) as unknown as typeof fetch;

    const client = new WardenClient({ baseUrl: "https://warden.example.com/", fetch: fakeFetch });
    const result = await client.decide({
      requestId: "r1",
      actor: "priya",
      actionType: "approve_payment",
      resource: "INV-1",
      amount: 1000,
      orgPath: "/root/finance/",
    });

    expect(result.verdict).toBe("allow");
    expect(calls[0]).toBe("https://warden.example.com/api/pdp/decide");
  });

  it("throws on a non-2xx response", async () => {
    const fakeFetch = (async () => ({
      ok: false,
      status: 500,
      json: async () => ({}),
      text: async () => "boom",
    })) as unknown as typeof fetch;

    const client = new WardenClient({ baseUrl: "https://warden.example.com", fetch: fakeFetch });
    await expect(
      client.decide({
        requestId: "r2",
        actor: "priya",
        actionType: "approve_payment",
        resource: "INV-2",
        amount: 1,
        orgPath: "/root/finance/",
      }),
    ).rejects.toThrow(/500/);
  });
});

/**
 * @warden/sdk — a minimal typed client for the Warden Policy Decision Point.
 *
 * Any agent calls `decide()` BEFORE it acts; Warden returns an authoritative
 * verdict with a defensible reason and records the decision in its audit ledger.
 * Self-contained: no dependency on Warden's server internals.
 */
export type Verdict = "allow" | "deny" | "escalate";

export interface DecideInput {
  /** Caller-supplied id for the proposed action; also the idempotency key. */
  requestId: string;
  actor: string;
  actionType: string;
  /** Resource id the action targets, e.g. "INV-88421". */
  resource: string;
  amount: number;
  /** Org path the resource lives under, e.g. "/root/finance/ap/". */
  orgPath: string;
  context?: Record<string, unknown>;
}

export interface DecideResult {
  requestId: string;
  verdict: Verdict;
  reason: string;
  firedRuleIds: string[];
  evaluatedContext: unknown;
  idempotentReplay: boolean;
}

export interface WardenClientOptions {
  /** Base URL of the Warden deployment, e.g. https://warden.vercel.app */
  baseUrl: string;
  /** Override fetch (for tests or non-global-fetch runtimes). */
  fetch?: typeof fetch;
}

export class WardenClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: WardenClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.fetchImpl = options.fetch ?? fetch;
  }

  /** Ask the PDP to authorize a proposed action. Throws on a non-2xx response. */
  async decide(input: DecideInput): Promise<DecideResult> {
    const res = await this.fetchImpl(`${this.baseUrl}/api/pdp/decide`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Warden decide failed (${res.status}): ${detail}`);
    }
    return (await res.json()) as DecideResult;
  }
}

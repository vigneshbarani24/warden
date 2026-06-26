/**
 * Model ids for the Vercel AI Gateway. Plain `provider/model` strings resolve via the
 * gateway (the AI SDK's default global provider) when AI_GATEWAY_API_KEY is set; on
 * Vercel, OIDC works too. Ids fetched live from the gateway model list on 2026-06-26.
 *
 * The LLM never decides a verdict — it proposes actions (the agent) and compiles English
 * controls (NL→policy). Warden's deterministic decide() is always the source of truth.
 */
export const AGENT_MODEL = "anthropic/claude-sonnet-4.6";
export const FAST_MODEL = "anthropic/claude-haiku-4.5";

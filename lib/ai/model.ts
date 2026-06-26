/**
 * The models for the agentic layer, via a DIRECT OpenAI key (no Vercel AI Gateway,
 * so no Vercel card required). @ai-sdk/openai reads OPENAI_API_KEY from the env.
 * Swap the ids here if your account has newer models (e.g. "gpt-5"); the rest of the
 * agent/NL-policy code only imports these two constants.
 *
 * The LLM never decides a verdict — it proposes actions (the agent) and compiles English
 * controls (NL→policy). Warden's deterministic decide() is always the source of truth.
 */
import { openai } from "@ai-sdk/openai";

export const AGENT_MODEL = openai("gpt-4.1");
export const FAST_MODEL = openai("gpt-4.1-mini");

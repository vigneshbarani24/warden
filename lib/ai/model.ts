/**
 * The models for the agentic layer, via a DIRECT OpenAI key (no Vercel AI Gateway,
 * so no Vercel card required). Swap the ids here if your account has newer models
 * (e.g. "gpt-5"); the rest of the agent/NL-policy code only imports these two constants.
 *
 * The LLM never decides a verdict — it proposes actions (the agent) and compiles English
 * controls (NL→policy). Warden's deterministic decide() is always the source of truth.
 */
import { createOpenAI } from "@ai-sdk/openai";

// .trim() the key: a stray BOM/newline from a platform env var would otherwise break
// OpenAI auth (the same gotcha we hit with the DSQL endpoints).
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY?.trim() });

export const AGENT_MODEL = openai("gpt-4.1");
export const FAST_MODEL = openai("gpt-4.1-mini");

/**
 * The agent endpoint. The browser useChat client POSTs the UI message history;
 * the ToolLoopAgent runs (calling Warden-gated tools in-process) and streams the
 * result back. nodejs runtime: the tools reach decide() → pg → AWS.
 */
import { createAgentUIStreamResponse } from "ai";
import { erpAgent } from "@/lib/agents/erp-agent";
import { logAndMessage } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request): Promise<Response> {
  try {
    const { messages } = (await req.json()) as { messages: unknown[] };
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages must be an array" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
    return await createAgentUIStreamResponse({ agent: erpAgent, uiMessages: messages });
  } catch (err) {
    const message = logAndMessage("api/agent", err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

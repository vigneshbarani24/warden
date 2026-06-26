/**
 * NL→policy authoring endpoint. POST plain-English SoD control text; the FAST_MODEL
 * compiles it into a conflicting-action pair (Output.object), which is persisted as a
 * deterministic SoD rule. The LLM never decides a verdict — it only compiles the control.
 */
import { NextResponse } from "next/server";
import { authorPolicy } from "@/lib/ai/policy-author";
import { logAndMessage } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { text?: unknown };
  try {
    body = (await req.json()) as { text?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const { text } = body;
  if (typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "text (non-empty string) is required" }, { status: 400 });
  }
  try {
    const rule = await authorPolicy(text);
    return NextResponse.json(rule, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: logAndMessage("policies/author", e) }, { status: 500 });
  }
}

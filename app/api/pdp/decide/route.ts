import { NextResponse } from "next/server";
import { decide } from "@/lib/pdp";
import { parseDecisionInput } from "@/lib/validate";
import { logAndMessage } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const parsed = parseDecisionInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    return NextResponse.json(await decide(parsed.value));
  } catch (e) {
    return NextResponse.json({ error: logAndMessage("pdp/decide", e) }, { status: 500 });
  }
}

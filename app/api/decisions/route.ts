import { NextResponse } from "next/server";
import { getRecentDecisions } from "@/lib/pdp";
import { logAndMessage } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const raw = Number(new URL(req.url).searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(raw) && raw > 0 ? Math.min(raw, 500) : 50;
  try {
    return NextResponse.json(await getRecentDecisions(limit));
  } catch (e) {
    return NextResponse.json({ error: logAndMessage("decisions", e) }, { status: 500 });
  }
}

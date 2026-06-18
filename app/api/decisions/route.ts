import { NextResponse } from "next/server";
import { getRecentDecisions } from "@/lib/pdp";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const raw = Number(new URL(req.url).searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(raw) && raw > 0 ? Math.min(raw, 500) : 50;
  try {
    return NextResponse.json(await getRecentDecisions(limit));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

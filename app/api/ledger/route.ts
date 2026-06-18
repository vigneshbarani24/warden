import { NextResponse } from "next/server";
import { getLedger } from "@/lib/pdp";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const raw = Number(new URL(req.url).searchParams.get("limit") ?? "200");
  const limit = Number.isFinite(raw) && raw > 0 ? Math.min(raw, 1000) : 200;
  try {
    return NextResponse.json(await getLedger(limit));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

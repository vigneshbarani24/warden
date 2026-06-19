import { NextResponse } from "next/server";
import { runFleet } from "@/lib/agents";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const raw = Number(new URL(req.url).searchParams.get("count") ?? "8");
  const count = Number.isFinite(raw) && raw > 0 ? Math.min(raw, 50) : 8;
  try {
    return NextResponse.json(await runFleet(count));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

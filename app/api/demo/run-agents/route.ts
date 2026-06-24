import { NextResponse } from "next/server";
import { runFleet } from "@/lib/agents";
import { logAndMessage } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const raw = Number(new URL(req.url).searchParams.get("count") ?? "8");
  // floor: count drives a loop, so a fractional value (count=2.5) must not reach runFleet.
  const count = Number.isFinite(raw) && raw > 0 ? Math.min(Math.floor(raw), 50) : 8;
  try {
    return NextResponse.json(await runFleet(count));
  } catch (e) {
    return NextResponse.json({ error: logAndMessage("demo/run-agents", e) }, { status: 500 });
  }
}

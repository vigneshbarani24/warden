import { NextResponse } from "next/server";
import { resetDemo } from "@/lib/pdp";
import { logAndMessage } from "@/lib/http";

export const runtime = "nodejs";

export async function POST() {
  try {
    return NextResponse.json(await resetDemo());
  } catch (e) {
    return NextResponse.json({ error: logAndMessage("demo/reset", e) }, { status: 500 });
  }
}

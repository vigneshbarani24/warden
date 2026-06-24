import { NextResponse } from "next/server";
import { tamperLatestLedger } from "@/lib/pdp";
import { logAndMessage } from "@/lib/http";

export const runtime = "nodejs";

export async function POST() {
  try {
    return NextResponse.json(await tamperLatestLedger());
  } catch (e) {
    return NextResponse.json({ error: logAndMessage("demo/tamper", e) }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { verifyLedger } from "@/lib/pdp";
import { logAndMessage } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await verifyLedger());
  } catch (e) {
    return NextResponse.json({ error: logAndMessage("ledger/verify", e) }, { status: 500 });
  }
}

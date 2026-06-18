import { NextResponse } from "next/server";
import { verifyLedger } from "@/lib/pdp";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await verifyLedger());
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

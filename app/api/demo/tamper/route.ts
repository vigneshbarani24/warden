import { NextResponse } from "next/server";
import { tamperLatestLedger } from "@/lib/pdp";

export const runtime = "nodejs";

export async function POST() {
  try {
    return NextResponse.json(await tamperLatestLedger());
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

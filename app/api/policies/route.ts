import { NextResponse } from "next/server";
import { getPolicyRules } from "@/lib/pdp";
import { logAndMessage } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await getPolicyRules());
  } catch (e) {
    return NextResponse.json({ error: logAndMessage("policies", e) }, { status: 500 });
  }
}

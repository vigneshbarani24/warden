import { NextResponse } from "next/server";
import { resetDemo } from "@/lib/pdp";

export const runtime = "nodejs";

export async function POST() {
  try {
    return NextResponse.json(await resetDemo());
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

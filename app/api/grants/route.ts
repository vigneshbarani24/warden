import { NextResponse } from "next/server";
import { getGrants } from "@/lib/pdp";
import { logAndMessage } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const principal = new URL(req.url).searchParams.get("principal") ?? undefined;
  try {
    return NextResponse.json(await getGrants(principal));
  } catch (e) {
    return NextResponse.json({ error: logAndMessage("grants", e) }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getGrants } from "@/lib/pdp";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const principal = new URL(req.url).searchParams.get("principal") ?? undefined;
  try {
    return NextResponse.json(await getGrants(principal));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

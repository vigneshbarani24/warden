import { NextResponse } from "next/server";
import { setPolicyActive } from "@/lib/pdp";
import { logAndMessage } from "@/lib/http";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Validate before the DB call: a non-UUID id throws 22P02 from the uuid column, leaking
  // the column type as a raw 500. A malformed id is a client error.
  if (!UUID.test(id)) return NextResponse.json({ error: "invalid policy id" }, { status: 400 });

  let body: { active?: unknown };
  try {
    body = (await req.json()) as { active?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (typeof body.active !== "boolean") {
    return NextResponse.json({ error: "active (boolean) is required" }, { status: 400 });
  }
  try {
    return NextResponse.json(await setPolicyActive(id, body.active));
  } catch (e) {
    return NextResponse.json({ error: logAndMessage("policies/toggle", e) }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { revokeGrant } from "@/lib/pdp";
import { logAndMessage } from "@/lib/http";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Validate before the DB call: a non-UUID id would throw 22P02 from the uuid column,
  // surfacing as a raw 500 that leaks the column type. A malformed id is a client error.
  if (!UUID.test(id)) return NextResponse.json({ error: "invalid grant id" }, { status: 400 });
  try {
    return NextResponse.json(await revokeGrant(id));
  } catch (e) {
    return NextResponse.json({ error: logAndMessage("grants/revoke", e) }, { status: 500 });
  }
}

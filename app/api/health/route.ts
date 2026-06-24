import { NextResponse } from "next/server";
import { readWithRetry } from "@/lib/db";
import { logAndMessage } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    // readWithRetry reconnects on a stale/expired-token connection, so the first probe
    // after an idle gap reports true reachability instead of a one-off ok:false.
    const { rows } = await readWithRetry((pool) => pool.query("SELECT 1 AS ok, now()::text AS ts"));
    return NextResponse.json({ ok: true, db: rows[0] });
  } catch (e) {
    return NextResponse.json({ ok: false, error: logAndMessage("health", e) }, { status: 500 });
  }
}

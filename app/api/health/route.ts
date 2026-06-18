import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const pool = await getPool();
    const { rows } = await pool.query("SELECT 1 AS ok, now()::text AS ts");
    return NextResponse.json({ ok: true, db: rows[0] });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

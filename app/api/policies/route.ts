import { NextResponse } from "next/server";
import { createPolicyRule, getPolicyRules } from "@/lib/pdp";
import { logAndMessage } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await getPolicyRules());
  } catch (e) {
    return NextResponse.json({ error: logAndMessage("policies", e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: { code?: unknown; conflicting?: unknown };
  try {
    body = (await req.json()) as { code?: unknown; conflicting?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const { code, conflicting } = body;
  if (
    typeof code !== "string" ||
    code.length === 0 ||
    !Array.isArray(conflicting) ||
    conflicting.length < 2 ||
    !conflicting.every((c): c is string => typeof c === "string")
  ) {
    return NextResponse.json(
      { error: "code (string) and conflicting (string[] of length >= 2) are required" },
      { status: 400 },
    );
  }
  try {
    const rule = await createPolicyRule({ type: "sod", code, conflicting });
    return NextResponse.json(rule, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: logAndMessage("policies/create", e) }, { status: 500 });
  }
}

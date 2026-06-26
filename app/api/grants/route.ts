import { NextResponse } from "next/server";
import { createGrant, getGrants } from "@/lib/pdp";
import { logAndMessage } from "@/lib/http";
import type { CreateGrantInput } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const principal = new URL(req.url).searchParams.get("principal") ?? undefined;
  try {
    return NextResponse.json(await getGrants(principal));
  } catch (e) {
    return NextResponse.json({ error: logAndMessage("grants", e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: Partial<CreateGrantInput>;
  try {
    body = (await req.json()) as Partial<CreateGrantInput>;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const { principalId, orgPath, actionType, approvalLimit, validFrom, validTo } = body;
  if (
    typeof principalId !== "string" ||
    typeof orgPath !== "string" ||
    typeof actionType !== "string" ||
    typeof approvalLimit !== "number" ||
    !Number.isFinite(approvalLimit)
  ) {
    return NextResponse.json(
      { error: "principalId, orgPath, actionType (string) and approvalLimit (number) are required" },
      { status: 400 },
    );
  }
  if (!orgPath.startsWith("/") || !orgPath.endsWith("/")) {
    return NextResponse.json({ error: "orgPath must start and end with '/'" }, { status: 400 });
  }
  try {
    const grant = await createGrant({ principalId, orgPath, actionType, approvalLimit, validFrom, validTo });
    return NextResponse.json(grant, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: logAndMessage("grants/create", e) }, { status: 500 });
  }
}

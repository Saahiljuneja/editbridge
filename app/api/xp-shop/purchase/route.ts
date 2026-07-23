import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { purchaseBoost, type BoostType } from "@/lib/xp-shop";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const type = body?.type as BoostType | undefined;
  if (!type) return NextResponse.json({ error: "Missing type" }, { status: 400 });

  const result = await purchaseBoost(session.user.userId, type);
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ ok: true });
}

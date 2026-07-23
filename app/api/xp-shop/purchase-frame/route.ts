import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { purchaseFrame } from "@/lib/xp-shop";
import type { FrameKey } from "@/lib/xp-shop-config";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { frameKey } = await req.json().catch(() => ({}));
  if (!frameKey) return NextResponse.json({ error: "Missing frameKey" }, { status: 400 });

  const result = await purchaseFrame(session.user.userId, frameKey as FrameKey);
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ ok: true });
}

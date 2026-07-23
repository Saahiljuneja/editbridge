import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { editors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PROFILE_FRAMES } from "@/lib/xp-shop-config";
import { getActiveBoosts } from "@/lib/xp-shop";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.userId || !session.user.editorId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { frameKey } = await req.json().catch(() => ({}));

  // Allow clearing the frame
  if (frameKey === null || frameKey === "") {
    await db.update(editors).set({ activeFrame: null }).where(eq(editors.id, session.user.editorId));
    return NextResponse.json({ ok: true });
  }

  // Validate it's a real frame
  const valid = PROFILE_FRAMES.find(f => f.key === frameKey);
  if (!valid) return NextResponse.json({ error: "Invalid frame" }, { status: 400 });

  // Check editor owns this frame
  const boosts = await getActiveBoosts(session.user.userId);
  const owned = boosts.some(b => b.type === frameKey);
  if (!owned) return NextResponse.json({ error: "Frame not unlocked" }, { status: 403 });

  await db.update(editors).set({ activeFrame: frameKey }).where(eq(editors.id, session.user.editorId));
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { referrals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logAction } from "@/lib/audit";
import type { UserRole } from "@/types";

const ALLOWED: UserRole[] = ["admin"];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { referrerId } = body;

  // Find if referrer link already exists
  const [existing] = await db.select().from(referrals).where(eq(referrals.refereeId, id)).limit(1);

  if (referrerId) {
    if (referrerId === id) {
      return NextResponse.json({ error: "Cannot refer oneself." }, { status: 400 });
    }

    if (existing) {
      // Update existing referrer
      await db
        .update(referrals)
        .set({ referrerId, rewardedAt: null, creditAwarded: 0 })
        .where(eq(referrals.refereeId, id));
    } else {
      // Insert new referral link
      await db.insert(referrals).values({
        referrerId,
        refereeId: id,
        creditAwarded: 0,
      });
    }
  } else {
    // Clear referrer if explicitly set to null
    if (existing) {
      await db.delete(referrals).where(eq(referrals.refereeId, id));
    }
  }

  logAction({
    actorId: session.user.userId!,
    actorRole: session.user.role as UserRole,
    action: "user.referral_update",
    entityType: "user",
    entityId: id,
    metadata: { referrerId },
  });

  return NextResponse.json({ success: true });
}

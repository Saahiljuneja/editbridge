import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { editors, userBadges } from "@/lib/db/schema";
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
  const { activeFrame, badges } = body; // badges: array of string badge keys

  // 1. Update activeFrame in editors if they have an editor profile
  const [editor] = await db.select().from(editors).where(eq(editors.userId, id)).limit(1);
  if (editor) {
    await db
      .update(editors)
      .set({
        activeFrame: activeFrame || null,
        updatedAt: new Date(),
      })
      .where(eq(editors.userId, id));
  }

  // 2. Update badges in userBadges table
  if (Array.isArray(badges)) {
    // Delete existing badges
    await db.delete(userBadges).where(eq(userBadges.userId, id));

    // Insert new badges
    if (badges.length > 0) {
      await db.insert(userBadges).values(
        badges.map((badgeKey: string) => ({
          userId: id,
          badge: badgeKey,
        }))
      );
    }
  }

  logAction({
    actorId: session.user.userId!,
    actorRole: session.user.role as UserRole,
    action: "user.profile_customizer_override",
    entityType: "user",
    entityId: id,
    metadata: { activeFrame, badges },
  });

  return NextResponse.json({ success: true });
}

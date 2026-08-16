import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
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

  await db
    .update(users)
    .set({
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: null,
      twoFactorVerifiedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id));

  logAction({
    actorId: session.user.userId!,
    actorRole: session.user.role as UserRole,
    action: "user.reset_2fa",
    entityType: "user",
    entityId: id,
    metadata: { reason: "Reset by admin override" },
  });

  return NextResponse.json({ success: true });
}

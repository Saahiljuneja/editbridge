import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/password";
import { logAction } from "@/lib/audit";
import { randomBytes } from "crypto";
import type { UserRole } from "@/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Prevent self password reset from admin panel
  if (session.user.userId === id) {
    return NextResponse.json({ error: "Cannot reset your own password from here" }, { status: 400 });
  }

  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const tempPassword = "EB-" + randomBytes(4).toString("hex").toUpperCase();
  const hashedPassword = await hashPassword(tempPassword);

  await db
    .update(users)
    .set({ hashedPassword, updatedAt: new Date() })
    .where(eq(users.id, id));

  logAction({
    actorId: session.user.userId!,
    actorRole: session.user.role as UserRole,
    action: "user.reset_password",
    entityType: "user",
    entityId: id,
    metadata: { method: "temporary_password_generation" },
  });

  return NextResponse.json({ success: true, tempPassword });
}

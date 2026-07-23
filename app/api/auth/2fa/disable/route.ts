import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { comparePassword } from "@/lib/password";
import { logAction } from "@/lib/audit";

const schema = z.object({ password: z.string().min(1) });

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

  const [user] = await db
    .select({ hashedPassword: users.hashedPassword })
    .from(users)
    .where(eq(users.id, session.user.userId))
    .limit(1);

  if (!user?.hashedPassword) {
    return NextResponse.json({ error: "Set a password on your account before disabling 2FA" }, { status: 400 });
  }

  const valid = await comparePassword(parsed.data.password, user.hashedPassword);
  if (!valid) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 403 });
  }

  await db
    .update(users)
    .set({
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.userId));

  logAction({
    actorId: session.user.userId,
    actorRole: session.user.role,
    action: "2fa.disabled",
    entityType: "user",
    entityId: session.user.userId,
    metadata: {},
  });

  return NextResponse.json({ success: true });
}

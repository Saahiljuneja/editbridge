import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { comparePassword } from "@/lib/password";
import { generateBackupCodes, hashBackupCode } from "@/lib/two-factor";
import { logAction } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({ password: z.string().min(1) });

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }

  const [user] = await db
    .select({ hashedPassword: users.hashedPassword, twoFactorEnabled: users.twoFactorEnabled })
    .from(users)
    .where(eq(users.id, session.user.userId))
    .limit(1);

  if (!user?.twoFactorEnabled) {
    return NextResponse.json({ error: "2FA is not enabled" }, { status: 400 });
  }

  if (!user.hashedPassword) {
    return NextResponse.json({ error: "Google OAuth accounts cannot use this endpoint" }, { status: 400 });
  }

  const valid = await comparePassword(parsed.data.password, user.hashedPassword);
  if (!valid) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const backupCodes = generateBackupCodes(8);
  const hashedCodes = backupCodes.map(hashBackupCode);

  await db
    .update(users)
    .set({ twoFactorBackupCodes: hashedCodes, updatedAt: new Date() })
    .where(eq(users.id, session.user.userId));

  logAction({
    actorId: session.user.userId,
    actorRole: session.user.role,
    action: "2fa.backup_codes_regenerated",
    entityType: "user",
    entityId: session.user.userId,
    metadata: {},
  });

  return NextResponse.json({ backupCodes });
}

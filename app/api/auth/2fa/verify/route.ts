import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import speakeasy from "speakeasy";
import { z } from "zod";
import { encryptSecret, generateBackupCodes, hashBackupCode } from "@/lib/two-factor";
import { logAction } from "@/lib/audit";

const schema = z.object({
  token: z.string().length(6),
  tempSecret: z.string().min(1),
});

// Confirms the user actually holds a working authenticator before we ever
// persist the secret — only saved to the DB after a valid code is presented.
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A 6-digit code and secret are required" }, { status: 400 });
  }
  const { token, tempSecret } = parsed.data;

  const isValid = speakeasy.totp.verify({
    secret: tempSecret,
    encoding: "base32",
    token,
    window: 1,
  });

  if (!isValid) {
    return NextResponse.json({ error: "Incorrect code — check your authenticator app and try again" }, { status: 400 });
  }

  const backupCodes = generateBackupCodes(8);
  const hashedCodes = backupCodes.map(hashBackupCode);

  await db
    .update(users)
    .set({
      twoFactorEnabled: true,
      twoFactorSecret: encryptSecret(tempSecret),
      twoFactorBackupCodes: hashedCodes,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.userId));

  logAction({
    actorId: session.user.userId,
    actorRole: session.user.role,
    action: "2fa.enabled",
    entityType: "user",
    entityId: session.user.userId,
    metadata: {},
  });

  // Backup codes are returned exactly once — never retrievable again.
  return NextResponse.json({ backupCodes });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import speakeasy from "speakeasy";
import { z } from "zod";
import { decryptSecret, consumeBackupCode } from "@/lib/two-factor";
import { logAction } from "@/lib/audit";

const schema = z.object({
  token: z.string().length(6).optional(),
  backupCode: z.string().min(1).optional(),
}).refine((d) => d.token || d.backupCode, { message: "A code or backup code is required" });

// Completes the login flow for a session left pending after password verification
// (see lib/auth.ts). Success writes a short-lived, single-use marker that the JWT
// callback consumes on the client's next session update — never trust a client
// -asserted "verified" flag directly.
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.twoFactorPending) {
    return NextResponse.json({ error: "No pending two-factor verification" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A code or backup code is required" }, { status: 400 });
  }

  const [user] = await db
    .select({ twoFactorSecret: users.twoFactorSecret, twoFactorBackupCodes: users.twoFactorBackupCodes })
    .from(users)
    .where(eq(users.id, session.user.userId))
    .limit(1);

  if (!user?.twoFactorSecret) {
    return NextResponse.json({ error: "Two-factor authentication is not set up on this account" }, { status: 400 });
  }

  let ok = false;
  let usedBackupCode = false;
  let remainingBackupCodes: string[] | undefined;

  if (parsed.data.token) {
    ok = speakeasy.totp.verify({
      secret: decryptSecret(user.twoFactorSecret),
      encoding: "base32",
      token: parsed.data.token,
      window: 1,
    });
  } else if (parsed.data.backupCode) {
    const result = consumeBackupCode(parsed.data.backupCode, user.twoFactorBackupCodes ?? []);
    ok = result.valid;
    if (ok) {
      usedBackupCode = true;
      remainingBackupCodes = result.remaining;
    }
  }

  if (!ok) {
    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  }

  const updates: Record<string, unknown> = { twoFactorVerifiedAt: new Date() };
  if (usedBackupCode) updates.twoFactorBackupCodes = remainingBackupCodes;
  await db.update(users).set(updates).where(eq(users.id, session.user.userId));

  logAction({
    actorId: session.user.userId,
    actorRole: session.user.role,
    action: usedBackupCode ? "2fa.login_backup_code_used" : "2fa.login_verified",
    entityType: "user",
    entityId: session.user.userId,
    metadata: usedBackupCode ? { remainingBackupCodes: remainingBackupCodes?.length } : {},
  });

  return NextResponse.json({
    success: true,
    ...(usedBackupCode ? { remainingBackupCodes: remainingBackupCodes?.length } : {}),
  });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, verificationTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail } from "@/lib/resend";
import { OtpEmailTemplate } from "@/components/emails/otp-email";
import { randomInt } from "crypto";
import { getPlatformSettings } from "@/lib/platform-settings";
import { resendVerificationSchema } from "@/lib/validations";
import { logAuthRejection } from "@/lib/auth-logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = resendVerificationSchema.safeParse(body);
    if (!result.success) {
      logAuthRejection("resend-verification", result.error.issues[0].message, req);
      // Always 200 — don't reveal whether an email exists
      return NextResponse.json({ success: true });
    }

    const { email } = result.data; // already normalised by emailSchema transform

    const [user] = await db
      .select({ id: users.id, name: users.name, emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || user.emailVerified) {
      return NextResponse.json({ success: true });
    }

    const otp = String(randomInt(100000, 1000000));
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await db.delete(verificationTokens).where(eq(verificationTokens.identifier, email));
    await db.insert(verificationTokens).values({ identifier: email, token: otp, expires });

    const { name: platformName } = await getPlatformSettings();
    await sendEmail({
      to: email,
      subject: `${otp} is your ${platformName} verification code`,
      react: OtpEmailTemplate({ name: user.name ?? "there", otp, platformName }),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[resend-verification]", err);
    return NextResponse.json({ error: "Failed to send code." }, { status: 500 });
  }
}

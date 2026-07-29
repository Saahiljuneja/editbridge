import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { passwordResetRequestSchema } from "@/lib/validations";
import { logAuthRejection } from "@/lib/auth-logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/resend";
import { ResetPasswordEmailTemplate } from "@/components/emails/reset-password-email";
import { getPlatformSettings } from "@/lib/platform-settings";

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "127.0.0.1";

    const ipLimit = await checkRateLimit(`forgot:ip:${ip}`, 5, 3600000);
    if (!ipLimit.allowed) {
      logAuthRejection("forgot-password", "IP rate limit exceeded", req);
      return NextResponse.json(
        { error: "Too many password reset requests. Please try again in an hour." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const result = passwordResetRequestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email } = result.data;

    const emailLimit = await checkRateLimit(`forgot:email:${email}`, 3, 3600000);
    if (!emailLimit.allowed) {
      logAuthRejection("forgot-password", "Email rate limit exceeded", req);
      return NextResponse.json(
        { error: "Too many password reset requests for this email. Please try again in an hour." },
        { status: 429 }
      );
    }

    // Always return 200 to avoid email enumeration
    const [user] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user) {
      const token = randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

      await db.insert(passwordResetTokens).values({
        userId: user.id,
        token,
        expires,
      });

      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

      const { name: platformName, emailHeaderColor } = await getPlatformSettings();
      try {
        await sendEmail({
          to: email,
          subject: `Reset your ${platformName} password`,
          react: ResetPasswordEmailTemplate({
            name: user.name ?? "there",
            resetUrl,
            platformName,
            emailHeaderColor,
          }),
        });
      } catch (emailErr) {
        console.error("[forgot-password] failed to send reset email:", emailErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[forgot-password]", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

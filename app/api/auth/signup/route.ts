import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, editors, verificationTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/password";
import { signupSchema } from "@/lib/validations";
import { sendEmail } from "@/lib/resend";
import { OtpEmailTemplate } from "@/components/emails/otp-email";
import { randomInt } from "crypto";
import type { UserRole } from "@/types";
import { recordReferral, getUserByReferralCode } from "@/lib/referrals";
import { getPlatformSettings } from "@/lib/platform-settings";
import { logAuthRejection } from "@/lib/auth-logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { role, ref, ...rest } = body; // ref = referral code

    const result = signupSchema.safeParse(rest);
    if (!result.success) {
      logAuthRejection("signup", result.error.issues[0].message, req, {
        fields: result.error.issues.map((i) => i.path.join(".")),
      });
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, password } = result.data;
    // emailSchema transform already lowercases + trims
    const email = result.data.email;
    const userRole: UserRole = role === "editor" ? "editor" : "client";

    // Check for existing account
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const [newUser] = await db
      .insert(users)
      .values({ email, name, hashedPassword, role: userRole, onboarded: true })
      .returning({ id: users.id });

    // Create editor profile immediately for editor signups
    if (userRole === "editor") {
      await db.insert(editors).values({ userId: newUser.id });
    }

    // Record referral if signup came from a referral link
    if (ref && userRole === "client") {
      const referrerId = await getUserByReferralCode(String(ref));
      if (referrerId) {
        recordReferral(referrerId, newUser.id).catch(() => {});
      }
    }

    // Generate 6-digit OTP (10-min expiry)
    const otp = String(randomInt(100000, 1000000));
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    // Delete any pre-existing tokens for this email then insert fresh OTP
    await db.delete(verificationTokens).where(eq(verificationTokens.identifier, email));
    await db.insert(verificationTokens).values({ identifier: email, token: otp, expires });

    try {
      const { name: platformName } = await getPlatformSettings();
      await sendEmail({
        to: email,
        subject: `${otp} is your ${platformName} verification code`,
        react: OtpEmailTemplate({ name: name ?? "there", otp, platformName }),
      });
    } catch (emailErr) {
      console.error("[signup] failed to send OTP email:", emailErr);
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("[signup]", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { passwordResetRequestSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = passwordResetRequestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email } = result.data;

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

      // Email template wired in Phase 13 — log URL for now
      console.log(`[dev] Password reset URL for ${email}: ${resetUrl}`);
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

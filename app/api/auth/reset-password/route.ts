import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { hashPassword } from "@/lib/password";
import { passwordResetSchema } from "@/lib/validations";
import { logAuthRejection } from "@/lib/auth-logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = passwordResetSchema.safeParse(body);
    if (!result.success) {
      logAuthRejection("reset-password", result.error.issues[0].message, req, {
        fields: result.error.issues.map((i) => i.path.join(".")),
      });
      // Generic — don't leak which field or complexity rule failed
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const { token, password } = result.data;

    const [record] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          gt(passwordResetTokens.expires, new Date())
        )
      )
      .limit(1);

    if (!record) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    await db
      .update(users)
      .set({ hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, record.userId));

    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[reset-password]", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

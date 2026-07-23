import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, verificationTokens } from "@/lib/db/schema";
import { and, eq, gt } from "drizzle-orm";
import { verifyEmailSchema } from "@/lib/validations";
import { logAuthRejection } from "@/lib/auth-logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = verifyEmailSchema.safeParse(body);
    if (!result.success) {
      logAuthRejection("verify-email", result.error.issues[0].message, req, {
        fields: result.error.issues.map((i) => i.path.join(".")),
      });
      // Generic — don't tell probers which field was malformed
      return NextResponse.json({ error: "Invalid or expired code." }, { status: 400 });
    }

    const { email, otp: code } = result.data;

    const [record] = await db
      .select()
      .from(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, email),
          eq(verificationTokens.token, code),
          gt(verificationTokens.expires, new Date())
        )
      )
      .limit(1);

    if (!record) {
      return NextResponse.json({ error: "Invalid or expired code." }, { status: 400 });
    }

    await db
      .update(users)
      .set({ emailVerified: new Date(), updatedAt: new Date() })
      .where(eq(users.email, email));

    await db
      .delete(verificationTokens)
      .where(eq(verificationTokens.identifier, email));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[verify-email]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

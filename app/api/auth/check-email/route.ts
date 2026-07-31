import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Pre-flight check before credentials sign-in.
 * Returns whether an email exists, is email/password based,
 * and whether it's verified — without exposing password info.
 * Used by the login page to detect "unverified email" before
 * calling NextAuth signIn (which would otherwise return the generic
 * "CredentialsSignin" error with no way to distinguish the cause).
 */
export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string" || email.length > 254) {
      return NextResponse.json({ status: "invalid" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const [user] = await db
      .select({
        hashedPassword: users.hashedPassword,
        emailVerified: users.emailVerified,
      })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user) {
      // Don't reveal that the email doesn't exist — fall through to signIn
      return NextResponse.json({ status: "ok" });
    }

    if (!user.hashedPassword) {
      // Google-only account — signIn will handle showing the correct message
      return NextResponse.json({ status: "google_only" });
    }

    if (!user.emailVerified) {
      return NextResponse.json({ status: "unverified" });
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("[check-email]", err);
    // On any unexpected error, fall through to signIn
    return NextResponse.json({ status: "ok" });
  }
}

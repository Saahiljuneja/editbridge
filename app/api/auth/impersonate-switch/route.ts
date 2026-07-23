import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, editors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { encode } from "next-auth/jwt";
import crypto from "crypto";

const DASHBOARD: Record<string, string> = {
  editor: "/editor/dashboard",
  client: "/client/dashboard",
  admin: "/admin/dashboard",
  staff_kyc: "/admin/dashboard",
  staff_support: "/admin/dashboard",
  staff_dispute: "/admin/dashboard",
  staff_moderation: "/admin/dashboard",
};

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";

  // Validate signature
  const parts = token.split(".");
  if (parts.length !== 2) return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  const [payloadB64, sig] = parts;
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(payloadB64)
    .digest("base64url");

  if (sig !== expectedSig) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  let payload: { userId: string; exp: number };
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
  } catch {
    return NextResponse.json({ error: "Malformed token" }, { status: 400 });
  }

  if (Date.now() > payload.exp)
    return NextResponse.json({ error: "Token expired" }, { status: 401 });

  // Fetch target user
  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name, image: users.image, role: users.role })
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Get editorId if applicable
  let editorId: string | null = null;
  if (user.role === "editor") {
    const [editor] = await db
      .select({ id: editors.id })
      .from(editors)
      .where(eq(editors.userId, user.id))
      .limit(1);
    editorId = editor?.id ?? null;
  }

  // Build a NextAuth JWT for this user
  const isSecure = process.env.NODE_ENV === "production";
  const cookieName = `${isSecure ? "__Secure-" : ""}authjs.session-token`;

  const jwt = await encode({
    token: {
      userId: user.id,
      sub: user.id,
      email: user.email,
      name: user.name,
      picture: user.image,
      role: user.role,
      editorId,
      needsOnboarding: false,
    },
    secret,
    salt: cookieName,
  });

  const dest = DASHBOARD[user.role] ?? "/";
  const res = NextResponse.redirect(new URL(dest, req.url));

  res.cookies.set(cookieName, jwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    path: "/",
    maxAge: 60 * 60, // 1 hour session
  });

  return res;
}

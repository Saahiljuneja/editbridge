import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const isSecure = process.env.NODE_ENV === "production";
  const sessionCookieName = `${isSecure ? "__Secure-" : ""}authjs.session-token`;
  const originalAdminCookieName = `${isSecure ? "__Secure-" : ""}authjs.original-admin-token`;

  const originalToken = req.cookies.get(originalAdminCookieName)?.value;

  if (!originalToken) {
    return NextResponse.redirect(new URL("/admin/dashboard", req.url));
  }

  const res = NextResponse.redirect(new URL("/admin/dashboard", req.url));

  // Set the session token back to the original admin token
  res.cookies.set(sessionCookieName, originalToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    path: "/",
    maxAge: 60 * 60, // 1 hour session
  });

  // Delete the original admin token cookie
  res.cookies.delete(originalAdminCookieName);

  return res;
}

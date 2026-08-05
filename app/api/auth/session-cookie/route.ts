import { type NextRequest, NextResponse } from "next/server";

// Converts the auth session cookie to a session cookie (no expiry),
// so it is deleted when the browser closes. Called after login when
// "Remember me" is unchecked.
export async function POST(req: NextRequest) {
  const COOKIE_NAMES = [
    "__Secure-authjs.session-token",
    "authjs.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.session-token",
  ];

  let cookieName: string | null = null;
  let cookieValue: string | null = null;

  for (const name of COOKIE_NAMES) {
    const c = req.cookies.get(name);
    if (c?.value) {
      cookieName = name;
      cookieValue = c.value;
      break;
    }
  }

  if (!cookieName || !cookieValue) {
    return NextResponse.json({ ok: false });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: cookieName,
    value: cookieValue,
    httpOnly: true,
    secure: cookieName.startsWith("__Secure-"),
    sameSite: "lax",
    path: "/",
    // No expires/maxAge — browser will delete this cookie when it closes
  });

  return res;
}

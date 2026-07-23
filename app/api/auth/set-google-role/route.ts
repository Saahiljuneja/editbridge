import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const { role } = await request.json();
  const validRole = role === "editor" ? "editor" : "client";

  const cookieStore = await cookies();
  cookieStore.set("pending_google_role", validRole, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 300, // 5 minutes — enough for the OAuth round-trip
  });

  return NextResponse.json({ ok: true });
}

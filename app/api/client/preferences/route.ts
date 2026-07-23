import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { parsePrefs } from "@/lib/notifications";

export type ClientNotifPrefs = {
  orderUpdate: boolean;
  delivery: boolean;
  message: boolean;
  dispute: boolean;
  marketing: boolean;
};

export const DEFAULT_CLIENT_NOTIF_PREFS: ClientNotifPrefs = {
  orderUpdate: true,
  delivery: true,
  message: true,
  dispute: true,
  marketing: true,
};

export async function GET() {
  const session = await auth();
  if (!session || !session.user.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [row] = await db
    .select({ notifPreferences: users.notifPreferences })
    .from(users)
    .where(eq(users.id, session.user.userId))
    .limit(1);

  return NextResponse.json({
    notif: parsePrefs(row?.notifPreferences, DEFAULT_CLIENT_NOTIF_PREFS),
  });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session || !session.user.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  if (body.notif) {
    await db
      .update(users)
      .set({ notifPreferences: JSON.stringify(body.notif) })
      .where(eq(users.id, session.user.userId));
  }

  return NextResponse.json({ ok: true });
}

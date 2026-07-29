import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userPreferences } from "@/lib/db/schema";
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

  let [row] = await db
    .select({ notifPreferences: userPreferences.notifPreferences })
    .from(userPreferences)
    .where(eq(userPreferences.userId, session.user.userId))
    .limit(1);

  if (!row) {
    const [newRow] = await db
      .insert(userPreferences)
      .values({
        userId: session.user.userId,
        notifPreferences: JSON.stringify(DEFAULT_CLIENT_NOTIF_PREFS),
      })
      .returning({ notifPreferences: userPreferences.notifPreferences });
    row = newRow;
  }

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
    const [existing] = await db
      .select({ id: userPreferences.id })
      .from(userPreferences)
      .where(eq(userPreferences.userId, session.user.userId))
      .limit(1);

    if (existing) {
      await db
        .update(userPreferences)
        .set({ notifPreferences: JSON.stringify(body.notif), updatedAt: new Date() })
        .where(eq(userPreferences.id, existing.id));
    } else {
      await db
        .insert(userPreferences)
        .values({
          userId: session.user.userId,
          notifPreferences: JSON.stringify(body.notif),
        });
    }
  }

  return NextResponse.json({ ok: true });
}

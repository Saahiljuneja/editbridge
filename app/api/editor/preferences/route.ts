import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userPreferences } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_EMAIL_PREFS as DEFAULT_EMAIL, DEFAULT_NOTIF_PREFS as DEFAULT_NOTIF, parsePrefs } from "@/lib/notifications";

export async function GET() {
  const session = await auth();
  if (!session || session.user?.role !== "editor" || !session.user.editorId || !session.user.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let [row] = await db
    .select({ emailPreferences: userPreferences.emailPreferences, notifPreferences: userPreferences.notifPreferences })
    .from(userPreferences)
    .where(eq(userPreferences.userId, session.user.userId))
    .limit(1);

  if (!row) {
    const [newRow] = await db
      .insert(userPreferences)
      .values({
        userId: session.user.userId,
        emailPreferences: JSON.stringify(DEFAULT_EMAIL),
        notifPreferences: JSON.stringify(DEFAULT_NOTIF),
      })
      .returning({ emailPreferences: userPreferences.emailPreferences, notifPreferences: userPreferences.notifPreferences });
    row = newRow;
  }

  return NextResponse.json({
    email: parsePrefs(row?.emailPreferences, DEFAULT_EMAIL),
    notif: parsePrefs(row?.notifPreferences, DEFAULT_NOTIF),
  });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "editor" || !session.user.editorId || !session.user.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const updates: Record<string, string | Date> = { updatedAt: new Date() };
  if (body.email) updates.emailPreferences = JSON.stringify(body.email);
  if (body.notif) updates.notifPreferences = JSON.stringify(body.notif);

  const [existing] = await db
    .select({ id: userPreferences.id })
    .from(userPreferences)
    .where(eq(userPreferences.userId, session.user.userId))
    .limit(1);

  if (existing) {
    await db
      .update(userPreferences)
      .set(updates)
      .where(eq(userPreferences.id, existing.id));
  } else {
    await db
      .insert(userPreferences)
      .values({
        userId: session.user.userId,
        emailPreferences: body.email ? JSON.stringify(body.email) : JSON.stringify(DEFAULT_EMAIL),
        notifPreferences: body.notif ? JSON.stringify(body.notif) : JSON.stringify(DEFAULT_NOTIF),
      });
  }

  return NextResponse.json({ ok: true });
}

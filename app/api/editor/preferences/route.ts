import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { editors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_EMAIL_PREFS as DEFAULT_EMAIL, DEFAULT_NOTIF_PREFS as DEFAULT_NOTIF, parsePrefs } from "@/lib/notifications";

export async function GET() {
  const session = await auth();
  if (!session || session.user?.role !== "editor" || !session.user.editorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [row] = await db
    .select({ emailPreferences: editors.emailPreferences, notifPreferences: editors.notifPreferences })
    .from(editors)
    .where(eq(editors.id, session.user.editorId))
    .limit(1);

  return NextResponse.json({
    email: parsePrefs(row?.emailPreferences, DEFAULT_EMAIL),
    notif: parsePrefs(row?.notifPreferences, DEFAULT_NOTIF),
  });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "editor" || !session.user.editorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const updates: Record<string, string> = {};
  if (body.email) updates.emailPreferences = JSON.stringify(body.email);
  if (body.notif) updates.notifPreferences = JSON.stringify(body.notif);

  if (Object.keys(updates).length > 0) {
    await db.update(editors).set(updates).where(eq(editors.id, session.user.editorId));
  }

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { editors, users, savedEditors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notifyEditorAvailable } from "@/lib/notifications";
import { revalidatePublicPagesCache } from "@/lib/revalidate";

// Notify clients who saved this editor that they're accepting orders again.
async function notifySavedClients(editorId: string) {
  const [editorUser] = await db
    .select({ name: users.name })
    .from(editors)
    .innerJoin(users, eq(users.id, editors.userId))
    .where(eq(editors.id, editorId))
    .limit(1);
  if (!editorUser) return;

  const clients = await db
    .select({ email: users.email, name: users.name })
    .from(savedEditors)
    .innerJoin(users, eq(users.id, savedEditors.clientId))
    .where(eq(savedEditors.editorId, editorId));

  if (clients.length === 0) return;

  notifyEditorAvailable({ editorId, editorName: editorUser.name ?? "Your editor", clients });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "editor" || !session.user.editorId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const editorId = session.user.editorId;
  const body = await req.json();

  const [before] = await db.select({ isAvailable: editors.isAvailable }).from(editors).where(eq(editors.id, editorId)).limit(1);
  const wasAvailable = before?.isAvailable ?? false;

  // Handle vacation mode: { vacationUntil: ISO string | null }
  if ("vacationUntil" in body) {
    const vacationUntil = body.vacationUntil ? new Date(body.vacationUntil) : null;
    const isAvailable = !vacationUntil || vacationUntil <= new Date();
    await db
      .update(editors)
      .set({ vacationUntil, isAvailable, updatedAt: new Date() })
      .where(eq(editors.id, editorId));

    if (!wasAvailable && isAvailable) notifySavedClients(editorId).catch(() => {});
    revalidatePublicPagesCache();
    return NextResponse.json({ ok: true });
  }

  // Handle simple availability toggle: { isAvailable: boolean }
  if (typeof body.isAvailable !== "boolean")
    return NextResponse.json({ error: "isAvailable must be boolean" }, { status: 400 });

  await db
    .update(editors)
    .set({ isAvailable: body.isAvailable, vacationUntil: null, updatedAt: new Date() })
    .where(eq(editors.id, editorId));

  if (!wasAvailable && body.isAvailable) notifySavedClients(editorId).catch(() => {});
  revalidatePublicPagesCache();
  return NextResponse.json({ ok: true });
}

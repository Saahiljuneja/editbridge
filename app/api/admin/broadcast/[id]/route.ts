import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { broadcasts, notifications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logAction } from "@/lib/audit";

const ALLOWED = ["admin", "staff_moderation", "staff_support"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { title, body, link } = await req.json();

  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Title and body required." }, { status: 400 });
  }

  const [existing] = await db.select({ id: broadcasts.id }).from(broadcasts).where(eq(broadcasts.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });

  // Update the broadcast record
  await db.update(broadcasts).set({
    title: title.trim(),
    body: body.trim(),
    link: link?.trim() || null,
    updatedAt: new Date(),
  }).where(eq(broadcasts.id, id));

  // Update all linked notification rows so users see the corrected message
  await db.update(notifications).set({
    title: title.trim(),
    body: body.trim(),
    link: link?.trim() || null,
    isRead: false, // mark unread so users notice the update
  }).where(eq(notifications.broadcastId, id));

  logAction({
    actorId: session.user.userId!,
    actorRole: session.user.role,
    action: "broadcast.edit",
    entityType: "broadcast",
    entityId: id,
    metadata: { title: title.trim() },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const [existing] = await db.select({ id: broadcasts.id }).from(broadcasts).where(eq(broadcasts.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });

  // Delete all notifications linked to this broadcast, then the broadcast itself
  await db.delete(notifications).where(eq(notifications.broadcastId, id));
  await db.delete(broadcasts).where(eq(broadcasts.id, id));

  logAction({
    actorId: session.user.userId!,
    actorRole: session.user.role,
    action: "broadcast.delete",
    entityType: "broadcast",
    entityId: id,
  });

  return NextResponse.json({ ok: true });
}

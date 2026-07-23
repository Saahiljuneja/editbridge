import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { announcements } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logAction } from "@/lib/audit";

const ALLOWED_ROLES = ["admin", "staff_moderation"];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  const updates: Record<string, unknown> = {};
  if ("isActive" in body) updates.isActive = body.isActive;
  if ("title" in body) updates.title = body.title;
  if ("body" in body) updates.body = body.body;
  await db.update(announcements).set(updates).where(eq(announcements.id, id));

  const action = "isActive" in body
    ? (body.isActive ? "announcement.activate" : "announcement.deactivate")
    : "announcement.edit";

  logAction({
    actorId: session.user.userId!,
    actorRole: session.user.role,
    action,
    entityType: "announcement",
    entityId: id,
    metadata: updates as Record<string, unknown>,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  await db.delete(announcements).where(eq(announcements.id, id));

  logAction({
    actorId: session.user.userId!,
    actorRole: session.user.role,
    action: "announcement.delete",
    entityType: "announcement",
    entityId: id,
  });

  return NextResponse.json({ ok: true });
}

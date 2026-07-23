import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { messages, auditLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { UserRole } from "@/types";

const ALLOWED: UserRole[] = ["admin", "staff_support", "staff_dispute", "staff_moderation"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  await db.update(messages).set({ isBlocked: false, blockedReason: null }).where(eq(messages.id, id));

  await db.insert(auditLogs).values({
    actorId: session.user.userId,
    actorRole: session.user.role as UserRole,
    action: "message_unblocked",
    entityType: "message",
    entityId: id,
    metadata: {},
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  await db.insert(auditLogs).values({
    actorId: session.user.userId,
    actorRole: session.user.role as UserRole,
    action: "message_deleted",
    entityType: "message",
    entityId: id,
    metadata: {},
  });

  await db.delete(messages).where(eq(messages.id, id));

  return NextResponse.json({ ok: true });
}

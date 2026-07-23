import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, auditLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const ALLOWED_ROLES = ["admin", "staff_moderation", "staff_support"];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (id === session.user.userId) {
    return NextResponse.json({ error: "Cannot suspend yourself." }, { status: 400 });
  }

  const { isActive, reason } = await req.json();

  await db.update(users).set({ isActive }).where(eq(users.id, id));

  await db.insert(auditLogs).values({
    actorId: session.user.userId,
    actorRole: session.user.role,
    action: isActive ? "user.unsuspend" : "user.suspend",
    entityType: "user",
    entityId: id,
    metadata: { reason: reason ?? null },
  });

  return NextResponse.json({ ok: true });
}

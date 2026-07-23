import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reviews, auditLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const ALLOWED = ["admin", "staff_moderation"];

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  await db.delete(reviews).where(eq(reviews.id, id));
  await db.insert(auditLogs).values({
    actorId: session.user.userId,
    actorRole: session.user.role,
    action: "review.remove",
    entityType: "review",
    entityId: id,
    metadata: {},
  });
  return NextResponse.json({ ok: true });
}

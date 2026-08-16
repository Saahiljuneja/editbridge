import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, desc, and, lt, gte } from "drizzle-orm";

// GET /api/notifications — list recent notifications for the current user
export async function GET() {
  const session = await auth();
  if (!session?.user?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.userId;
  const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Auto-delete notifications older than 30 days
  try {
    await db.delete(notifications).where(lt(notifications.createdAt, cutoffDate));
  } catch (e) {
    console.error("Failed to delete expired notifications:", e);
  }

  const rows = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        gte(notifications.createdAt, cutoffDate)
      )
    )
    .orderBy(desc(notifications.createdAt))
    .limit(20);

  return NextResponse.json(rows);
}

// PATCH /api/notifications — mark all as read
export async function PATCH() {
  const session = await auth();
  if (!session?.user?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.userId;
  const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false),
        gte(notifications.createdAt, cutoffDate)
      )
    );

  return NextResponse.json({ ok: true });
}

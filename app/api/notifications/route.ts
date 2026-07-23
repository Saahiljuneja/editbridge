import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

// GET /api/notifications — list recent notifications for the current user
export async function GET() {
  const session = await auth();
  if (!session?.user?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, session.user.userId))
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

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.userId, session.user.userId),
        eq(notifications.isRead, false)
      )
    );

  return NextResponse.json({ ok: true });
}

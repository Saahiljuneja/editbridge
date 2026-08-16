export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, desc, and, lt, gte } from "drizzle-orm";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.userId!;
  const { searchParams } = new URL(req.url);
  const limit = Math.min(20, Math.max(1, Number(searchParams.get("limit") ?? "8")));
  const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Auto-delete notifications older than 30 days
  try {
    await db.delete(notifications).where(lt(notifications.createdAt, cutoffDate));
  } catch (e) {
    console.error("Failed to delete expired notifications:", e);
  }

  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      body: notifications.body,
      link: notifications.link,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        gte(notifications.createdAt, cutoffDate)
      )
    )
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  return NextResponse.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.userId!;
  const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.userId, userId),
        gte(notifications.createdAt, cutoffDate)
      )
    );
  return NextResponse.json({ ok: true });
}

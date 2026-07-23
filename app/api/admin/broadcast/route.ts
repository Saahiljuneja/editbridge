import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, notifications, broadcasts } from "@/lib/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { logAction } from "@/lib/audit";

const ALLOWED = ["admin", "staff_moderation", "staff_support"];

export async function GET() {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db
    .select({
      id: broadcasts.id,
      title: broadcasts.title,
      body: broadcasts.body,
      link: broadcasts.link,
      targetRole: broadcasts.targetRole,
      sentCount: broadcasts.sentCount,
      createdAt: broadcasts.createdAt,
      updatedAt: broadcasts.updatedAt,
      sentByName: users.name,
    })
    .from(broadcasts)
    .innerJoin(users, eq(users.id, broadcasts.sentById))
    .orderBy(desc(broadcasts.createdAt))
    .limit(50);

  return NextResponse.json({ broadcasts: rows });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { title, body, link, targetRole, targetUserId } = await req.json();
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Title and body required." }, { status: 400 });
  }

  let targetUsers: { id: string }[] = [];

  if (targetUserId) {
    targetUsers = [{ id: targetUserId }];
  } else if (targetRole === "all") {
    targetUsers = await db.select({ id: users.id }).from(users).where(sql`${users.isActive} = true`);
  } else if (targetRole) {
    targetUsers = await db.select({ id: users.id }).from(users).where(eq(users.role, targetRole));
  } else {
    return NextResponse.json({ error: "Specify a target." }, { status: 400 });
  }

  if (targetUsers.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  // Create broadcast record first
  const [broadcast] = await db
    .insert(broadcasts)
    .values({
      title: title.trim(),
      body: body.trim(),
      link: link?.trim() || null,
      targetRole: targetUserId ? "user" : targetRole,
      sentCount: targetUsers.length,
      sentById: session.user.userId!,
    })
    .returning({ id: broadcasts.id });

  // Insert notifications linked to broadcast
  await db.insert(notifications).values(
    targetUsers.map(u => ({
      userId: u.id,
      type: "broadcast" as const,
      title: title.trim(),
      body: body.trim(),
      link: link?.trim() || null,
      broadcastId: broadcast.id,
    }))
  );

  logAction({
    actorId: session.user.userId!,
    actorRole: session.user.role,
    action: "broadcast.send",
    entityType: "broadcast",
    entityId: broadcast.id,
    metadata: { title: title.trim(), targetRole: targetUserId ? "user" : targetRole, sentCount: targetUsers.length },
  });

  return NextResponse.json({ ok: true, sent: targetUsers.length, broadcastId: broadcast.id });
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { announcements } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logAction } from "@/lib/audit";

const ALLOWED_ROLES = ["admin", "staff_moderation"];

export async function GET() {
  const session = await auth();
  if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const rows = await db.select().from(announcements).orderBy(announcements.createdAt);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { title, body, type, expiresAt, scheduledAt } = await req.json();
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Title and body are required." }, { status: 400 });
  }
  const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
  const isScheduled = scheduledDate ? scheduledDate > new Date() : false;
  const [row] = await db.insert(announcements).values({
    title: title.trim(),
    body: body.trim(),
    type: type ?? "info",
    isActive: !isScheduled,
    createdById: session.user.userId,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    scheduledAt: scheduledDate,
  }).returning();
  logAction({
    actorId: session.user.userId!,
    actorRole: session.user.role,
    action: "announcement.create",
    entityType: "announcement",
    entityId: row.id,
    metadata: { title: row.title, type: row.type },
  });

  return NextResponse.json(row);
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { logAction } from "@/lib/audit";
import type { UserRole } from "@/types";

const ALLOWED: UserRole[] = ["admin"];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { title, text, type } = body;

  if (!title || !text) {
    return NextResponse.json({ error: "Title and message text are required" }, { status: 400 });
  }

  await db.insert(notifications).values({
    userId: id,
    title,
    body: text,
    type: type || "system_alert",
    isRead: false,
  });

  logAction({
    actorId: session.user.userId!,
    actorRole: session.user.role as UserRole,
    action: "user.dispatch_notification",
    entityType: "user",
    entityId: id,
    metadata: { title, type },
  });

  return NextResponse.json({ ok: true });
}

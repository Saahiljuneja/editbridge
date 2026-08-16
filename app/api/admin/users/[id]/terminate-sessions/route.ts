import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logAction } from "@/lib/audit";
import type { UserRole } from "@/types";

const ALLOWED: UserRole[] = ["admin"];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Prevent self session termination from here
  if (session.user.userId === id) {
    return NextResponse.json({ error: "Cannot terminate your own session from here" }, { status: 400 });
  }

  await db.delete(sessions).where(eq(sessions.userId, id));

  logAction({
    actorId: session.user.userId!,
    actorRole: session.user.role as UserRole,
    action: "user.terminate_sessions",
    entityType: "user",
    entityId: id,
    metadata: { reason: "Force log out by Admin" },
  });

  return NextResponse.json({ success: true });
}

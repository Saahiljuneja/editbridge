import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, auditLogs } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import { z } from "zod";

const ALLOWED_ROLES = ["admin", "staff_moderation", "staff_support"];

const schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(["suspend", "unsuspend"]),
  reason: z.string().max(300).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { ids, action, reason } = parsed.data;

  // Never suspend yourself
  const safeIds = ids.filter((id) => id !== session.user.userId);
  if (safeIds.length === 0) {
    return NextResponse.json({ error: "Cannot suspend yourself." }, { status: 400 });
  }

  const isActive = action === "unsuspend";
  await db.update(users).set({ isActive }).where(inArray(users.id, safeIds));

  // Audit log each user individually (for compliance traceability)
  await db.insert(auditLogs).values(
    safeIds.map((userId) => ({
      actorId: session.user.userId!,
      actorRole: session.user.role,
      action: isActive ? "user.unsuspend" : "user.suspend",
      entityType: "user",
      entityId: userId,
      metadata: { reason: reason ?? null, bulk: true },
    }))
  );

  return NextResponse.json({ ok: true, affected: safeIds.length });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { assertPermission } from "@/lib/rbac";
import { logAction } from "@/lib/audit";
import { z } from "zod";
import type { UserRole } from "@/types";

const schema = z.object({
  role: z.enum(["client", "editor", "admin", "staff_kyc", "staff_support", "staff_dispute", "staff_moderation"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const deny = assertPermission(session?.user?.role, "users:change_role");
  if (!session || deny) return deny ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Prevent self role change
  if (session.user.userId === id) {
    return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await db
    .update(users)
    .set({ role: parsed.data.role, updatedAt: new Date() })
    .where(eq(users.id, id));

  logAction({
    actorId: session.user.userId!,
    actorRole: session.user.role as UserRole,
    action: "user.role_change",
    entityType: "user",
    entityId: id,
    metadata: { newRole: parsed.data.role },
  });

  return NextResponse.json({ success: true });
}

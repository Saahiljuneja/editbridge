import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLogs, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { assertPermission } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  const session = await auth();
  const deny = assertPermission(session?.user?.role, "audit:view");
  if (deny) return deny;

  const { searchParams } = request.nextUrl;
  const entityType = searchParams.get("entityType");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);

  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      actorRole: auditLogs.actorRole,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
      actorName: users.name,
      actorEmail: users.email,
    })
    .from(auditLogs)
    .innerJoin(users, eq(users.id, auditLogs.actorId))
    .where(entityType ? eq(auditLogs.entityType, entityType) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);

  return NextResponse.json({ logs: rows });
}

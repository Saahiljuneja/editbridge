import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userFeatureFlags } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
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
  const { featureKey, enabled } = body;

  if (typeof featureKey !== "string" || typeof enabled !== "boolean") {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  // Upsert user specific feature flag
  const [existing] = await db
    .select()
    .from(userFeatureFlags)
    .where(and(eq(userFeatureFlags.userId, id), eq(userFeatureFlags.featureKey, featureKey)))
    .limit(1);

  if (existing) {
    await db
      .update(userFeatureFlags)
      .set({ enabled })
      .where(eq(userFeatureFlags.id, existing.id));
  } else {
    await db
      .insert(userFeatureFlags)
      .values({
        userId: id,
        featureKey,
        enabled,
      });
  }

  logAction({
    actorId: session.user.userId!,
    actorRole: session.user.role as UserRole,
    action: enabled ? "user.feature_flag_enable" : "user.feature_flag_disable",
    entityType: "user",
    entityId: id,
    metadata: { featureKey, enabled },
  });

  return NextResponse.json({ success: true });
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { featureFlags } from "@/lib/db/schema";
import { logAction } from "@/lib/audit";
import {
  getAllFeatureFlags,
  bustFeatureFlagsCache,
  FEATURE_FLAG_REGISTRY,
  type FeatureFlagKey,
} from "@/lib/feature-flags";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ flags: await getAllFeatureFlags() });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { key, enabled } = await req.json();
  if (typeof key !== "string" || !(key in FEATURE_FLAG_REGISTRY) || typeof enabled !== "boolean") {
    return NextResponse.json({ error: "Invalid flag key or value" }, { status: 400 });
  }

  await db
    .insert(featureFlags)
    .values({ key: key as FeatureFlagKey, enabled, updatedBy: session.user.userId })
    .onConflictDoUpdate({
      target: featureFlags.key,
      set: { enabled, updatedBy: session.user.userId, updatedAt: new Date() },
    });

  bustFeatureFlagsCache();

  logAction({
    actorId: session.user.userId,
    actorRole: session.user.role,
    action: enabled ? "feature_flag.enable" : "feature_flag.disable",
    entityType: "feature_flag",
    entityId: key,
  });

  return NextResponse.json({ ok: true });
}

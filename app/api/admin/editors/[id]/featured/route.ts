import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { editors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logAction } from "@/lib/audit";
import { isFeatureEnabled } from "@/lib/feature-flags";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { isFeatured } = await req.json();

  if (isFeatured && !(await isFeatureEnabled("featured_placement"))) {
    return NextResponse.json({ error: "Featured placement is disabled platform-wide right now." }, { status: 403 });
  }

  // Manual override — no charge, no featured_payments record. Uses a far-future
  // expiry (rather than null) so it plays nice with the same featured_until
  // comparisons the paid flow and expiry cron rely on elsewhere.
  const FAR_FUTURE = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000);
  await db
    .update(editors)
    .set({ isFeatured: !!isFeatured, featuredUntil: isFeatured ? FAR_FUTURE : new Date(0), updatedAt: new Date() })
    .where(eq(editors.id, id));

  logAction({
    actorId: session.user.userId,
    actorRole: session.user.role,
    action: isFeatured ? "editor.feature_manual" : "editor.unfeature_manual",
    entityType: "editor",
    entityId: id,
  });

  return NextResponse.json({ ok: true });
}

import { db } from "@/lib/db";
import { profileEvents, portfolioItems } from "@/lib/db/schema";
import { and, eq, gte, inArray } from "drizzle-orm";

const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Records a profile view. Logged-in viewers are deduped to one count per
 * editor per hour. Anonymous viewers have no durable identifier to dedupe
 * against (no IP capture, no cookie writes from a page render), so every
 * anonymous load counts — editors care most about distinct signed-in
 * visitors, and this avoids storing anything about anonymous traffic at all.
 */
export async function recordProfileView(editorId: string, viewerId: string | null): Promise<void> {
  try {
    if (viewerId) {
      const since = new Date(Date.now() - ONE_HOUR_MS);
      const [existing] = await db
        .select({ id: profileEvents.id })
        .from(profileEvents)
        .where(
          and(
            eq(profileEvents.editorId, editorId),
            eq(profileEvents.viewerId, viewerId),
            eq(profileEvents.eventType, "profile_view"),
            gte(profileEvents.createdAt, since)
          )
        )
        .limit(1);
      if (existing) return;
    }

    await db.insert(profileEvents).values({ editorId, eventType: "profile_view", viewerId });
  } catch (err) {
    console.error("[profile-events] recordProfileView failed:", err);
  }
}

/**
 * Records an impression for every portfolio item shown on a profile load —
 * "viewed" here means appeared on screen, not clicked (the grid has no
 * click-through today). Same dedupe rule as profile views.
 */
export async function recordPortfolioImpressions(
  editorId: string,
  portfolioItemIds: string[],
  viewerId: string | null
): Promise<void> {
  if (portfolioItemIds.length === 0) return;
  try {
    let idsToRecord = portfolioItemIds;

    if (viewerId) {
      const since = new Date(Date.now() - ONE_HOUR_MS);
      const already = await db
        .select({ entityId: profileEvents.entityId })
        .from(profileEvents)
        .where(
          and(
            eq(profileEvents.editorId, editorId),
            eq(profileEvents.viewerId, viewerId),
            eq(profileEvents.eventType, "portfolio_view"),
            gte(profileEvents.createdAt, since),
            inArray(profileEvents.entityId, portfolioItemIds)
          )
        );
      const seen = new Set(already.map((a) => a.entityId));
      idsToRecord = portfolioItemIds.filter((id) => !seen.has(id));
    }

    if (idsToRecord.length === 0) return;
    await db.insert(profileEvents).values(
      idsToRecord.map((entityId) => ({ editorId, eventType: "portfolio_view" as const, entityId, viewerId }))
    );
  } catch (err) {
    console.error("[profile-events] recordPortfolioImpressions failed:", err);
  }
}

/** Resolves which editor owns a package or portfolio item, for click events fired from the client. */
export async function resolveEditorForEntity(
  eventType: "package_click" | "portfolio_view",
  entityId: string
): Promise<string | null> {
  if (eventType === "package_click") {
    const { packages } = await import("@/lib/db/schema");
    const [row] = await db.select({ editorId: packages.editorId }).from(packages).where(eq(packages.id, entityId)).limit(1);
    return row?.editorId ?? null;
  }
  const [row] = await db.select({ editorId: portfolioItems.editorId }).from(portfolioItems).where(eq(portfolioItems.id, entityId)).limit(1);
  return row?.editorId ?? null;
}

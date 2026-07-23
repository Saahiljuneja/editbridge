import { db } from "@/lib/db";
import { orders, portfolioItems } from "@/lib/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

// Below this many completed orders, an on-time rate is statistical noise —
// show nothing rather than a misleading 100%/0% from a single data point.
const MIN_COMPLETED_FOR_ON_TIME_BADGE = 3;

/**
 * On-time delivery rate per editor, auto-calculated from completed orders
 * (deliveredAt vs. the — possibly revision-extended — deadline). Never
 * self-reported. Returns null for editors below the minimum sample size.
 */
export async function getOnTimeRates(editorIds: string[]): Promise<Record<string, number | null>> {
  if (editorIds.length === 0) return {};

  const rows = await db
    .select({
      editorId: orders.editorId,
      total: sql<number>`COUNT(*)::int`,
      onTime: sql<number>`COUNT(*) FILTER (WHERE ${orders.deliveredAt} <= ${orders.deadline})::int`,
    })
    .from(orders)
    .where(and(eq(orders.status, "completed"), inArray(orders.editorId, editorIds)))
    .groupBy(orders.editorId);

  const result: Record<string, number | null> = {};
  for (const row of rows) {
    result[row.editorId] =
      row.total >= MIN_COMPLETED_FOR_ON_TIME_BADGE ? Math.round((row.onTime / row.total) * 100) : null;
  }
  return result;
}

/**
 * Count of portfolio items genuinely linked to one of the editor's own
 * completed orders — the "Verified portfolio" trust signal.
 */
export async function getVerifiedPortfolioCounts(editorIds: string[]): Promise<Record<string, number>> {
  if (editorIds.length === 0) return {};

  const rows = await db
    .select({
      editorId: portfolioItems.editorId,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(portfolioItems)
    .innerJoin(orders, eq(orders.id, portfolioItems.orderId))
    .where(
      and(
        inArray(portfolioItems.editorId, editorIds),
        eq(orders.status, "completed"),
        eq(orders.editorId, portfolioItems.editorId)
      )
    )
    .groupBy(portfolioItems.editorId);

  const result: Record<string, number> = {};
  for (const row of rows) result[row.editorId] = row.count;
  return result;
}

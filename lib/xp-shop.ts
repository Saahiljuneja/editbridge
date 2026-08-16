import { db } from "@/lib/db";
import { userPoints, pointTransactions, xpBoosts } from "@/lib/db/schema";
import { eq, and, gt, isNull, or, gte, sql } from "drizzle-orm";
import { SHOP_ITEMS, PROFILE_FRAMES, calcEditorLevel, EDITOR_LEVELS } from "@/lib/xp-shop-config";
import type { BoostType, FrameKey } from "@/lib/xp-shop-config";
export type { BoostType, ShopItem, FrameKey, FrameItem } from "@/lib/xp-shop-config";
export { SHOP_ITEMS, PROFILE_FRAMES, FRAME_STYLES, PORTFOLIO_TIERS, REGULAR_SHOP_ITEMS, getPortfolioSlots } from "@/lib/xp-shop-config";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns all owned boosts/frames for a user (non-expired + permanent). */
export async function getActiveBoosts(userId: string): Promise<{ type: string; expiresAt: Date | null }[]> {
  const now = new Date();
  return db
    .select({ type: xpBoosts.type, expiresAt: xpBoosts.expiresAt })
    .from(xpBoosts)
    .where(
      and(
        eq(xpBoosts.userId, userId),
        or(isNull(xpBoosts.expiresAt), gt(xpBoosts.expiresAt, now))
      )
    );
}

/** Returns true if user has a specific active boost or owns a frame. */
export async function hasActiveBoost(userId: string, type: BoostType | FrameKey): Promise<boolean> {
  const boosts = await getActiveBoosts(userId);
  return boosts.some(b => b.type === type);
}

/** Purchase a boost item. */
export async function purchaseBoost(
  userId: string,
  type: BoostType
): Promise<{ success: boolean; error?: string }> {
  const item = SHOP_ITEMS.find(i => i.type === type);
  if (!item) return { success: false, error: "Invalid item" };

  if (await hasActiveBoost(userId, type)) {
    return { success: false, error: "You already have an active boost of this type" };
  }

  // Check required prerequisite boost
  if (item.requiresActive) {
    const hasReq = await hasActiveBoost(userId, item.requiresActive);
    if (!hasReq) {
      const reqItem = SHOP_ITEMS.find(i => i.type === item.requiresActive);
      return { success: false, error: `Requires "${reqItem?.label ?? item.requiresActive}" to be active first` };
    }
  }

  // Check monthly purchase cap
  if (item.maxPerMonth) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const rows = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(pointTransactions)
      .where(
        and(
          eq(pointTransactions.userId, userId),
          eq(pointTransactions.reason, `xp_shop_${type}`),
          gte(pointTransactions.createdAt, monthStart)
        )
      );
    const monthCount = rows[0]?.c ?? 0;
    if (monthCount >= item.maxPerMonth) {
      return { success: false, error: `Monthly limit reached — max ${item.maxPerMonth}× per month` };
    }
  }

  const [pts] = await db
    .select({ current: userPoints.current, total: userPoints.total })
    .from(userPoints)
    .where(eq(userPoints.userId, userId))
    .limit(1);

  if (!pts) return { success: false, error: "Points record not found" };

  if (item.minLevel) {
    const editorLevel = calcEditorLevel(pts.total);
    if (editorLevel.level < item.minLevel) {
      const reqName = EDITOR_LEVELS.find((l: any) => l.level === item.minLevel)?.label ?? `Level ${item.minLevel}`;
      return { success: false, error: `Requires Level ${item.minLevel} (${reqName}) to unlock` };
    }
  }

  if (pts.current < item.cost) {
    return { success: false, error: "Not enough spendable XP" };
  }

  const expiresAt = item.durationDays
    ? new Date(Date.now() + item.durationDays * 86_400_000)
    : null;

  await Promise.all([
    db.update(userPoints).set({ current: pts.current - item.cost, updatedAt: new Date() }).where(eq(userPoints.userId, userId)),
    db.insert(pointTransactions).values({ userId, amount: -item.cost, reason: `xp_shop_${type}` }),
    db.insert(xpBoosts).values({ userId, type, expiresAt }),
  ]);

  return { success: true };
}

/** Purchase a profile frame (permanent, one-time unlock). */
export async function purchaseFrame(
  userId: string,
  frameKey: FrameKey
): Promise<{ success: boolean; error?: string }> {
  const frame = PROFILE_FRAMES.find(f => f.key === frameKey);
  if (!frame) return { success: false, error: "Invalid frame" };

  if (await hasActiveBoost(userId, frameKey)) {
    return { success: false, error: "Frame already unlocked" };
  }

  const [pts] = await db
    .select({ current: userPoints.current, total: userPoints.total })
    .from(userPoints)
    .where(eq(userPoints.userId, userId))
    .limit(1);

  if (!pts) return { success: false, error: "Points record not found" };

  if (frame.minLevel) {
    const editorLevel = calcEditorLevel(pts.total);
    if (editorLevel.level < frame.minLevel) {
      const reqName = EDITOR_LEVELS.find((l: any) => l.level === frame.minLevel)?.label ?? `Level ${frame.minLevel}`;
      return { success: false, error: `Requires Level ${frame.minLevel} (${reqName}) to unlock` };
    }
  }

  if (pts.current < frame.cost) {
    return { success: false, error: "Not enough spendable XP" };
  }

  await Promise.all([
    db.update(userPoints).set({ current: pts.current - frame.cost, updatedAt: new Date() }).where(eq(userPoints.userId, userId)),
    db.insert(pointTransactions).values({ userId, amount: -frame.cost, reason: `xp_frame_${frameKey}` }),
    db.insert(xpBoosts).values({ userId, type: frameKey, expiresAt: null }),
  ]);

  return { success: true };
}

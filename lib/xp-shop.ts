import { db } from "@/lib/db";
import { userPoints, pointTransactions, xpBoosts } from "@/lib/db/schema";
import { eq, and, gt, isNull, or } from "drizzle-orm";
import { SHOP_ITEMS, PROFILE_FRAMES } from "@/lib/xp-shop-config";
import type { BoostType, FrameKey } from "@/lib/xp-shop-config";
export type { BoostType, ShopItem, FrameKey, FrameItem } from "@/lib/xp-shop-config";
export { SHOP_ITEMS, PROFILE_FRAMES, FRAME_STYLES } from "@/lib/xp-shop-config";

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

  const [pts] = await db
    .select({ current: userPoints.current })
    .from(userPoints)
    .where(eq(userPoints.userId, userId))
    .limit(1);

  if (!pts || pts.current < item.cost) {
    return { success: false, error: "Not enough XP" };
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
    .select({ current: userPoints.current })
    .from(userPoints)
    .where(eq(userPoints.userId, userId))
    .limit(1);

  if (!pts || pts.current < frame.cost) {
    return { success: false, error: "Not enough XP" };
  }

  await Promise.all([
    db.update(userPoints).set({ current: pts.current - frame.cost, updatedAt: new Date() }).where(eq(userPoints.userId, userId)),
    db.insert(pointTransactions).values({ userId, amount: -frame.cost, reason: `xp_frame_${frameKey}` }),
    db.insert(xpBoosts).values({ userId, type: frameKey, expiresAt: null }),
  ]);

  return { success: true };
}

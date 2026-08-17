import { db } from "@/lib/db";
import { userPoints, pointTransactions, xpBoosts } from "@/lib/db/schema";
import { eq, and, gt, isNull, or, gte, sql } from "drizzle-orm";
import { addCredit, calcLevel, CLIENT_LEVELS } from "@/lib/rewards";
import { CLIENT_STORE_ITEMS, PATRON_BADGES } from "@/lib/client-xp-store-config";
import type { ClientItemType, PatronBadgeKey } from "@/lib/client-xp-store-config";

export type { ClientItemType, PatronBadgeKey, ClientStoreItem, PatronBadge } from "@/lib/client-xp-store-config";
export { CLIENT_STORE_ITEMS, PATRON_BADGES } from "@/lib/client-xp-store-config";

export async function getActiveClientBoosts(userId: string) {
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

export async function redeemClientItem(
  userId: string,
  type: ClientItemType
): Promise<{ success: boolean; error?: string }> {
  const item = CLIENT_STORE_ITEMS.find(i => i.type === type);
  if (!item) return { success: false, error: "Invalid item" };

  // For timed boosts (no monthly cap), block if one is already active
  if (!item.maxPerMonth && item.durationDays) {
    const existing = await db
      .select({ id: xpBoosts.id })
      .from(xpBoosts)
      .where(
        and(
          eq(xpBoosts.userId, userId),
          eq(xpBoosts.type, type),
          or(isNull(xpBoosts.expiresAt), gt(xpBoosts.expiresAt, new Date()))
        )
      )
      .limit(1);
    if (existing.length > 0) {
      return { success: false, error: "You already have an active boost of this type" };
    }
  }

  // Monthly cap check
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
          eq(pointTransactions.reason, `client_store_${type}`),
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
    const clientLevel = calcLevel(pts.total, "client");
    const levelMeta = CLIENT_LEVELS.find((l: any) => l.name === clientLevel);
    const currentLevelNum = levelMeta ? CLIENT_LEVELS.indexOf(levelMeta) + 1 : 1;
    if (currentLevelNum < item.minLevel) {
      const reqLevelName = CLIENT_LEVELS[item.minLevel - 1]?.label ?? `Level ${item.minLevel}`;
      return { success: false, error: `Requires Level ${item.minLevel} (${reqLevelName}) to unlock` };
    }
  }

  if (pts.current < item.cost) {
    return { success: false, error: "Not enough spendable XP credits" };
  }

  const expiresAt = item.durationDays
    ? new Date(Date.now() + item.durationDays * 86_400_000)
    : null;

  await db
    .update(userPoints)
    .set({ current: pts.current - item.cost, updatedAt: new Date() })
    .where(eq(userPoints.userId, userId));

  await db.insert(pointTransactions).values({
    userId,
    amount: -item.cost,
    reason: `client_store_${type}`,
  });

  if (type.startsWith("credit_") || type === "xp_credit_swap") {
    await addCredit(userId, item.creditReward!, `${item.label} conversion`);
  } else {
    await db.insert(xpBoosts).values({ userId, type, expiresAt });
  }

  return { success: true };
}

export async function redeemPatronBadge(
  userId: string,
  badgeKey: PatronBadgeKey
): Promise<{ success: boolean; error?: string }> {
  const badge = PATRON_BADGES.find(b => b.key === badgeKey);
  if (!badge) return { success: false, error: "Invalid badge" };

  const existing = await db
    .select({ id: xpBoosts.id })
    .from(xpBoosts)
    .where(and(eq(xpBoosts.userId, userId), eq(xpBoosts.type, badgeKey)))
    .limit(1);
  if (existing.length > 0) return { success: false, error: "Badge already owned" };

  const [pts] = await db
    .select({ current: userPoints.current })
    .from(userPoints)
    .where(eq(userPoints.userId, userId))
    .limit(1);

  if (!pts || pts.current < badge.cost) {
    return { success: false, error: "Not enough XP" };
  }

  await Promise.all([
    db
      .update(userPoints)
      .set({ current: pts.current - badge.cost, updatedAt: new Date() })
      .where(eq(userPoints.userId, userId)),
    db.insert(pointTransactions).values({
      userId,
      amount: -badge.cost,
      reason: `patron_badge_${badgeKey}`,
    }),
    db.insert(xpBoosts).values({ userId, type: badgeKey, expiresAt: null }),
  ]);

  return { success: true };
}

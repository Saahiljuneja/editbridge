import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { userPoints, pointTransactions } from "@/lib/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { getActiveClientBoosts } from "@/lib/client-xp-store";
import { PATRON_BADGES } from "@/lib/client-xp-store-config";
import { XpStoreClient } from "./xp-store-client";

export const dynamic = "force-dynamic";

export default async function ClientXpStorePage() {
  const session = await auth();
  if (!session?.user?.userId || session.user.role !== "client") redirect("/login");

  const userId = session.user.userId;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [ptsRow, activeBoosts, swapRow] = await Promise.all([
    db
      .select({ current: userPoints.current, total: userPoints.total })
      .from(userPoints)
      .where(eq(userPoints.userId, userId))
      .limit(1),
    getActiveClientBoosts(userId),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(pointTransactions)
      .where(
        and(
          eq(pointTransactions.userId, userId),
          eq(pointTransactions.reason, "client_store_xp_credit_swap"),
          gte(pointTransactions.createdAt, monthStart)
        )
      ),
  ]);

  const currentXp         = ptsRow[0]?.current ?? 0;
  const totalXp           = ptsRow[0]?.total ?? 0;
  const activeTypes       = activeBoosts.map(b => b.type);
  const boostExpiry       = Object.fromEntries(
    activeBoosts.map(b => [b.type, b.expiresAt?.toISOString() ?? null])
  );
  const ownedBadges       = activeBoosts
    .filter(b => PATRON_BADGES.some(p => p.key === b.type))
    .map(b => b.type);
  const swapUsedThisMonth = swapRow[0]?.c ?? 0;

  return (
    <XpStoreClient
      currentXp={currentXp}
      totalXp={totalXp}
      activeTypes={activeTypes}
      boostExpiry={boostExpiry}
      ownedBadges={ownedBadges}
      swapUsedThisMonth={swapUsedThisMonth}
    />
  );
}

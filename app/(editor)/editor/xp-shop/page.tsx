import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { userPoints, editors, pointTransactions } from "@/lib/db/schema";
import { eq, and, lt, desc } from "drizzle-orm";
import { getActiveBoosts } from "@/lib/xp-shop";
import { PROFILE_FRAMES } from "@/lib/xp-shop-config";
import { XpShopClient } from "./xp-shop-client";

export default async function XpShopPage() {
  const session = await auth();
  if (!session?.user?.userId) redirect("/login");

  const [ptsRow, activeBoosts, editorRow, historyRows] = await Promise.all([
    db.select({ current: userPoints.current }).from(userPoints).where(eq(userPoints.userId, session.user.userId)).limit(1),
    getActiveBoosts(session.user.userId),
    session.user.editorId
      ? db.select({ activeFrame: editors.activeFrame }).from(editors).where(eq(editors.id, session.user.editorId)).limit(1)
      : Promise.resolve([{ activeFrame: null }]),
    db.select({
      id: pointTransactions.id,
      amount: pointTransactions.amount,
      reason: pointTransactions.reason,
      createdAt: pointTransactions.createdAt,
    })
    .from(pointTransactions)
    .where(eq(pointTransactions.userId, session.user.userId))
    .orderBy(desc(pointTransactions.createdAt))
    .limit(10),
  ]);

  const currentXp     = ptsRow[0]?.current ?? 0;
  const activeTypes   = new Set(activeBoosts.map(b => b.type));
  const boostExpiry   = Object.fromEntries(activeBoosts.map(b => [b.type, b.expiresAt?.toISOString() ?? null]));
  const ownedFrames   = new Set(activeBoosts.filter(b => PROFILE_FRAMES.some(f => f.key === b.type)).map(b => b.type));
  const activeFrame   = editorRow[0]?.activeFrame ?? null;

  const history = historyRows.map(h => ({
    id: h.id,
    amount: h.amount,
    reason: h.reason,
    createdAt: h.createdAt.toISOString(),
  }));

  return (
    <XpShopClient
      currentXp={currentXp}
      activeTypes={[...activeTypes]}
      boostExpiry={boostExpiry}
      ownedFrames={[...ownedFrames]}
      activeFrame={activeFrame}
      history={history}
    />
  );
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { pointTransactions, users, editors } from "@/lib/db/schema";
import { eq, sql, desc, gte, inArray, and } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.userId ?? null;

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));

    // Top 10 editors by XP earned this week
    const rows = await db
      .select({
        userId: pointTransactions.userId,
        weekXp: sql<number>`CAST(SUM(${pointTransactions.amount}) AS INTEGER)`,
      })
      .from(pointTransactions)
      .where(gte(pointTransactions.createdAt, weekStart))
      .groupBy(pointTransactions.userId)
      .orderBy(desc(sql`SUM(${pointTransactions.amount})`))
      .limit(10);

    // Current user's week XP and rank
    let myRank: number | null = null;
    let myWeekXp: number | null = null;

    if (userId) {
      const [myRow] = await db
        .select({ w: sql<number>`COALESCE(SUM(${pointTransactions.amount})::int, 0)` })
        .from(pointTransactions)
        .where(and(eq(pointTransactions.userId, userId), gte(pointTransactions.createdAt, weekStart)));

      myWeekXp = myRow?.w ?? 0;

      // Count users who earned more this week → my rank = that count + 1
      const aboveMe = await db
        .select({ uid: pointTransactions.userId })
        .from(pointTransactions)
        .where(gte(pointTransactions.createdAt, weekStart))
        .groupBy(pointTransactions.userId)
        .having(sql`SUM(${pointTransactions.amount}) > ${myWeekXp}`);

      myRank = aboveMe.length + 1;
    }

    if (!rows.length) {
      return NextResponse.json({ entries: [], myRank, myWeekXp, myUserId: userId });
    }

    const userIds = rows.map(r => r.userId);
    const profiles = await db
      .select({ userId: users.id, name: users.name, image: users.image, editorId: editors.id })
      .from(users)
      .leftJoin(editors, eq(editors.userId, users.id))
      .where(inArray(users.id, userIds));

    const profileMap = new Map(profiles.map(p => [p.userId, p]));

    return NextResponse.json({
      entries: rows.map((r, i) => ({
        rank: i + 1,
        userId: r.userId,
        weekXp: r.weekXp,
        name: profileMap.get(r.userId)?.name ?? "Unknown",
        image: profileMap.get(r.userId)?.image ?? null,
        editorId: profileMap.get(r.userId)?.editorId ?? null,
      })),
      myRank,
      myWeekXp,
      myUserId: userId,
    });
  } catch (err) {
    console.error("Leaderboard error:", err);
    return NextResponse.json({ entries: [], myRank: null, myWeekXp: null, myUserId: null });
  }
}

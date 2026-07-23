import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pointTransactions, users, editors } from "@/lib/db/schema";
import { eq, sql, desc, gte, inArray } from "drizzle-orm";

export async function GET() {
  try {
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

    if (!rows.length) return NextResponse.json([]);

    const userIds = rows.map(r => r.userId);

    const profiles = await db
      .select({
        userId: users.id,
        name: users.name,
        image: users.image,
        editorId: editors.id,
      })
      .from(users)
      .leftJoin(editors, eq(editors.userId, users.id))
      .where(inArray(users.id, userIds));

    const profileMap = new Map(profiles.map(p => [p.userId, p]));

    return NextResponse.json(
      rows.map((r, i) => ({
        rank: i + 1,
        userId: r.userId,
        weekXp: r.weekXp,
        name: profileMap.get(r.userId)?.name ?? "Unknown",
        image: profileMap.get(r.userId)?.image ?? null,
        editorId: profileMap.get(r.userId)?.editorId ?? null,
      }))
    );
  } catch (err) {
    console.error("Leaderboard error:", err);
    return NextResponse.json([]);
  }
}

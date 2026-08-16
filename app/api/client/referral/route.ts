import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, referrals } from "@/lib/db/schema";
import { eq, desc, sql, count } from "drizzle-orm";
import crypto from "crypto";

export async function GET() {
  const session = await auth();
  if (!session?.user?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.userId;

  let [user] = await db
    .select({ referralCode: users.referralCode })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user?.referralCode) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    await db
      .update(users)
      .set({ referralCode: code, updatedAt: new Date() })
      .where(eq(users.id, userId));
    user = { referralCode: code };
  }

  const [stats] = await db
    .select({
      total: count(),
      successful: sql<number>`COUNT(*) FILTER (WHERE ${referrals.rewardedAt} IS NOT NULL)::int`,
      creditsEarned: sql<number>`COALESCE(SUM(${referrals.creditAwarded}), 0)::int`,
    })
    .from(referrals)
    .where(eq(referrals.referrerId, userId));

  const list = await db
    .select({
      id: referrals.id,
      creditAwarded: referrals.creditAwarded,
      rewardedAt: referrals.rewardedAt,
      createdAt: referrals.createdAt,
    })
    .from(referrals)
    .where(eq(referrals.referrerId, userId))
    .orderBy(desc(referrals.createdAt))
    .limit(10);

  return NextResponse.json({
    referralCode: user.referralCode,
    stats: {
      total: stats?.total ?? 0,
      successful: stats?.successful ?? 0,
      creditsEarned: stats?.creditsEarned ?? 0,
    },
    referrals: list,
  });
}

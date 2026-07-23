import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { pointTransactions, userCredits } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.userId;

  const [xpHistory, creditHistory] = await Promise.all([
    db
      .select({ id: pointTransactions.id, amount: pointTransactions.amount, reason: pointTransactions.reason, createdAt: pointTransactions.createdAt })
      .from(pointTransactions)
      .where(eq(pointTransactions.userId, userId))
      .orderBy(desc(pointTransactions.createdAt))
      .limit(50),

    db
      .select({ id: userCredits.id, amount: userCredits.amount, reason: userCredits.reason, expiresAt: userCredits.expiresAt, usedAt: userCredits.usedAt, createdAt: userCredits.createdAt })
      .from(userCredits)
      .where(eq(userCredits.userId, userId))
      .orderBy(desc(userCredits.createdAt))
      .limit(50),
  ]);

  return NextResponse.json({ xpHistory, creditHistory });
}

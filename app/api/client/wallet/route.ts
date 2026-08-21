import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userCredits } from "@/lib/db/schema";
import { getAvailableCredits } from "@/lib/rewards";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session || session.user?.role !== "client") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.userId!;

  const [credits, transactions] = await Promise.all([
    getAvailableCredits(userId),
    db
      .select({
        id: userCredits.id,
        amount: userCredits.amount,
        reason: userCredits.reason,
        expiresAt: userCredits.expiresAt,
        usedAt: userCredits.usedAt,
        createdAt: userCredits.createdAt,
      })
      .from(userCredits)
      .where(eq(userCredits.userId, userId))
      .orderBy(desc(userCredits.createdAt))
      .limit(50),
  ]);

  return NextResponse.json({
    balance: credits.total,
    transactions,
  });
}

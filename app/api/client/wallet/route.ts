import { NextRequest, NextResponse } from "next/server";
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

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "client") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.userId!;
  try {
    const { amount } = await request.json();
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount specified" }, { status: 400 });
    }

    const amountInPaise = Math.round(amount * 100);

    // Insert wallet load transaction (does not expire)
    await db.insert(userCredits).values({
      userId,
      amount: amountInPaise,
      reason: "Wallet Top-up",
      expiresAt: null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Wallet top-up failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userPoints, pointTransactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { UserRole } from "@/types";

const ALLOWED: UserRole[] = ["admin"];

function getLevel(total: number): string {
  if (total >= 5000) return "platinum";
  if (total >= 2000) return "gold";
  if (total >= 500) return "silver";
  return "bronze";
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { amount, reason } = body;

  const xp = Number(amount);
  if (isNaN(xp) || xp === 0)
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

  await db.insert(pointTransactions).values({
    userId: id,
    amount: xp,
    reason: (reason as string) || "admin_grant",
  });

  const [existing] = await db.select().from(userPoints).where(eq(userPoints.userId, id)).limit(1);

  if (existing) {
    const newTotal = Math.max(0, existing.total + xp);
    const newCurrent = Math.max(0, existing.current + xp);
    await db
      .update(userPoints)
      .set({ total: newTotal, current: newCurrent, level: getLevel(newTotal), updatedAt: new Date() })
      .where(eq(userPoints.userId, id));
  } else {
    const newTotal = Math.max(0, xp);
    await db.insert(userPoints).values({
      userId: id,
      total: newTotal,
      current: newTotal,
      level: getLevel(newTotal),
    });
  }

  return NextResponse.json({ ok: true });
}

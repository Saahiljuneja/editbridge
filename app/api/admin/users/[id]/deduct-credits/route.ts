import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userCredits, users } from "@/lib/db/schema";
import { getAvailableCredits } from "@/lib/rewards";
import { eq, and, sql } from "drizzle-orm";
import { logAction } from "@/lib/audit";
import { createInAppNotification } from "@/lib/notifications";
import type { UserRole } from "@/types";

const ALLOWED: UserRole[] = ["admin"];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { amountInr, reason } = body;

  const num = Number(amountInr);
  if (!num || isNaN(num) || num <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const amountPaise = Math.round(num * 100);

  const [targetUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check if they have enough available credits
  const { total, rows } = await getAvailableCredits(id);
  if (total < amountPaise) {
    return NextResponse.json({ error: `User only has ₹${(total / 100).toFixed(2)} in wallet.` }, { status: 400 });
  }

  // Consume/Split credits
  let remaining = amountPaise;
  for (const row of rows) {
    if (remaining <= 0) break;
    if (row.amount <= remaining) {
      await db
        .update(userCredits)
        .set({ usedAt: new Date(), reason: `Deducted by Admin: ${reason || "No reason specified"}` })
        .where(eq(userCredits.id, row.id));
      remaining -= row.amount;
    } else {
      // Split the row: consume it completely, insert a new one with the remaining balance
      await db
        .update(userCredits)
        .set({ usedAt: new Date(), reason: `Deducted by Admin: ${reason || "No reason specified"}` })
        .where(eq(userCredits.id, row.id));

      const newAmount = row.amount - remaining;
      await db.insert(userCredits).values({
        userId: id,
        amount: newAmount,
        reason: `Remaining balance after deduction`,
      });
      remaining = 0;
    }
  }

  logAction({
    actorId: session.user.userId!,
    actorRole: session.user.role as UserRole,
    action: "wallet.credits_deduct",
    entityType: "user",
    entityId: id,
    metadata: { amountInr: num, reason },
  });

  await createInAppNotification({
    userId: id,
    type: "wallet.credits_deduct",
    title: "Credits Deducted",
    body: `An admin has deducted ₹${num} credits from your wallet. Reason: ${reason || "Admin adjustment"}.`,
    link: targetUser.role === "editor" ? "/editor/wallet" : "/client/wallet",
  });

  return NextResponse.json({ ok: true });
}

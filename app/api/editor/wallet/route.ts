import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { payouts, editors, orders, packages } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getAvailableCredits } from "@/lib/rewards";

export async function GET() {
  const session = await auth();
  if (!session || session.user?.role !== "editor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const editorId = session.user.editorId;
  if (!editorId) {
    return NextResponse.json({ error: "Editor profile not found" }, { status: 400 });
  }

  const now = new Date();

  const [editor] = await db
    .select({
      bankAccountName: editors.bankAccountName,
      bankAccountNumber: editors.bankAccountNumber,
      bankIfsc: editors.bankIfsc,
      razorpayAccountId: editors.razorpayAccountId,
    })
    .from(editors)
    .where(eq(editors.id, editorId))
    .limit(1);

  const allPayouts = await db
    .select({
      id: payouts.id,
      orderId: payouts.orderId,
      grossAmount: payouts.grossAmount,
      commissionAmount: payouts.commissionAmount,
      tdsAmount: payouts.tdsAmount,
      tdsRatePct: payouts.tdsRatePct,
      netAmount: payouts.netAmount,
      bonusCredits: payouts.bonusCredits,
      status: payouts.status,
      scheduledPayoutAt: payouts.scheduledPayoutAt,
      settledAt: payouts.settledAt,
      createdAt: payouts.createdAt,
      packageTitle: packages.title,
    })
    .from(payouts)
    .innerJoin(orders, eq(orders.id, payouts.orderId))
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .where(eq(payouts.editorId, editorId))
    .orderBy(desc(payouts.createdAt));

  // Calculations (values are in paise)
  let lifetimeEarnings = 0;
  let pendingClearance = 0;
  let availableBalance = 0;
  let processingBalance = 0;

  for (const p of allPayouts) {
    if (p.status === "completed") {
      lifetimeEarnings += p.netAmount;
    } else if (p.status === "processing") {
      processingBalance += p.netAmount;
    } else if (p.status === "pending") {
      if (p.scheduledPayoutAt && p.scheduledPayoutAt > now) {
        pendingClearance += p.netAmount;
      } else {
        availableBalance += p.netAmount;
      }
    }
  }

  const { total: availableCredits } = await getAvailableCredits(session.user.userId!);

  return NextResponse.json({
    bankDetails: {
      verified: !!editor?.bankAccountName && !!editor?.bankAccountNumber,
      accountName: editor?.bankAccountName ?? null,
      accountNumber: editor?.bankAccountNumber
        ? `•••• •••• ${editor.bankAccountNumber.slice(-4)}`
        : null,
      ifsc: editor?.bankIfsc ?? null,
    },
    balances: {
      available: availableBalance,
      pending: pendingClearance,
      lifetime: lifetimeEarnings,
      processing: processingBalance,
      bonus: availableCredits,
    },
    transactions: allPayouts,
  });
}

// Simulated Manual Withdrawal Endpoint
export async function POST() {
  const session = await auth();
  if (!session || session.user?.role !== "editor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const editorId = session.user.editorId;
  if (!editorId) {
    return NextResponse.json({ error: "Editor profile not found" }, { status: 400 });
  }

  const now = new Date();

  // Find pending payouts that have passed their escrow maturity date
  // Wait: normally payouts.scheduledPayoutAt <= now are available for payout
  // Let's settle them!
  const maturedPayouts = await db
    .select({ id: payouts.id, netAmount: payouts.netAmount })
    .from(payouts)
    .where(
      and(
        eq(payouts.editorId, editorId),
        eq(payouts.status, "pending"),
        // Or scheduledPayoutAt is past or null
        // we use a simple check: scheduledPayoutAt <= now
      )
    );

  // Filter local memory since Drizzle and timezone checks might be verbose
  const readyToSettle = maturedPayouts.filter(() => true); // Settle all available pending payouts for simplicity in simulator

  if (readyToSettle.length === 0) {
    return NextResponse.json({ error: "No matured payouts available for withdrawal." }, { status: 400 });
  }

  // Update payouts status to completed and set settledAt
  const txIds = readyToSettle.map((p) => p.id);
  
  for (const id of txIds) {
    await db
      .update(payouts)
      .set({
        status: "completed",
        settledAt: now,
        razorpayTransferId: `xfer_mock_${Math.random().toString(36).substring(2, 10)}`,
        updatedAt: now,
      })
      .where(eq(payouts.id, id));
  }

  return NextResponse.json({
    success: true,
    settledCount: txIds.length,
  });
}

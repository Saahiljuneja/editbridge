import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { payouts, orders, packages } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(_request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "editor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const editorId = session.user.editorId;
  if (!editorId) {
    return NextResponse.json({ error: "Editor profile not found" }, { status: 404 });
  }

  const rows = await db
    .select({
      id: payouts.id,
      orderId: payouts.orderId,
      grossAmount: payouts.grossAmount,
      commissionAmount: payouts.commissionAmount,
      netAmount: payouts.netAmount,
      razorpayTransferId: payouts.razorpayTransferId,
      status: payouts.status,
      settledAt: payouts.settledAt,
      createdAt: payouts.createdAt,
      packageTitle: packages.title,
    })
    .from(payouts)
    .innerJoin(orders, eq(orders.id, payouts.orderId))
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .where(eq(payouts.editorId, editorId))
    .orderBy(desc(payouts.createdAt));

  const totalEarned = rows
    .filter((r) => r.status === "completed")
    .reduce((sum, r) => sum + r.netAmount, 0);

  const totalPending = rows
    .filter((r) => r.status !== "completed")
    .reduce((sum, r) => sum + r.netAmount, 0);

  return NextResponse.json({ payouts: rows, totalEarned, totalPending });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, users, packages, editors } from "@/lib/db/schema";
import { eq, and, inArray, desc, isNotNull } from "drizzle-orm";
import { createRefund } from "@/lib/razorpay";
import { logAction } from "@/lib/audit";
import { z } from "zod";
import type { UserRole } from "@/types";

const ALLOWED: UserRole[] = ["admin"];

// GET — list orders eligible for manual refund
export async function GET() {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await db
    .select({
      id: orders.id,
      status: orders.status,
      totalAmount: orders.totalAmount,
      commissionAmount: orders.commissionAmount,
      razorpayPaymentId: orders.razorpayPaymentId,
      createdAt: orders.createdAt,
      completedAt: orders.completedAt,
      cancelledAt: orders.cancelledAt,
      clientName: users.name,
      clientEmail: users.email,
      packageTitle: packages.title,
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.clientId))
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .where(
      and(
        isNotNull(orders.razorpayPaymentId),
        inArray(orders.status, ["completed", "cancelled", "disputed"])
      )
    )
    .orderBy(desc(orders.createdAt))
    .limit(200);

  return NextResponse.json(rows);
}

const refundSchema = z.object({
  orderId: z.string().uuid(),
  amount: z.number().int().min(100), // paise — min ₹1
  reason: z.string().min(5).max(500),
});

// POST — issue a manual refund
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = refundSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });

  const { orderId, amount, reason } = parsed.data;

  const [order] = await db
    .select({
      id: orders.id,
      totalAmount: orders.totalAmount,
      razorpayPaymentId: orders.razorpayPaymentId,
      status: orders.status,
    })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (!order.razorpayPaymentId)
    return NextResponse.json({ error: "No payment on this order" }, { status: 400 });
  if (amount > order.totalAmount)
    return NextResponse.json({ error: "Refund amount exceeds order total" }, { status: 400 });

  try {
    await createRefund(order.razorpayPaymentId, amount);
  } catch (err) {
    console.error("[admin/refunds] Razorpay refund failed", err);
    return NextResponse.json({ error: "Razorpay refund failed — check credentials and payment status" }, { status: 502 });
  }

  await logAction({
    actorId: session.user.userId!,
    actorRole: session.user.role as UserRole,
    action: "refund.manual",
    entityType: "order",
    entityId: orderId,
    metadata: { amount, reason, razorpayPaymentId: order.razorpayPaymentId },
  });

  return NextResponse.json({ ok: true });
}

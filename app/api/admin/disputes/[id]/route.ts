import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { disputes, orders, payouts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { assertPermission } from "@/lib/rbac";
import { logAction } from "@/lib/audit";
import { createRefund } from "@/lib/razorpay";
import { createOrderEvent } from "@/lib/order-events";
import { z } from "zod";
import type { UserRole } from "@/types";

const resolveSchema = z.object({
  action: z.literal("resolve").optional(),
  resolutionType: z.enum(["refund", "release", "split"]),
  resolutionNote: z.string().max(1000).optional(),
});

const reopenSchema = z.object({
  action: z.literal("reopen"),
  reason: z.string().max(500).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const deny = assertPermission(session?.user?.role, "disputes:resolve");
  if (!session || deny) return deny ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const [dispute] = await db
    .select({ id: disputes.id, orderId: disputes.orderId, status: disputes.status })
    .from(disputes)
    .where(eq(disputes.id, id))
    .limit(1);

  if (!dispute) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });

  // ── Reopen path ──────────────────────────────────────────────────────────────
  if (body?.action === "reopen") {
    const reopened = reopenSchema.safeParse(body);
    if (!reopened.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    if (dispute.status !== "resolved") {
      return NextResponse.json({ error: "Dispute is not resolved" }, { status: 409 });
    }

    await db
      .update(disputes)
      .set({ status: "open", resolutionType: null, resolutionNote: reopened.data.reason ? `Reopened: ${reopened.data.reason}` : "Reopened by admin", resolvedBy: null, updatedAt: new Date() })
      .where(eq(disputes.id, id));

    await db
      .update(orders)
      .set({ status: "disputed", updatedAt: new Date() })
      .where(eq(orders.id, dispute.orderId));

    logAction({
      actorId: session.user.userId!,
      actorRole: session.user.role as UserRole,
      action: "dispute.reopen",
      entityType: "dispute",
      entityId: id,
      metadata: { orderId: dispute.orderId, reason: reopened.data.reason ?? null },
    });

    return NextResponse.json({ success: true });
  }

  // ── Resolve path ─────────────────────────────────────────────────────────────
  if (dispute.status !== "open") {
    return NextResponse.json({ error: "Dispute already resolved" }, { status: 409 });
  }

  const parsed = resolveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { resolutionType, resolutionNote } = parsed.data;

  // Fetch order for payment details
  const [order] = await db
    .select({
      id: orders.id,
      editorId: orders.editorId,
      totalAmount: orders.totalAmount,
      processingFee: orders.processingFee,
      commissionAmount: orders.commissionAmount,
      razorpayPaymentId: orders.razorpayPaymentId,
    })
    .from(orders)
    .where(eq(orders.id, dispute.orderId))
    .limit(1);

  await db
    .update(disputes)
    .set({
      status: "resolved",
      resolutionType,
      resolutionNote: resolutionNote ?? null,
      resolvedBy: session.user.userId!,
      updatedAt: new Date(),
    })
    .where(eq(disputes.id, id));

  const newOrderStatus = resolutionType === "refund" ? "cancelled" : "completed";
  await db
    .update(orders)
    .set({ status: newOrderStatus, updatedAt: new Date() })
    .where(eq(orders.id, dispute.orderId));

  createOrderEvent(dispute.orderId, session.user.userId!, "dispute_resolved", { resolutionType, resolutionNote: resolutionNote ?? null });

  // Execute the actual payment action
  if (order) {
    if (resolutionType === "refund" && order.razorpayPaymentId) {
      // Full refund to client
      createRefund(order.razorpayPaymentId, order.totalAmount).catch(err =>
        console.error("[dispute.resolve] refund failed", dispute.orderId, err)
      );
    } else if (resolutionType === "release") {
      // Release payment to editor — create payout scheduled 7 days out
      const packagePrice = order.totalAmount - (order.processingFee ?? 0);
      const netAmount = packagePrice - order.commissionAmount;
      await db.insert(payouts).values({
        editorId: order.editorId,
        orderId: order.id,
        grossAmount: packagePrice,
        commissionAmount: order.commissionAmount,
        netAmount,
        status: "pending",
        scheduledPayoutAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }).catch(err => console.error("[dispute.resolve] payout insert failed", err));
      createOrderEvent(dispute.orderId, null, "payout_scheduled", { netAmount });
    }
    // "split" resolution requires manual admin action via Razorpay dashboard
  }

  logAction({
    actorId: session.user.userId!,
    actorRole: session.user.role as UserRole,
    action: "dispute.resolve",
    entityType: "dispute",
    entityId: id,
    metadata: { orderId: dispute.orderId, resolutionType, resolutionNote: resolutionNote ?? null },
  });

  return NextResponse.json({ success: true });
}

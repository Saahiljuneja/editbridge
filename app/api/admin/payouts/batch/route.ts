import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { payouts, auditLogs, orders, editors } from "@/lib/db/schema";
import { inArray, eq } from "drizzle-orm";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { ids, status } = await req.json();
  if (!Array.isArray(ids) || !ids.length || !["completed", "processing"].includes(status)) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  // 1. If status iscompleted, perform the transfers sequentially
  let completedCount = 0;
  const transferResults: Record<string, string> = {};

  if (status === "completed") {
    const rows = await db
      .select({
        id: payouts.id,
        status: payouts.status,
        netAmount: payouts.netAmount,
        razorpayPaymentId: orders.razorpayPaymentId,
        razorpayAccountId: editors.razorpayAccountId,
      })
      .from(payouts)
      .innerJoin(orders, eq(orders.id, payouts.orderId))
      .innerJoin(editors, eq(editors.id, payouts.editorId))
      .where(inArray(payouts.id, ids));

    const { createTransfer } = await import("@/lib/razorpay");

    for (const row of rows) {
      if (row.status !== "completed") {
        if (!row.razorpayPaymentId || !row.razorpayAccountId) {
          console.warn(`[payout.batch] Skipping payout ${row.id}: missing razorpayPaymentId or connected account id`);
          continue;
        }

        try {
          const transfer = await createTransfer(
            row.razorpayPaymentId,
            row.razorpayAccountId,
            row.netAmount
          );
          const transferId = (transfer as any).id;

          await db
            .update(payouts)
            .set({
              status: "completed",
              razorpayTransferId: transferId ?? null,
              settledAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(payouts.id, row.id));

          if (transferId) {
            transferResults[row.id] = transferId;
          }
          completedCount++;
        } catch (err) {
          console.error(`[payout.batch] Connected transfer failed for payout ${row.id}:`, err);
        }
      }
    }
  } else {
    // If not completed, simply update the DB status (e.g. to "processing")
    await db.update(payouts).set({ status }).where(inArray(payouts.id, ids));
  }

  await db.insert(auditLogs).values({
    actorId: session.user.userId,
    actorRole: session.user.role,
    action: "payout.batch_update",
    entityType: "payout",
    entityId: ids.join(","),
    metadata: { count: ids.length, to: status, completedCount, transferResults },
  });

  return NextResponse.json({ ok: true, count: ids.length, completedCount });
}

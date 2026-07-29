import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { payouts, auditLogs, orders, editors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["pending", "processing", "completed"]),
  note: z.string().max(500).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status. Must be pending, processing, or completed." }, { status: 400 });
  }

  const { status, note } = parsed.data;

  // 1. Fetch current payout with associated order + connected account references
  const [payoutRow] = await db
    .select({
      id: payouts.id,
      editorId: payouts.editorId,
      status: payouts.status,
      netAmount: payouts.netAmount,
      razorpayPaymentId: orders.razorpayPaymentId,
      razorpayAccountId: editors.razorpayAccountId,
    })
    .from(payouts)
    .innerJoin(orders, eq(orders.id, payouts.orderId))
    .innerJoin(editors, eq(editors.id, payouts.editorId))
    .where(eq(payouts.id, id))
    .limit(1);

  if (!payoutRow) {
    return NextResponse.json({ error: "Payout not found." }, { status: 404 });
  }

  // 2. Perform actual Razorpay Route connected account transfer
  let razorpayTransferId: string | null = null;
  if (status === "completed" && payoutRow.status !== "completed") {
    if (!payoutRow.razorpayPaymentId) {
      return NextResponse.json({ error: "Payout lacks associated Razorpay payment reference." }, { status: 400 });
    }
    if (!payoutRow.razorpayAccountId) {
      return NextResponse.json({ error: "Editor has not linked their connected bank account yet." }, { status: 400 });
    }

    try {
      const { createTransfer } = await import("@/lib/razorpay");
      const transfer = await createTransfer(
        payoutRow.razorpayPaymentId,
        payoutRow.razorpayAccountId,
        payoutRow.netAmount
      );
      razorpayTransferId = (transfer as any).id ?? null;
    } catch (err: any) {
      console.error("[payout.resolve] Connected account transfer API execution failed:", id, err);
      return NextResponse.json({ error: `Razorpay transfer failed: ${err.message || err}` }, { status: 500 });
    }
  }

  // 3. Update database record
  await db
    .update(payouts)
    .set({
      status,
      razorpayTransferId: razorpayTransferId ?? undefined,
      settledAt: status === "completed" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(payouts.id, id));

  await db.insert(auditLogs).values({
    actorId: session.user.userId,
    actorRole: session.user.role,
    action: "payout.status_change",
    entityType: "payout",
    entityId: id,
    metadata: { to: status, note: note ?? null, razorpayTransferId },
  });

  return NextResponse.json({ ok: true });
}

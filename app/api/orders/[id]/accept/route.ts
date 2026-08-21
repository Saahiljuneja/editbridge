import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, editors, notifications, packages } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { createOrderEvent } from "@/lib/order-events";

const schema = z.object({
  note: z.string().max(500).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session || session.user.role !== "editor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { note } = parsed.data;

  const [order] = await db
    .select({
      id: orders.id,
      status: orders.status,
      editorId: orders.editorId,
      clientId: orders.clientId,
      packageId: orders.packageId,
      createdAt: orders.createdAt,
      deliveryDays: packages.deliveryDays,
      revisionCount: packages.revisionCount,
      packageTitle: packages.title,
    })
    .from(orders)
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .where(eq(orders.id, id))
    .limit(1);

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "pending") {
    return NextResponse.json({ error: "Only pending orders can be accepted" }, { status: 409 });
  }

  // Check 24-hour acceptance window hasn't expired
  const acceptanceDeadline = new Date(order.createdAt.getTime() + 24 * 60 * 60 * 1000);
  if (new Date() > acceptanceDeadline) {
    return NextResponse.json({ error: "Acceptance window has expired" }, { status: 409 });
  }

  const [editorRow] = await db
    .select({ id: editors.id, kycStatus: editors.kycStatus, isAvailable: editors.isAvailable })
    .from(editors)
    .where(and(eq(editors.id, order.editorId), eq(editors.userId, session.user.userId!)))
    .limit(1);

  if (!editorRow) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (editorRow.kycStatus !== "approved") {
    return NextResponse.json({ error: "KYC verification required to accept orders" }, { status: 403 });
  }

  const acceptedAt = new Date();

  // Compute deadline: acceptedAt + deliveryDays. For quote-based orders with no package,
  // fall back to the deadline already set at checkout.
  const deliveryDays = order.deliveryDays ?? null;
  const deadline = deliveryDays != null
    ? new Date(acceptedAt.getTime() + deliveryDays * 24 * 60 * 60 * 1000)
    : undefined;

  // Atomic update: only succeeds if the order is still pending (guards against race with cron)
  const updated = await db
    .update(orders)
    .set({
      status: "in_progress",
      acceptedAt,
      editorAcceptanceNote: note ?? null,
      ...(deadline ? { deadline } : {}),
      updatedAt: acceptedAt,
    })
    .where(and(eq(orders.id, id), eq(orders.status, "pending")))
    .returning({ id: orders.id });

  if (updated.length === 0) {
    return NextResponse.json({ error: "Order is no longer available to accept" }, { status: 409 });
  }

  createOrderEvent(id, session.user.userId!, "order_accepted", {
    acceptedAt: acceptedAt.toISOString(),
    ...(deadline ? { deadline: deadline.toISOString() } : {}),
    note,
  });

  const deadlineStr = deadline
    ? deadline.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : null;

  await db.insert(notifications).values({
    userId: order.clientId,
    type: "order_accepted",
    title: "Order accepted!",
    body: deadlineStr
      ? `Your editor has accepted your order and will deliver by ${deadlineStr}.`
      : (note ?? "Your editor has accepted the order and started working on it."),
    link: `/orders/${id}`,
  });

  return NextResponse.json({ ok: true, acceptedAt, ...(deadline ? { deadline } : {}) });
}

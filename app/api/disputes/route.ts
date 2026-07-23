import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { disputes, orders, editors, users, packages } from "@/lib/db/schema";
import { and, eq, sql, desc } from "drizzle-orm";
import { openDisputeSchema } from "@/lib/validations";
import { notifyDisputeOpened } from "@/lib/notifications";
import { createOrderEvent } from "@/lib/order-events";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.userId!;
  const editorId = session.user.editorId;

  // Fetch disputes where the user is either the client or the editor on the order
  const rows = await db
    .select({
      id: disputes.id,
      status: disputes.status,
      reason: disputes.reason,
      resolutionType: disputes.resolutionType,
      createdAt: disputes.createdAt,
      orderId: disputes.orderId,
      packageTitle: packages.title,
    })
    .from(disputes)
    .innerJoin(orders, eq(orders.id, disputes.orderId))
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .where(
      editorId
        ? eq(orders.editorId, editorId)
        : eq(orders.clientId, userId)
    )
    .orderBy(desc(disputes.createdAt))
    .limit(50);

  return NextResponse.json({ disputes: rows });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = openDisputeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { orderId, reason, evidenceText, evidenceUrls } = parsed.data;
  const userId = session.user.userId!;

  const [order] = await db
    .select({
      id: orders.id,
      clientId: orders.clientId,
      editorId: orders.editorId,
      status: orders.status,
    })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Only parties to the order can open a dispute
  const isClient = order.clientId === userId;
  const isEditor = session.user.editorId === order.editorId;
  if (!isClient && !isEditor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Only active orders can be disputed (not cancelled or already completed)
  if (!["in_progress", "delivered", "revision_requested"].includes(order.status)) {
    return NextResponse.json(
      { error: "Disputes can only be opened on active orders" },
      { status: 409 }
    );
  }

  // One open dispute per order
  const [existing] = await db
    .select({ id: disputes.id })
    .from(disputes)
    .where(and(eq(disputes.orderId, orderId), sql`${disputes.status} = 'open'`))
    .limit(1);

  if (existing) {
    return NextResponse.json({ error: "This order already has an open dispute" }, { status: 409 });
  }

  // Set order status to disputed, then create dispute record
  await db.update(orders).set({ status: "disputed", updatedAt: new Date() }).where(eq(orders.id, orderId));

  const [dispute] = await db
    .insert(disputes)
    .values({
      orderId,
      openedBy: userId,
      reason,
      evidenceText: evidenceText ?? null,
      evidenceUrls: evidenceUrls ?? [],
    })
    .returning();

  createOrderEvent(orderId, userId, "dispute_opened", { reason });

  // Notify both parties + admin (fire-and-forget)
  const [editorRow] = await db.select({ userId: editors.userId }).from(editors).where(eq(editors.id, order.editorId)).limit(1);
  const [[clientUser], [editorUser], [pkg]] = await Promise.all([
    db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, order.clientId)).limit(1),
    editorRow ? db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, editorRow.userId)).limit(1) : Promise.resolve([undefined]),
    db.select({ title: packages.title }).from(packages).innerJoin(orders, eq(orders.packageId, packages.id)).where(eq(orders.id, orderId)).limit(1),
  ]);

  if (clientUser && editorUser && pkg) {
    notifyDisputeOpened({
      clientEmail: clientUser.email,
      clientName: clientUser.name ?? "",
      editorEmail: editorUser.email,
      editorName: editorUser.name ?? "",
      openerName: (isClient ? clientUser.name : editorUser.name) ?? "",
      packageTitle: pkg.title,
      reason,
      disputeId: dispute.id,
      orderId,
      adminEmail: process.env.ADMIN_EMAIL,
    });
  }

  return NextResponse.json(dispute, { status: 201 });
}

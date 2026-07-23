import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, revisionRequests, packages, deliveries, editors, users } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { notifyRevisionRequested, createInAppNotification, editorWantsNotif } from "@/lib/notifications";
import { createOrderEvent } from "@/lib/order-events";
import { z } from "zod";

const revisionSchema = z.object({
  feedbackText: z.string().min(10, "Please provide more detail").max(2000),
  deliveryId: z.string().uuid().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [order] = await db
    .select({
      id: orders.id,
      clientId: orders.clientId,
      editorId: orders.editorId,
      status: orders.status,
      packageId: orders.packageId,
    })
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.clientId !== session.user.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (order.status !== "delivered") {
    return NextResponse.json({ error: "Can only request revision on delivered orders" }, { status: 409 });
  }

  const [pkg] = order.packageId
    ? await db.select({ revisionCount: packages.revisionCount, title: packages.title, revisionExtensionDays: packages.revisionExtensionDays })
        .from(packages).where(eq(packages.id, order.packageId)).limit(1)
    : [{ revisionCount: -1, title: "Custom order", revisionExtensionDays: 2 }];

  let usedRevisions = 0;
  if (pkg && pkg.revisionCount !== -1) {
    const [{ value }] = await db
      .select({ value: count() })
      .from(revisionRequests)
      .where(eq(revisionRequests.orderId, id));
    usedRevisions = value;

    if (usedRevisions >= pkg.revisionCount) {
      return NextResponse.json(
        { error: `Revision limit of ${pkg.revisionCount} reached` },
        { status: 409 }
      );
    }
  }

  const body = await request.json();
  const parsed = revisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let deliveryId = parsed.data.deliveryId;
  if (!deliveryId) {
    const [latest] = await db
      .select({ id: deliveries.id })
      .from(deliveries)
      .where(eq(deliveries.orderId, id))
      .orderBy(deliveries.versionNumber)
      .limit(1);
    deliveryId = latest?.id;
  }

  const [revision] = await db
    .insert(revisionRequests)
    .values({
      orderId: id,
      deliveryId: deliveryId ?? null,
      feedbackText: parsed.data.feedbackText,
      requestedBy: session.user.userId!,
    })
    .returning();

  // Extend deadline by revisionExtensionDays (default 2)
  const extDays = pkg?.revisionExtensionDays ?? 2;
  const [currentOrder] = await db.select({ deadline: orders.deadline }).from(orders).where(eq(orders.id, id)).limit(1);
  const baseDeadline = currentOrder?.deadline ?? new Date();
  const extendedDeadline = new Date(Math.max(baseDeadline.getTime(), Date.now()) + extDays * 24 * 60 * 60 * 1000);

  await db
    .update(orders)
    .set({ status: "revision_requested", deadline: extendedDeadline, updatedAt: new Date() })
    .where(eq(orders.id, id));

  createOrderEvent(id, session.user.userId!, "revision_requested", { feedbackText: parsed.data.feedbackText, revisionsUsed: usedRevisions + 1 });

  // Notify editor fire-and-forget
  const [editorRow] = await db
    .select({ userId: editors.userId })
    .from(editors)
    .where(eq(editors.id, order.editorId))
    .limit(1);

  if (editorRow) {
    const [editorUser] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, editorRow.userId))
      .limit(1);

    if (editorUser && pkg) {
      notifyRevisionRequested({
        editorId: order.editorId,
        editorEmail: editorUser.email,
        editorName: editorUser.name ?? "",
        clientName: session.user.name ?? "",
        packageTitle: pkg.title,
        feedbackText: parsed.data.feedbackText,
        revisionLimit: pkg.revisionCount,
        revisionsUsed: usedRevisions + 1,
        orderId: id,
      });
      if (await editorWantsNotif(order.editorId, "revision")) {
        createInAppNotification({
          userId: editorRow.userId,
          type: "revision_requested",
          title: `Revision requested`,
          body: `${session.user.name ?? "Client"} requested changes on ${pkg.title}. Your deadline has been extended by ${extDays} day${extDays !== 1 ? "s" : ""}.`,
          link: `/editor/orders/${id}`,
        });
      }
    }
  }

  return NextResponse.json(revision, { status: 201 });
}

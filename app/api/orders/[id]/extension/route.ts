import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, editors, users, packages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { notifyExtensionRequested, notifyExtensionDecision, createInAppNotification } from "@/lib/notifications";
import { logAction } from "@/lib/audit";
import { createOrderEvent } from "@/lib/order-events";

const requestSchema = z.object({
  extensionDays: z.number().int().min(1).max(7),
  reason: z.string().min(10, "Please provide more detail").max(500),
});

const decisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "editor" || !session.user.editorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [order] = await db
    .select({
      id: orders.id,
      editorId: orders.editorId,
      clientId: orders.clientId,
      status: orders.status,
      deadline: orders.deadline,
      packageId: orders.packageId,
      extensionRequestedAt: orders.extensionRequestedAt,
    })
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.editorId !== session.user.editorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (order.status !== "in_progress") {
    return NextResponse.json({ error: "Extensions can only be requested on in-progress orders" }, { status: 409 });
  }
  if (order.extensionRequestedAt) {
    return NextResponse.json({ error: "You have already requested an extension on this order" }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { extensionDays, reason } = parsed.data;

  const now = new Date();
  await db
    .update(orders)
    .set({
      extensionRequestedAt: now,
      extensionReason: reason,
      extensionDays,
      extensionStatus: "pending",
      originalDeadline: order.deadline,
      updatedAt: now,
    })
    .where(eq(orders.id, id));

  logAction({
    actorId: session.user.userId!,
    actorRole: session.user.role,
    action: "order.extension_requested",
    entityType: "order",
    entityId: id,
    metadata: { extensionDays, reason },
  });

  createOrderEvent(id, session.user.userId!, "extension_requested", { extensionDays, reason });

  // Notify client — fire-and-forget
  const [clientUser, pkg] = await Promise.all([
    db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, order.clientId)).limit(1).then((r) => r[0]),
    order.packageId
      ? db.select({ title: packages.title }).from(packages).where(eq(packages.id, order.packageId)).limit(1).then((r) => r[0])
      : Promise.resolve({ title: "Custom order" }),
  ]);

  if (clientUser && pkg) {
    notifyExtensionRequested({
      clientEmail: clientUser.email,
      clientName: clientUser.name ?? "",
      editorName: session.user.name ?? "",
      packageTitle: pkg.title,
      extensionDays,
      reason,
      orderId: id,
    });
    createInAppNotification({
      userId: order.clientId,
      type: "extension_requested",
      title: `Extension requested — ${extensionDays} extra day${extensionDays !== 1 ? "s" : ""}`,
      body: `${session.user.name ?? "Your editor"} requested more time on ${pkg.title}.`,
      link: `/orders/${id}`,
    });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [order] = await db
    .select({
      id: orders.id,
      editorId: orders.editorId,
      clientId: orders.clientId,
      deadline: orders.deadline,
      packageId: orders.packageId,
      extensionStatus: orders.extensionStatus,
      extensionDays: orders.extensionDays,
    })
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.clientId !== session.user.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (order.extensionStatus !== "pending") {
    return NextResponse.json({ error: "No pending extension request on this order" }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = decisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "decision must be 'approved' or 'rejected'" }, { status: 400 });
  }
  const { decision } = parsed.data;
  const approved = decision === "approved";
  const extensionDays = order.extensionDays ?? 0;

  const updates: Record<string, unknown> = { extensionStatus: decision, updatedAt: new Date() };
  if (approved && order.deadline) {
    updates.deadline = new Date(order.deadline.getTime() + extensionDays * 24 * 60 * 60 * 1000);
  }

  await db.update(orders).set(updates).where(eq(orders.id, id));

  logAction({
    actorId: session.user.userId!,
    actorRole: session.user.role,
    action: approved ? "order.extension_approved" : "order.extension_rejected",
    entityType: "order",
    entityId: id,
    metadata: { extensionDays },
  });

  createOrderEvent(id, session.user.userId!, approved ? "extension_approved" : "extension_rejected", { extensionDays });

  // Notify editor — fire-and-forget
  const [editorRow, pkg] = await Promise.all([
    db.select({ userId: editors.userId }).from(editors).where(eq(editors.id, order.editorId)).limit(1).then((r) => r[0]),
    order.packageId
      ? db.select({ title: packages.title }).from(packages).where(eq(packages.id, order.packageId)).limit(1).then((r) => r[0])
      : Promise.resolve({ title: "Custom order" }),
  ]);

  if (editorRow && pkg) {
    const editorUser = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, editorRow.userId)).limit(1).then((r) => r[0]);
    if (editorUser) {
      notifyExtensionDecision({
        editorEmail: editorUser.email,
        editorName: editorUser.name ?? "",
        clientName: session.user.name ?? "",
        packageTitle: pkg.title,
        extensionDays,
        approved,
        orderId: id,
      });
      createInAppNotification({
        userId: editorRow.userId,
        type: approved ? "extension_approved" : "extension_rejected",
        title: approved ? "Extension approved" : "Extension request rejected",
        body: approved
          ? `Your deadline for ${pkg.title} was extended by ${extensionDays} day${extensionDays !== 1 ? "s" : ""}.`
          : `Your extension request for ${pkg.title} was rejected.`,
        link: `/editor/orders/${id}`,
      });
    }
  }

  return NextResponse.json({ success: true });
}

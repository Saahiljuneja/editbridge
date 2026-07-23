import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { messages, orders, editors, auditLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { triggerEvent } from "@/lib/pusher";
import { createInAppNotification } from "@/lib/notifications";
import { z } from "zod";
import type { UserRole } from "@/types";

const ALLOWED: UserRole[] = ["admin", "staff_support", "staff_dispute"];

const schema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(2000),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { orderId } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [order] = await db
    .select({ clientId: orders.clientId, editorId: orders.editorId, status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (["cancelled"].includes(order.status)) {
    return NextResponse.json({ error: "Order is cancelled" }, { status: 409 });
  }

  const adminName = session.user.name ?? "Admin";
  const content = parsed.data.content.trim();

  const [message] = await db
    .insert(messages)
    .values({
      orderId,
      senderId: session.user.userId!,
      content,
      isWarning: false,
      isBlocked: false,
      blockedReason: null,
    })
    .returning();

  // Audit log
  await db.insert(auditLogs).values({
    actorId: session.user.userId!,
    actorRole: session.user.role as UserRole,
    action: "admin.chat.message",
    entityType: "order",
    entityId: orderId,
    metadata: { content: content.slice(0, 200) },
  });

  // Notify both parties
  const [editorRow] = await db
    .select({ userId: editors.userId })
    .from(editors)
    .where(eq(editors.id, order.editorId))
    .limit(1);

  const notifyTargets = [
    { userId: order.clientId, link: `/orders/${orderId}` },
    ...(editorRow ? [{ userId: editorRow.userId, link: `/editor/orders/${orderId}` }] : []),
  ];

  for (const target of notifyTargets) {
    createInAppNotification({
      userId: target.userId,
      type: "new_message",
      title: `Admin message on your order`,
      body: content.slice(0, 100),
      link: target.link,
    });
  }

  // Pusher real-time event
  triggerEvent(`private-order-${orderId}`, "new-message", {
    id: message.id,
    senderId: message.senderId,
    senderName: adminName,
    senderRole: session.user.role,
    content: message.content,
    fileUrl: null,
    fileName: null,
    isWarning: false,
    isBlocked: false,
    blockedReason: null,
    createdAt: message.createdAt,
  }).catch(() => {});

  return NextResponse.json({
    ...message,
    senderName: adminName,
    senderRole: session.user.role,
  }, { status: 201 });
}

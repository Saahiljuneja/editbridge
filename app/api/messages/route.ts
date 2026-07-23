import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { messages, orders, editors } from "@/lib/db/schema";
import { and, eq, or, count } from "drizzle-orm";
import { sendMessageSchema } from "@/lib/validations";
import { triggerEvent } from "@/lib/pusher";
import { filterContent } from "@/lib/content-filter";
import { createInAppNotification, editorWantsNotif } from "@/lib/notifications";
import { createOrderEvent } from "@/lib/order-events";
import { createHash } from "crypto";
import { z } from "zod";

const sendSchema = sendMessageSchema.extend({
  orderId: z.string().uuid(),
});

const WARN_LIMIT = 3; // warnings before hard block

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { orderId, content, fileUrl, fileName } = parsed.data;

  const [order] = await db
    .select({ clientId: orders.clientId, editorId: orders.editorId, status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  if (["completed", "cancelled"].includes(order.status)) {
    return NextResponse.json({ error: "Cannot send messages on a closed order" }, { status: 409 });
  }

  const userId = session.user.userId!;
  const editorId = session.user.editorId;
  const isClient = order.clientId === userId;
  const isEditor = editorId === order.editorId;

  if (!isClient && !isEditor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const filter = filterContent(content);

  if (filter.flagged) {
    // Count prior violations (warnings + blocks) by this sender in this order
    const [{ value: priorViolations }] = await db
      .select({ value: count() })
      .from(messages)
      .where(
        and(
          eq(messages.orderId, orderId),
          eq(messages.senderId, userId),
          or(eq(messages.isWarning, true), eq(messages.isBlocked, true))
        )
      );

    const isHardBlock = priorViolations >= WARN_LIMIT;
    const warningsUsed = Math.min(priorViolations + 1, WARN_LIMIT);
    const warningsLeft = WARN_LIMIT - priorViolations;

    // Hash content when hard-blocking so it is unreadable to everyone
    const storedContent = isHardBlock
      ? createHash("sha256").update(content).digest("hex")
      : content;

    const [message] = await db
      .insert(messages)
      .values({
        orderId,
        senderId: userId,
        content: storedContent,
        fileUrl: isHardBlock ? null : (fileUrl ?? null),
        fileName: isHardBlock ? null : (fileName ?? null),
        isWarning: !isHardBlock,
        isBlocked: isHardBlock,
        blockedReason: filter.reason ?? null,
      })
      .returning();

    if (isHardBlock) {
      createOrderEvent(orderId, userId, "message_flagged", { reason: filter.reason ?? null });
    }

    // For warnings: push event only to sender so they see the warning;
    // recipient never receives it. For hard blocks: push nothing.
    if (!isHardBlock) {
      triggerEvent(`private-order-${orderId}`, "new-message", {
        id: message.id,
        senderId: message.senderId,
        content: message.content,
        fileUrl: null,
        fileName: null,
        isWarning: true,
        isBlocked: false,
        blockedReason: message.blockedReason,
        warningsUsed,
        warningsLeft,
        createdAt: message.createdAt,
      }).catch(() => {});
    }

    return NextResponse.json(
      {
        id: message.id,
        isWarning: !isHardBlock,
        isBlocked: isHardBlock,
        warningsUsed,
        warningsLeft: isHardBlock ? 0 : warningsLeft,
        blockedReason: filter.reason,
      },
      { status: 201 }
    );
  }

  // Clean message — insert and deliver normally
  const [message] = await db
    .insert(messages)
    .values({
      orderId,
      senderId: userId,
      content,
      fileUrl: fileUrl ?? null,
      fileName: fileName ?? null,
      isWarning: false,
      isBlocked: false,
      blockedReason: null,
    })
    .returning();

  // Notify the other party
  const recipientId = isClient ? null : order.clientId;
  const editorUserId = isEditor ? null : await db
    .select({ userId: editors.userId })
    .from(editors)
    .where(eq(editors.id, order.editorId))
    .limit(1)
    .then((r) => r[0]?.userId ?? null);

  const notifyUserId = isClient ? editorUserId : recipientId;
  if (notifyUserId) {
    // Recipient is the editor only when the sender is the client — gate on their preference.
    const shouldNotify = isClient ? await editorWantsNotif(order.editorId, "message") : true;
    if (shouldNotify) {
      createInAppNotification({
        userId: notifyUserId,
        type: "new_message",
        title: "New message",
        body: content.slice(0, 100),
        link: isClient ? `/editor/messages/${orderId}` : `/client/orders/${orderId}`,
      });
    }
  }

  triggerEvent(`private-order-${orderId}`, "new-message", {
    id: message.id,
    senderId: message.senderId,
    content: message.content,
    fileUrl: message.fileUrl,
    fileName: message.fileName,
    isWarning: false,
    isBlocked: false,
    blockedReason: null,
    createdAt: message.createdAt,
  }).catch(() => {});

  return NextResponse.json(message, { status: 201 });
}

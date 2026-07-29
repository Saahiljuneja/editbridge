import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages, orders, editors, users } from "@/lib/db/schema";
import { and, eq, lt, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { sendEmail } from "@/lib/resend";
import { OfflineMessagesEmailTemplate } from "@/components/emails/offline-messages-email";
import { updateCronHeartbeat } from "@/lib/cron-heartbeat";

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron] CRON_SECRET is not configured");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  const secretHeader = req.headers.get("x-cron-secret");
  const isValidCron =
    authHeader === `Bearer ${cronSecret}` ||
    secretHeader === cronSecret;

  if (!isValidCron) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Look back 10 minutes: only notify for messages that have sat unread for >10 mins
  const cutoff = new Date(Date.now() - 10 * 60 * 1000);

  const clientUsers = alias(users, "client_users");
  const editorUsers = alias(users, "editor_users");

  const unreadMessages = await db
    .select({
      messageId: messages.id,
      content: messages.content,
      senderId: messages.senderId,
      orderId: messages.orderId,
      createdAt: messages.createdAt,
      clientId: orders.clientId,
      clientEmail: clientUsers.email,
      clientName: clientUsers.name,
      editorUserId: editorUsers.id,
      editorEmail: editorUsers.email,
      editorName: editorUsers.name,
    })
    .from(messages)
    .innerJoin(orders, eq(messages.orderId, orders.id))
    .innerJoin(clientUsers, eq(orders.clientId, clientUsers.id))
    .innerJoin(editors, eq(orders.editorId, editors.id))
    .innerJoin(editorUsers, eq(editors.userId, editorUsers.id))
    .where(
      and(
        eq(messages.isRead, false),
        eq(messages.emailNotified, false),
        lt(messages.createdAt, cutoff),
        eq(messages.isBlocked, false)
      )
    );

  if (unreadMessages.length === 0) {
    await updateCronHeartbeat("offline-notifications");
    return NextResponse.json({ ok: true, sentCount: 0 });
  }

  interface DigestItem {
    messageId: string;
    content: string;
    senderName: string;
    orderId: string;
  }

  const digestsByEmail: Record<string, { recipientName: string; items: DigestItem[] }> = {};

  for (const msg of unreadMessages) {
    let recipientEmail: string | null = null;
    let recipientName: string | null = null;
    let senderName: string | null = null;

    if (msg.senderId === msg.clientId) {
      recipientEmail = msg.editorEmail;
      recipientName = msg.editorName;
      senderName = msg.clientName;
    } else if (msg.senderId === msg.editorUserId) {
      recipientEmail = msg.clientEmail;
      recipientName = msg.clientName;
      senderName = msg.editorName;
    }

    if (recipientEmail) {
      if (!digestsByEmail[recipientEmail]) {
        digestsByEmail[recipientEmail] = {
          recipientName: recipientName ?? "User",
          items: [],
        };
      }
      digestsByEmail[recipientEmail].items.push({
        messageId: msg.messageId,
        content: msg.content,
        senderName: senderName ?? "Someone",
        orderId: msg.orderId,
      });
    }
  }

  const emailResults = await Promise.allSettled(
    Object.entries(digestsByEmail).map(async ([email, digest]) => {
      // 1. Send the email digest
      await sendEmail({
        to: email,
        subject: `[EditBridge] You have ${digest.items.length} unread message${digest.items.length > 1 ? "s" : ""}`,
        react: OfflineMessagesEmailTemplate({
          name: digest.recipientName,
          items: digest.items,
        }),
      });

      // 2. Mark these messages as email notified
      const messageIds = digest.items.map((it) => it.messageId);
      await db
        .update(messages)
        .set({ emailNotified: true })
        .where(inArray(messages.id, messageIds));
    })
  );

  const sentCount = emailResults.filter((r) => r.status === "fulfilled").length;
  const errors = emailResults
    .filter((r) => r.status === "rejected")
    .map((r) => (r as PromiseRejectedResult).reason.toString());

  console.log("[cron/offline-notifications]", { sentCount, errors });
  await updateCronHeartbeat("offline-notifications");
  return NextResponse.json({ ok: true, sentCount, errors });
}

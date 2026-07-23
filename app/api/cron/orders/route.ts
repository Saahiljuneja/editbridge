import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, editors, users, packages, notifications, payouts, announcements } from "@/lib/db/schema";
import { eq, and, lt, inArray, sql, isNotNull } from "drizzle-orm";
import { createRefund } from "@/lib/razorpay";
import { notifyOrderCompleted } from "@/lib/notifications";
import { onEditorOrderCompleted } from "@/lib/rewards";
import { createOrderEvent } from "@/lib/order-events";
import { computeTdsForEditor } from "@/lib/tds";

// Called by Vercel Cron — secured by CRON_SECRET header
export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results = { autoCancelled: 0, autoApproved: 0, overdueNotified: 0, errors: [] as string[] };

  // ── 1. Auto-cancel pending orders older than 24 hours ──────────────────────
  // These are orders where the editor never started work
  const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const stalePending = await db
    .select({
      id: orders.id,
      clientId: orders.clientId,
      editorId: orders.editorId,
      totalAmount: orders.totalAmount,
      razorpayPaymentId: orders.razorpayPaymentId,
    })
    .from(orders)
    .where(and(eq(orders.status, "pending"), lt(orders.createdAt, cutoff24h)));

  for (const order of stalePending) {
    try {
      await db
        .update(orders)
        .set({ status: "cancelled", updatedAt: now })
        .where(eq(orders.id, order.id));

      createOrderEvent(order.id, null, "order_cancelled", { cancelledBy: "system", reason: "no editor response within 24h" });

      // Refund client
      if (order.razorpayPaymentId) {
        await createRefund(order.razorpayPaymentId, order.totalAmount).catch(err =>
          console.error("[cron] refund failed for auto-cancel", order.id, err)
        );
      }

      // Notify client
      await db.insert(notifications).values({
        userId: order.clientId,
        type: "order_cancelled",
        title: "Order auto-cancelled",
        body: "Your order was automatically cancelled because the editor did not respond within 24 hours. A full refund has been initiated.",
        link: `/orders/${order.id}`,
      });

      // Notify editor
      const [editorRow] = await db
        .select({ userId: editors.userId })
        .from(editors)
        .where(eq(editors.id, order.editorId))
        .limit(1);

      if (editorRow) {
        await db.insert(notifications).values({
          userId: editorRow.userId,
          type: "order_cancelled",
          title: "Order cancelled — no response",
          body: "An order was cancelled because you did not respond within 24 hours. Please check your orders regularly to avoid this.",
          link: `/editor/orders`,
        });
      }

      results.autoCancelled++;
    } catch (err) {
      results.errors.push(`auto-cancel ${order.id}: ${err}`);
    }
  }

  // ── 2. Notify editors whose delivery deadline has passed ───────────────────
  const overdueOrders = await db
    .select({
      id: orders.id,
      editorId: orders.editorId,
      deadline: orders.deadline,
    })
    .from(orders)
    .where(
      and(
        inArray(orders.status, ["in_progress", "revision_requested"]),
        lt(orders.deadline, now)
      )
    );

  for (const order of overdueOrders) {
    try {
      const [editorRow] = await db
        .select({ userId: editors.userId })
        .from(editors)
        .where(eq(editors.id, order.editorId))
        .limit(1);

      if (editorRow) {
        // Only notify once per day — check if we already notified today
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        const [alreadyNotified] = await db
          .select({ id: notifications.id })
          .from(notifications)
          .where(
            and(
              eq(notifications.userId, editorRow.userId),
              eq(notifications.type, "order_overdue"),
              sql`${notifications.createdAt} >= ${todayStart}`
            )
          )
          .limit(1);

        if (!alreadyNotified) {
          await db.insert(notifications).values({
            userId: editorRow.userId,
            type: "order_overdue",
            title: "Delivery overdue",
            body: "Your delivery deadline has passed. Please deliver as soon as possible to avoid a dispute.",
            link: `/editor/orders`,
          });
          results.overdueNotified++;
        }
      }
    } catch (err) {
      results.errors.push(`overdue-notify ${order.id}: ${err}`);
    }
  }

  // ── 3. Auto-approve delivered orders after 7 days of client inaction ─────────
  const cutoff7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const staleDelivered = await db
    .select({
      id: orders.id,
      clientId: orders.clientId,
      editorId: orders.editorId,
      totalAmount: orders.totalAmount,
      commissionAmount: orders.commissionAmount,
      processingFee: orders.processingFee,
      deliveredAt: orders.deliveredAt,
    })
    .from(orders)
    .where(and(eq(orders.status, "delivered"), lt(orders.deliveredAt, cutoff7d)));

  for (const order of staleDelivered) {
    try {
      const completedAt = new Date();
      await db
        .update(orders)
        .set({ status: "completed", completedAt, updatedAt: completedAt })
        .where(eq(orders.id, order.id));

      createOrderEvent(order.id, null, "order_completed", { reason: "auto-approved after 7 days" });

      const packagePrice = order.totalAmount - (order.processingFee ?? 0);
      const preCommissionNet = packagePrice - order.commissionAmount;
      const { tdsAmount, tdsRatePct } = await computeTdsForEditor(order.editorId, preCommissionNet);
      const netAmount = preCommissionNet - tdsAmount;
      const scheduledPayoutAt = new Date(completedAt.getTime() + 7 * 24 * 60 * 60 * 1000);

      await db.insert(payouts).values({
        editorId: order.editorId,
        orderId: order.id,
        grossAmount: packagePrice,
        commissionAmount: order.commissionAmount,
        tdsAmount,
        tdsRatePct,
        netAmount,
        status: "pending",
        scheduledPayoutAt,
      });

      createOrderEvent(order.id, null, "payout_scheduled", { scheduledPayoutAt: scheduledPayoutAt.toISOString(), netAmount });

      const [editorRow] = await db
        .select({ userId: editors.userId })
        .from(editors)
        .where(eq(editors.id, order.editorId))
        .limit(1);

      if (editorRow) {
        // Rewards (fire-and-forget)
        onEditorOrderCompleted(editorRow.userId, order.editorId, order.id, false).catch(() => {});

        // Notify editor
        const [pkg, editorUser] = await Promise.all([
          db.select({ title: packages.title }).from(packages).innerJoin(orders, eq(orders.packageId, packages.id)).where(eq(orders.id, order.id)).limit(1).then(r => r[0]),
          db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, editorRow.userId)).limit(1).then(r => r[0]),
        ]);

        if (editorUser && pkg) {
          notifyOrderCompleted({
            editorEmail: editorUser.email,
            editorName: editorUser.name ?? "",
            clientName: "",
            packageTitle: pkg.title,
            payout: netAmount,
            orderId: order.id,
          });
        }

        // In-app notification to editor
        await db.insert(notifications).values({
          userId: editorRow.userId,
          type: "order_completed",
          title: "Order auto-approved — payout scheduled",
          body: "The client didn't respond within 7 days, so your delivery was automatically approved. Payout is scheduled.",
          link: `/editor/orders`,
        });
      }

      // In-app notification to client
      await db.insert(notifications).values({
        userId: order.clientId,
        type: "order_completed",
        title: "Order auto-approved",
        body: "Your order was automatically approved after 7 days. If you have concerns, please contact support.",
        link: `/orders/${order.id}`,
      });

      results.autoApproved++;
    } catch (err) {
      results.errors.push(`auto-approve ${order.id}: ${err}`);
    }
  }

  // ── 4. Resume editors whose vacation period has ended ─────────────────────
  let vacationResumed = 0;
  try {
    const resumed = await db
      .update(editors)
      .set({ isAvailable: true, vacationUntil: null, updatedAt: now })
      .where(sql`${editors.vacationUntil} IS NOT NULL AND ${editors.vacationUntil} <= ${now}`)
      .returning({ id: editors.id });
    vacationResumed = resumed.length;
  } catch (err) {
    results.errors.push(`vacation-resume: ${err}`);
  }

  // ── 5. Publish scheduled announcements ────────────────────────────────────
  let announcementsPublished = 0;
  try {
    const published = await db
      .update(announcements)
      .set({ isActive: true })
      .where(
        and(
          eq(announcements.isActive, false),
          sql`${announcements.scheduledAt} IS NOT NULL AND ${announcements.scheduledAt} <= ${now}`
        )
      )
      .returning({ id: announcements.id });
    announcementsPublished = published.length;
  } catch (err) {
    results.errors.push(`announcement publish: ${err}`);
  }

  // ── 6. Expire KYC for long-inactive editors ───────────────────────────────
  // Editors whose KYC was approved > 365 days ago AND have had no orders in
  // the last 180 days are flagged as "expired" and must re-verify.
  let kycExpired = 0;
  try {
    const cutoff365 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const cutoff180 = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    const expiredEditors = await db
      .select({ id: editors.id, userId: editors.userId })
      .from(editors)
      .where(
        and(
          eq(editors.kycStatus, "approved"),
          isNotNull(editors.kycApprovedAt),
          sql`${editors.kycApprovedAt} < ${cutoff365}`
        )
      );

    for (const editor of expiredEditors) {
      // Only expire if no orders in last 180 days
      const [recentOrder] = await db
        .select({ id: orders.id })
        .from(orders)
        .where(and(eq(orders.editorId, editor.id), sql`${orders.createdAt} > ${cutoff180}`))
        .limit(1);

      if (!recentOrder) {
        await db
          .update(editors)
          .set({ kycStatus: "expired", updatedAt: now })
          .where(eq(editors.id, editor.id));

        await db.insert(notifications).values({
          userId: editor.userId,
          type: "kyc_rejected",
          title: "KYC verification expired",
          body: "Your identity verification has expired after 1 year of inactivity. Please resubmit your documents to continue using the platform.",
          link: "/editor/kyc/resubmit",
        });

        kycExpired++;
      }
    }
  } catch (err) {
    results.errors.push(`kyc-expire: ${err}`);
  }

  console.log("[cron/orders]", { ...results, announcementsPublished, vacationResumed, kycExpired });
  return NextResponse.json({ ok: true, ...results, announcementsPublished, vacationResumed, kycExpired });
}

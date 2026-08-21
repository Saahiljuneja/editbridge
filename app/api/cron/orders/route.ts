import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, editors, users, packages, notifications, payouts, announcements } from "@/lib/db/schema";
import { eq, and, lt, inArray, sql, isNotNull } from "drizzle-orm";
import { createRefund } from "@/lib/razorpay";
import { notifyOrderCompleted } from "@/lib/notifications";
import { onEditorOrderCompleted, onClientOrderCompleted, onRepeatClientPair } from "@/lib/rewards";
import { maybeTriggerReferralReward } from "@/lib/referrals";
import { createOrderEvent } from "@/lib/order-events";
import { computeTdsForEditor } from "@/lib/tds";
import { revalidatePublicPagesCache } from "@/lib/revalidate";
import { updateCronHeartbeat } from "@/lib/cron-heartbeat";
import { persistEditorHealth } from "@/lib/health";

// Called by Vercel Cron — secured by CRON_SECRET header
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron] CRON_SECRET is not configured");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
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

  const cancelResults = await Promise.allSettled(stalePending.map(async (order) => {
    // Atomic: only update if still pending — guards against simultaneous editor acceptance
    const updated = await db
      .update(orders)
      .set({
        status: "cancelled",
        cancelledAt: now,
        cancellationReason: "EDITOR_NO_RESPONSE",
        cancelledBy: "system",
        updatedAt: now,
      })
      .where(and(eq(orders.id, order.id), eq(orders.status, "pending")))
      .returning({ id: orders.id });

    if (updated.length === 0) return; // editor accepted at the exact same moment

    createOrderEvent(order.id, null, "order_cancelled", { cancelledBy: "system", reason: "EDITOR_NO_RESPONSE" });

    if (order.razorpayPaymentId) {
      try {
        await createRefund(order.razorpayPaymentId, order.totalAmount);
      } catch (err) {
        console.error("[cron] refund failed for auto-cancel", order.id, err);
        createOrderEvent(order.id, null, "refund_failed", {
          triggeredBy: "cron_auto_cancel",
          error: String(err),
          razorpayPaymentId: order.razorpayPaymentId,
          amount: order.totalAmount,
        });
        // Alert admin
        const [adminUser] = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin")).limit(1);
        if (adminUser) {
          await db.insert(notifications).values({
            userId: adminUser.id,
            type: "order_cancelled",
            title: "Refund failed — auto-cancel",
            body: `Order ${order.id} was auto-cancelled (editor no response) but the Razorpay refund failed. Initiate manually.`,
            link: `/admin/orders/${order.id}`,
          });
        }
      }
    }

    await db.insert(notifications).values({
      userId: order.clientId,
      type: "order_cancelled",
      title: "Order auto-cancelled",
      body: "Your order was automatically cancelled because the editor did not respond within 24 hours. A full refund has been initiated.",
      link: `/orders/${order.id}`,
    });

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
  }));

  results.autoCancelled = cancelResults.filter(r => r.status === "fulfilled").length;
  cancelResults.forEach((r, i) => {
    if (r.status === "rejected") results.errors.push(`auto-cancel ${stalePending[i].id}: ${r.reason}`);
  });

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

  const overdueResults = await Promise.allSettled(overdueOrders.map(async (order) => {
    const [editorRow] = await db
      .select({ userId: editors.userId })
      .from(editors)
      .where(eq(editors.id, order.editorId))
      .limit(1);

    if (!editorRow) return false;

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const [alreadyNotified] = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(
        eq(notifications.userId, editorRow.userId),
        eq(notifications.type, "order_overdue"),
        sql`${notifications.createdAt} >= ${todayStart}`
      ))
      .limit(1);

    if (alreadyNotified) return false;

    await db.insert(notifications).values({
      userId: editorRow.userId,
      type: "order_overdue",
      title: "Delivery overdue",
      body: "Your delivery deadline has passed. Please deliver as soon as possible to avoid a dispute.",
      link: `/editor/orders`,
    });
    return true;
  }));

  results.overdueNotified = overdueResults.filter(r => r.status === "fulfilled" && r.value === true).length;
  overdueResults.forEach((r, i) => {
    if (r.status === "rejected") results.errors.push(`overdue-notify ${overdueOrders[i].id}: ${r.reason}`);
  });

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

  const approveResults = await Promise.allSettled(staleDelivered.map(async (order) => {
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
      onEditorOrderCompleted(editorRow.userId, order.editorId, order.id, false).catch(() => {});
      onClientOrderCompleted(order.clientId, order.id).catch(() => {});
      onRepeatClientPair(order.clientId, order.editorId).catch(() => {});
      maybeTriggerReferralReward(order.clientId, order.id).catch(() => {});

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

      await db.insert(notifications).values({
        userId: editorRow.userId,
        type: "order_completed",
        title: "Order auto-approved — payout scheduled",
        body: "The client didn't respond within 7 days, so your delivery was automatically approved. Payout is scheduled.",
        link: `/editor/orders`,
      });
    }

    await db.insert(notifications).values({
      userId: order.clientId,
      type: "order_completed",
      title: "Order auto-approved",
      body: "Your order was automatically approved after 7 days. If you have concerns, please contact support.",
      link: `/orders/${order.id}`,
    });
  }));

  results.autoApproved = approveResults.filter(r => r.status === "fulfilled").length;
  approveResults.forEach((r, i) => {
    if (r.status === "rejected") results.errors.push(`auto-approve ${staleDelivered[i].id}: ${r.reason}`);
  });

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

  // ── 7. Reconcile editors.total_orders from real completed-order count ────────
  let totalOrdersReconciled = 0;
  try {
    const reconciled = await db.execute(sql`
      UPDATE editors
      SET
        total_orders = (
          SELECT COUNT(*)::int FROM orders
          WHERE orders.editor_id = editors.id AND orders.status = 'completed'
        ),
        updated_at = NOW()
      WHERE kyc_status = 'approved'
      RETURNING id
    `);
    totalOrdersReconciled = reconciled.rows.length;
  } catch (err) {
    results.errors.push(`total-orders-reconcile: ${err}`);
  }

  // ── 8. Recompute editor rank scores ───────────────────────────────────────
  // rank_score ∈ [0,1] = 40% avgRating + 30% completionRate + 20% order volume + 10% XP level
  let rankScoresUpdated = 0;
  try {
    const ranked = await db.execute(sql`
      UPDATE editors SET
        rank_score = GREATEST(0.0::real, LEAST(1.0::real,
          (
            SELECT COALESCE(AVG(r.rating)::real, 0.0) / 5.0 * 0.40
            FROM reviews r
            WHERE r.reviewee_id = editors.user_id AND r.role = 'client'
          ) +
          COALESCE(editors.completion_rate, 0)::real / 100.0 * 0.30 +
          LEAST(1.0, COALESCE(editors.total_orders, 0)::real / 100.0) * 0.20 +
          CASE COALESCE(
            (SELECT up.level FROM user_points up WHERE up.user_id = editors.user_id LIMIT 1),
            'bronze'
          )
            WHEN 'platinum' THEN 0.10
            WHEN 'gold'     THEN 0.0667
            WHEN 'silver'   THEN 0.0333
            ELSE 0.0
          END
        )),
        updated_at = NOW()
      WHERE kyc_status = 'approved'
      RETURNING id
    `);
    rankScoresUpdated = ranked.rows.length;
  } catch (err) {
    results.errors.push(`rank-score-update: ${err}`);
  }

  // ── 9. Recalculate Account Health for all active editors ─────────────────
  // Safety net: even if triggered recalculations were missed, no score stays stale.
  let healthRecalculated = 0;
  let healthErrors = 0;
  try {
    const activeEditors = await db
      .select({ id: editors.id })
      .from(editors)
      .where(eq(editors.kycStatus, "approved"));

    const healthResults = await Promise.allSettled(
      activeEditors.map(e => persistEditorHealth(e.id))
    );
    healthRecalculated = healthResults.filter(r => r.status === "fulfilled").length;
    healthErrors = healthResults.filter(r => r.status === "rejected").length;
  } catch (err) {
    results.errors.push(`health-recalculate: ${err}`);
  }

  console.log("[cron/orders]", { ...results, announcementsPublished, vacationResumed, kycExpired, totalOrdersReconciled, rankScoresUpdated, healthRecalculated, healthErrors });
  revalidatePublicPagesCache();
  await updateCronHeartbeat("orders");
  return NextResponse.json({ ok: true, ...results, announcementsPublished, vacationResumed, kycExpired, totalOrdersReconciled, rankScoresUpdated, healthRecalculated, healthErrors });
}

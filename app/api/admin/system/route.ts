import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, orders, kycApplications, disputes, payouts, auditLogs, portfolioItems, packages, messages, platformSettings } from "@/lib/db/schema";
import { count, sql, desc, eq, gte, inArray } from "drizzle-orm";
import dns from "dns/promises";
import { revalidatePublicPagesCache } from "@/lib/revalidate";
import { sendEmail } from "@/lib/resend";
import { bustMaintenanceCache } from "@/lib/maintenance-cache";
import { bustPlatformSettingsCache } from "@/lib/platform-settings";

export const dynamic = "force-dynamic";

async function pingHost(host: string): Promise<number | null> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`https://${host}`, { method: "HEAD", signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok || res.status < 500) {
      return Date.now() - start;
    }
    return null;
  } catch {
    try {
      await dns.lookup(host);
      return Date.now() - start;
    } catch {
      return null;
    }
  }
}

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const dbStart = Date.now();
    const [
      userCount,
      orderCount,
      packageCount,
      portfolioCount,
      disputeCount,
      payoutCount,
      kycCount,
      logs,
      ordersToday,
      revenueTodayRow,
      signupsToday,
      messagesToday,
      kycPending,
      openDisputes,
      pendingPayouts,
      settingRows,
    ] = await Promise.all([
      db.select({ value: count() }).from(users).then(r => r[0].value),
      db.select({ value: count() }).from(orders).then(r => r[0].value),
      db.select({ value: count() }).from(packages).then(r => r[0].value),
      db.select({ value: count() }).from(portfolioItems).then(r => r[0].value),
      db.select({ value: count() }).from(disputes).then(r => r[0].value),
      db.select({ value: count() }).from(payouts).then(r => r[0].value),
      db.select({ value: count() }).from(kycApplications).then(r => r[0].value),
      db.select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        metadata: auditLogs.metadata,
        createdAt: sql<string>`${auditLogs.createdAt}::text`,
        actorName: users.name,
        actorRole: auditLogs.actorRole,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorId, users.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(10),
      db.select({ value: count() }).from(orders).where(gte(orders.createdAt, todayStart)).then(r => r[0].value),
      db.select({ total: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)::int` }).from(orders).where(gte(orders.createdAt, todayStart)).then(r => r[0].total),
      db.select({ value: count() }).from(users).where(gte(users.createdAt, todayStart)).then(r => r[0].value),
      db.select({ value: count() }).from(messages).where(gte(messages.createdAt, todayStart)).then(r => r[0].value),
      db.select({ value: count() }).from(kycApplications).where(eq(kycApplications.status, "pending")).then(r => r[0].value),
      db.select({ value: count() }).from(disputes).where(eq(disputes.status, "open")).then(r => r[0].value),
      db.select({ value: count() }).from(payouts).where(eq(payouts.status, "pending")).then(r => r[0].value),
      db.select().from(platformSettings).where(inArray(platformSettings.key, [
        "maintenance_mode",
        "cron_orders_last_run",
        "cron_nudges_last_run",
        "cron_expire-featured_last_run",
        "cron_offline-notifications_last_run",
      ])).then(rows => Object.fromEntries(rows.map(r => [r.key, r.value]))),
    ]);
    const dbLatency = Date.now() - dbStart;

    const r2Host = process.env.R2_ACCOUNT_ID
      ? `${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
      : "cloudflare.com";

    const [r2Ping, resendPing, razorpayPing, pusherPing] = await Promise.all([
      pingHost(r2Host),
      pingHost("api.resend.com"),
      pingHost("api.razorpay.com"),
      pingHost("api.pusher.com"),
    ]);

    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    const heapUsedMb = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMb = Math.round(memUsage.heapTotal / 1024 / 1024);

    return NextResponse.json({
      dbLatency,
      uptime,
      heapUsedMb,
      heapTotalMb,
      nodeVersion: process.version,
      tableCounts: {
        users: userCount,
        orders: orderCount,
        packages: packageCount,
        portfolioItems: portfolioCount,
        disputes: disputeCount,
        payouts: payoutCount,
        kycApplications: kycCount,
      },
      pings: {
        database: dbLatency,
        storage: r2Ping,
        email: resendPing,
        payment: razorpayPing,
        pusher: pusherPing,
      },
      auditLogs: logs,
      businessPulse: {
        ordersToday,
        revenueToday: revenueTodayRow ?? 0,
        signupsToday,
        messagesToday,
      },
      pendingQueues: {
        kycPending,
        openDisputes,
        pendingPayouts,
      },
      maintenanceMode: settingRows["maintenance_mode"] === "true",
      cronStatus: {
        orders: settingRows["cron_orders_last_run"] ?? null,
        nudges: settingRows["cron_nudges_last_run"] ?? null,
        expireFeatured: settingRows["cron_expire-featured_last_run"] ?? null,
        offlineNotifications: settingRows["cron_offline-notifications_last_run"] ?? null,
      },
    });
  } catch (error) {
    console.error("Health check route failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, enabled } = body as { action: string; enabled?: boolean };

    if (action === "purge-cache") {
      await revalidatePublicPagesCache();
      return NextResponse.json({ ok: true, message: "Homepage & Category listings cache invalidated successfully!" });
    }

    if (action === "test-email") {
      if (!session.user.email) return NextResponse.json({ error: "Admin email not found in session" }, { status: 400 });
      await sendEmail({
        to: session.user.email,
        subject: "EditBridge System Diagnostic Ping",
        html: `<p>This is a test diagnostic email from the EditBridge System Health Dashboard. Your email connection (Resend) is operational.</p><p>Timestamp: ${new Date().toLocaleString("en-IN")}</p>`,
      });
      return NextResponse.json({ ok: true, message: `Diagnostic email successfully sent to ${session.user.email}!` });
    }

    if (action === "toggle-maintenance") {
      if (typeof enabled !== "boolean") return NextResponse.json({ error: "Missing enabled field" }, { status: 400 });
      const mval = enabled ? "true" : "false";
      await db
        .insert(platformSettings)
        .values({ key: "maintenance_mode", value: mval })
        .onConflictDoUpdate({ target: platformSettings.key, set: { value: mval, updatedAt: new Date() } });
      bustMaintenanceCache();
      bustPlatformSettingsCache();
      return NextResponse.json({ ok: true, maintenanceMode: enabled });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Action execution failed:", error);
    return NextResponse.json({ error: error.message || "Action execution failed" }, { status: 500 });
  }
}

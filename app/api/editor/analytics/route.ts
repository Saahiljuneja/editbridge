import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profileEvents, orders } from "@/lib/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { resolveEditorForEntity } from "@/lib/profile-events";

const ALLOWED_DAYS = [7, 30, 90];

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "editor" || !session.user.editorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const editorId = session.user.editorId;

  const daysParam = Number(request.nextUrl.searchParams.get("days") ?? "7");
  const days = ALLOWED_DAYS.includes(daysParam) ? daysParam : 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [profileViews, packageClicks, ordersInRange, ordersThisMonth] = await Promise.all([
    db.select({ v: sql<number>`COUNT(*)::int` }).from(profileEvents)
      .where(and(eq(profileEvents.editorId, editorId), eq(profileEvents.eventType, "profile_view"), gte(profileEvents.createdAt, since)))
      .then((r) => r[0].v),
    db.select({ v: sql<number>`COUNT(*)::int` }).from(profileEvents)
      .where(and(eq(profileEvents.editorId, editorId), eq(profileEvents.eventType, "package_click"), gte(profileEvents.createdAt, since)))
      .then((r) => r[0].v),
    db.select({ v: sql<number>`COUNT(*)::int` }).from(orders)
      .where(and(eq(orders.editorId, editorId), gte(orders.createdAt, since)))
      .then((r) => r[0].v),
    db.select({ v: sql<number>`COUNT(*)::int` }).from(orders)
      .where(and(eq(orders.editorId, editorId), gte(orders.createdAt, monthStart)))
      .then((r) => r[0].v),
  ]);

  const clickToOrderRate = packageClicks > 0 ? Math.round((ordersInRange / packageClicks) * 1000) / 10 : 0;

  const packageStats = await db.execute<{ id: string; title: string; clicks: number; orders: number }>(sql`
    SELECT p.id, p.title,
      COUNT(DISTINCT pe.id) FILTER (WHERE pe.event_type = 'package_click' AND pe.created_at >= ${since})::int AS clicks,
      COUNT(DISTINCT o.id) FILTER (WHERE o.created_at >= ${since})::int AS orders
    FROM packages p
    LEFT JOIN profile_events pe ON pe.entity_id = p.id AND pe.event_type = 'package_click'
    LEFT JOIN orders o ON o.package_id = p.id
    WHERE p.editor_id = ${editorId}::uuid AND p.is_active = true
    GROUP BY p.id, p.title
    ORDER BY clicks DESC, orders DESC
  `);

  const portfolioStats = await db.execute<{ id: string; title: string | null; type: string; views: number }>(sql`
    SELECT pi.id, pi.title, pi.type,
      COUNT(DISTINCT pe.id) FILTER (WHERE pe.event_type = 'portfolio_view' AND pe.created_at >= ${since})::int AS views
    FROM portfolio_items pi
    LEFT JOIN profile_events pe ON pe.entity_id = pi.id AND pe.event_type = 'portfolio_view'
    WHERE pi.editor_id = ${editorId}::uuid
    GROUP BY pi.id, pi.title, pi.type
    ORDER BY views DESC
  `);

  const dailyTrend = await db.execute<{ date: string; views: number; clicks: number }>(sql`
    SELECT TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') AS date,
      COUNT(*) FILTER (WHERE event_type = 'profile_view')::int AS views,
      COUNT(*) FILTER (WHERE event_type = 'package_click')::int AS clicks
    FROM profile_events
    WHERE editor_id = ${editorId}::uuid AND created_at >= ${since}
    GROUP BY DATE_TRUNC('day', created_at)
    ORDER BY DATE_TRUNC('day', created_at)
  `);

  const packages = packageStats.rows.map((r) => ({ id: r.id, title: r.title, clicks: Number(r.clicks), orders: Number(r.orders) }));
  const mostClickedPackage = packages.length > 0 && packages[0].clicks > 0 ? packages[0] : null;

  return NextResponse.json({
    days,
    profileViews,
    packageClicks,
    clickToOrderRate,
    ordersThisMonth,
    mostClickedPackage,
    packages,
    portfolio: portfolioStats.rows.map((r) => ({ id: r.id, title: r.title, type: r.type, views: Number(r.views) })),
    dailyTrend: dailyTrend.rows.map((r) => ({ date: r.date, views: Number(r.views), clicks: Number(r.clicks) })),
  });
}

const postSchema = z.object({
  eventType: z.literal("package_click"),
  entityId: z.string().uuid(),
});

// Public — anonymous visitors trigger package clicks too. Never blocks navigation:
// unknown entity or any failure just no-ops.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: true });

  try {
    const editorId = await resolveEditorForEntity(parsed.data.eventType, parsed.data.entityId);
    if (!editorId) return NextResponse.json({ ok: true });

    const session = await auth();
    await db.insert(profileEvents).values({
      editorId,
      eventType: parsed.data.eventType,
      entityId: parsed.data.entityId,
      viewerId: session?.user?.userId ?? null,
    });
  } catch (err) {
    console.error("[profile-events] POST failed:", err);
  }

  return NextResponse.json({ ok: true });
}

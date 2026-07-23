import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, packages, editors, users, reviews, payouts, nudgeLogs } from "@/lib/db/schema";
import { and, eq, gte, lt, inArray, sql } from "drizzle-orm";
import {
  notifyWeddingSeasonReminder,
  notifyInactiveClient,
  notifyEditorMonthlyDigest,
} from "@/lib/notifications";

// Indian wedding season peak — nudge repeat wedding clients once each of these months.
const WEDDING_SEASON_MONTHS = [11, 12, 1, 2];
const INACTIVE_DAYS = 60;

function periodKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

// Insert-or-skip: only returns a row (and only then should we send) the first
// time this user+nudge+period combination is attempted.
async function claimNudge(userId: string, nudgeType: string, period: string): Promise<boolean> {
  const [inserted] = await db
    .insert(nudgeLogs)
    .values({ userId, nudgeType, periodKey: period })
    .onConflictDoNothing()
    .returning({ id: nudgeLogs.id });
  return !!inserted;
}

// Called by Vercel Cron — secured by CRON_SECRET header.
// Optional ?asOf=<ISO date> lets this be tested against any point in the
// calendar without waiting for the real wedding season or month boundary.
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const asOf = req.nextUrl.searchParams.get("asOf");
  const now = asOf ? new Date(asOf) : new Date();
  if (Number.isNaN(now.getTime())) {
    return NextResponse.json({ error: "Invalid asOf date" }, { status: 400 });
  }

  const results = { weddingSeasonSent: 0, inactiveClientSent: 0, editorDigestSent: 0, errors: [] as string[] };

  // ── 1. Wedding season reminder — repeat wedding clients, once per season month ──
  const currentMonth = now.getMonth() + 1;
  if (WEDDING_SEASON_MONTHS.includes(currentMonth)) {
    try {
      const weddingClients = await db
        .select({
          clientId: orders.clientId,
          email: users.email,
          name: users.name,
        })
        .from(orders)
        .innerJoin(packages, eq(packages.id, orders.packageId))
        .innerJoin(users, eq(users.id, orders.clientId))
        .where(and(eq(packages.videoCategory, "wedding"), eq(orders.status, "completed")))
        .groupBy(orders.clientId, users.email, users.name);

      const period = periodKey(now.getFullYear(), currentMonth);
      for (const client of weddingClients) {
        try {
          if (await claimNudge(client.clientId, "wedding_season", period)) {
            notifyWeddingSeasonReminder({ clientEmail: client.email, clientName: client.name ?? "" });
            results.weddingSeasonSent++;
          }
        } catch (err) {
          results.errors.push(`wedding-season ${client.clientId}: ${err}`);
        }
      }
    } catch (err) {
      results.errors.push(`wedding-season query: ${err}`);
    }
  }

  // ── 2. Inactive client outreach — no order in the last 60 days ──────────────
  try {
    const cutoff = new Date(now.getTime() - INACTIVE_DAYS * 24 * 60 * 60 * 1000);

    const inactiveClients = await db
      .select({
        clientId: orders.clientId,
        email: users.email,
        name: users.name,
      })
      .from(orders)
      .innerJoin(users, eq(users.id, orders.clientId))
      .groupBy(orders.clientId, users.email, users.name)
      .having(sql`MAX(${orders.createdAt}) < ${cutoff}`);

    const period = periodKey(now.getFullYear(), now.getMonth() + 1);
    for (const client of inactiveClients) {
      try {
        if (await claimNudge(client.clientId, "inactive_client", period)) {
          notifyInactiveClient({ clientEmail: client.email, clientName: client.name ?? "" });
          results.inactiveClientSent++;
        }
      } catch (err) {
        results.errors.push(`inactive-client ${client.clientId}: ${err}`);
      }
    }
  } catch (err) {
    results.errors.push(`inactive-client query: ${err}`);
  }

  // ── 3. Monthly editor earnings digest — summarizes the previous calendar month ──
  try {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth(), 1); // exclusive
    const period = periodKey(monthStart.getFullYear(), monthStart.getMonth() + 1);
    const monthLabel = monthStart.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

    const editorStats = await db
      .select({
        editorUserId: editors.userId,
        email: users.email,
        name: users.name,
        ordersCompleted: sql<number>`COUNT(DISTINCT ${orders.id})::int`,
        totalEarnings: sql<number>`COALESCE(SUM(${payouts.netAmount}), 0)::int`,
      })
      .from(orders)
      .innerJoin(editors, eq(editors.id, orders.editorId))
      .innerJoin(users, eq(users.id, editors.userId))
      .leftJoin(payouts, eq(payouts.orderId, orders.id))
      .where(and(eq(orders.status, "completed"), gte(orders.completedAt, monthStart), lt(orders.completedAt, monthEnd)))
      .groupBy(editors.userId, users.email, users.name);

    const editorUserIds = editorStats.map((e) => e.editorUserId);
    const ratingRows = editorUserIds.length
      ? await db
          .select({
            editorUserId: reviews.revieweeId,
            avgRating: sql<number>`ROUND(AVG(${reviews.rating})::numeric, 1)`,
          })
          .from(reviews)
          .where(
            and(
              inArray(reviews.revieweeId, editorUserIds),
              eq(reviews.role, "client"),
              gte(reviews.createdAt, monthStart),
              lt(reviews.createdAt, monthEnd)
            )
          )
          .groupBy(reviews.revieweeId)
      : [];
    const ratingByUser = new Map(ratingRows.map((r) => [r.editorUserId, Number(r.avgRating)]));

    for (const editor of editorStats) {
      try {
        if (await claimNudge(editor.editorUserId, "editor_monthly_digest", period)) {
          notifyEditorMonthlyDigest({
            editorEmail: editor.email,
            editorName: editor.name ?? "",
            monthLabel,
            ordersCompleted: editor.ordersCompleted,
            totalEarnings: editor.totalEarnings,
            avgRating: ratingByUser.get(editor.editorUserId) ?? null,
          });
          results.editorDigestSent++;
        }
      } catch (err) {
        results.errors.push(`editor-digest ${editor.editorUserId}: ${err}`);
      }
    }
  } catch (err) {
    results.errors.push(`editor-digest query: ${err}`);
  }

  console.log("[cron/nudges]", results);
  return NextResponse.json({ ok: true, ...results });
}

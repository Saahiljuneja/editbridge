import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { savedEditors, editors, users, reviews, orders } from "@/lib/db/schema";
import { and, eq, sql, inArray, desc } from "drizzle-orm";
import { onClientSavedEditor } from "@/lib/rewards";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "client") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const avgRatingExpr = sql<number | null>`ROUND(AVG(${reviews.rating})::numeric, 1)`;

  const rows = await db
    .select({
      savedId: savedEditors.id,
      savedAt: savedEditors.createdAt,
      editorId: editors.id,
      name: users.name,
      displayName: editors.displayName,
      title: editors.title,
      image: users.image,
      niche: editors.niche,
      totalOrders: editors.totalOrders,
      isAvailable: editors.isAvailable,
      vacationUntil: editors.vacationUntil,
      avgRating: avgRatingExpr,
      reviewCount: sql<number>`COUNT(DISTINCT ${reviews.id})::int`,
    })
    .from(savedEditors)
    .innerJoin(editors, eq(editors.id, savedEditors.editorId))
    .innerJoin(users, eq(users.id, editors.userId))
    .leftJoin(reviews, and(eq(reviews.revieweeId, editors.userId), eq(reviews.role, "client")))
    .where(eq(savedEditors.clientId, session.user.userId!))
    .groupBy(savedEditors.id, savedEditors.createdAt, editors.id, users.name, users.image)
    .orderBy(desc(savedEditors.createdAt));

  const editorIds = rows.map((r) => r.editorId);

  // Find the most recent order (with a package) between this client and each saved editor,
  // so the UI can offer a one-click "re-order" using the last package + brief.
  const lastOrders = editorIds.length
    ? await db
        .select({
          editorId: orders.editorId,
          orderId: orders.id,
          packageId: orders.packageId,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(
          and(
            eq(orders.clientId, session.user.userId!),
            inArray(orders.editorId, editorIds),
            sql`${orders.packageId} IS NOT NULL`
          )
        )
        .orderBy(desc(orders.createdAt))
    : [];

  const lastOrderByEditor = new Map<string, { orderId: string; packageId: string }>();
  for (const o of lastOrders) {
    if (!lastOrderByEditor.has(o.editorId) && o.packageId) {
      lastOrderByEditor.set(o.editorId, { orderId: o.orderId, packageId: o.packageId });
    }
  }

  const result = rows.map((r) => ({
    editorId: r.editorId,
    name: r.name,
    displayName: r.displayName,
    title: r.title,
    image: r.image,
    niche: r.niche,
    totalOrders: r.totalOrders,
    isAvailable: r.isAvailable,
    vacationUntil: r.vacationUntil,
    avgRating: r.avgRating,
    reviewCount: r.reviewCount,
    savedAt: r.savedAt,
    lastOrder: lastOrderByEditor.get(r.editorId) ?? null,
  }));

  return NextResponse.json({ editors: result });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "client") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const editorId = typeof body.editorId === "string" ? body.editorId : null;
  if (!editorId) {
    return NextResponse.json({ error: "editorId is required" }, { status: 400 });
  }

  const [editor] = await db.select({ id: editors.id, userId: editors.userId }).from(editors).where(eq(editors.id, editorId)).limit(1);
  if (!editor) {
    return NextResponse.json({ error: "Editor not found" }, { status: 404 });
  }

  await db
    .insert(savedEditors)
    .values({ clientId: session.user.userId!, editorId })
    .onConflictDoNothing();

  onClientSavedEditor(editor.userId, editorId).catch(() => {});

  return NextResponse.json({ saved: true });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "client") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const editorId = typeof body.editorId === "string" ? body.editorId : null;
  if (!editorId) {
    return NextResponse.json({ error: "editorId is required" }, { status: 400 });
  }

  await db
    .delete(savedEditors)
    .where(and(eq(savedEditors.clientId, session.user.userId!), eq(savedEditors.editorId, editorId)));

  return NextResponse.json({ saved: false });
}

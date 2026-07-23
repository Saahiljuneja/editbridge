import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { portfolioItems } from "@/lib/db/schema";
import { eq, asc, and, inArray, count } from "drizzle-orm";
import { onPortfolioItemAdded } from "@/lib/rewards";
import { cleanupOrphanedPortfolioFiles } from "@/lib/portfolio-cleanup";
import {
  MAX_FEATURED_ITEMS,
  isValidPortfolioUrl,
  isSafeInternalPath,
  sanitizeCategory,
  sanitizeTags,
  sanitizeTitle,
  sanitizeDescription,
} from "@/lib/portfolio-validation";

async function getFeaturedCount(editorId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(portfolioItems)
    .where(and(eq(portfolioItems.editorId, editorId), eq(portfolioItems.isFeatured, true)));
  return row?.value ?? 0;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "editor")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const editorId = session.user.editorId;
  if (!editorId) return NextResponse.json({ error: "Editor not found" }, { status: 404 });

  const body = await request.json();

  // ── Duplicate mode ────────────────────────────────────────────────────────
  if (body.duplicate && body.sourceId) {
    const [source] = await db
      .select()
      .from(portfolioItems)
      .where(and(eq(portfolioItems.id, body.sourceId), eq(portfolioItems.editorId, editorId)))
      .limit(1);
    if (!source) return NextResponse.json({ error: "Source item not found" }, { status: 404 });

    const [{ value: total }] = await db
      .select({ value: count() })
      .from(portfolioItems)
      .where(eq(portfolioItems.editorId, editorId));

    const [copy] = await db
      .insert(portfolioItems)
      .values({
        editorId,
        type: source.type,
        url: source.url,
        beforeUrl: source.beforeUrl,
        thumbnailUrl: source.thumbnailUrl,
        title: source.title ? `${source.title} (copy)` : null,
        description: source.description,
        category: source.category,
        tags: source.tags ?? [],
        isFeatured: false,
        isHidden: source.isHidden,
        sortOrder: total,
      })
      .returning();

    return NextResponse.json(copy, { status: 201 });
  }

  // ── Normal create ─────────────────────────────────────────────────────────
  const { type, url, beforeUrl, thumbnailUrl, title, description, category, tags, isFeatured, isHidden, sortOrder } = body;
  if (!type || !url) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (!["video", "image"].includes(type))
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  if (!isValidPortfolioUrl(type, url))
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  if (beforeUrl != null && !isSafeInternalPath(beforeUrl))
    return NextResponse.json({ error: "Invalid beforeUrl" }, { status: 400 });
  if (thumbnailUrl != null && !isSafeInternalPath(thumbnailUrl))
    return NextResponse.json({ error: "Invalid thumbnailUrl" }, { status: 400 });

  let featured = !!isFeatured;
  if (featured && (await getFeaturedCount(editorId)) >= MAX_FEATURED_ITEMS) featured = false;

  const [item] = await db
    .insert(portfolioItems)
    .values({
      editorId, type, url,
      beforeUrl: beforeUrl ?? null,
      thumbnailUrl: thumbnailUrl ?? null,
      title: sanitizeTitle(title),
      description: sanitizeDescription(description),
      category: sanitizeCategory(category),
      tags: sanitizeTags(tags),
      isFeatured: featured,
      isHidden: isHidden ?? false,
      sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
    })
    .returning();

  onPortfolioItemAdded(session.user.userId!, editorId).catch(() => {});

  return NextResponse.json(item, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "editor")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const editorId = session.user.editorId;
  if (!editorId) return NextResponse.json({ error: "Editor not found" }, { status: 404 });

  const body = await request.json();

  // ── Bulk action ───────────────────────────────────────────────────────────
  if (body.bulk) {
    const { ids, action, category } = body.bulk as {
      ids: string[];
      action: "delete" | "feature" | "unfeature" | "hide" | "unhide" | "setCategory";
      category?: string;
    };
    if (!Array.isArray(ids) || ids.length === 0)
      return NextResponse.json({ error: "No ids" }, { status: 400 });

    const where = and(eq(portfolioItems.editorId, editorId), inArray(portfolioItems.id, ids));

    if (action === "delete") {
      const deletedRows = await db
        .delete(portfolioItems)
        .where(where)
        .returning({ url: portfolioItems.url, beforeUrl: portfolioItems.beforeUrl, thumbnailUrl: portfolioItems.thumbnailUrl });
      cleanupOrphanedPortfolioFiles(editorId, deletedRows).catch(() => {});
    } else if (action === "feature") {
      const currentFeatured = await getFeaturedCount(editorId);
      const remainingSlots = Math.max(0, MAX_FEATURED_ITEMS - currentFeatured);
      if (remainingSlots === 0) {
        return NextResponse.json({ error: `You can feature at most ${MAX_FEATURED_ITEMS} items — unfeature another first.` }, { status: 400 });
      }
      const limitedIds = ids.slice(0, remainingSlots);
      await db.update(portfolioItems).set({ isFeatured: true })
        .where(and(eq(portfolioItems.editorId, editorId), inArray(portfolioItems.id, limitedIds)));
      return NextResponse.json({ success: true, featured: limitedIds.length, skipped: ids.length - limitedIds.length });
    } else if (action === "unfeature") {
      await db.update(portfolioItems).set({ isFeatured: false }).where(where);
    } else if (action === "hide") {
      await db.update(portfolioItems).set({ isHidden: true }).where(where);
    } else if (action === "unhide") {
      await db.update(portfolioItems).set({ isHidden: false }).where(where);
    } else if (action === "setCategory") {
      await db.update(portfolioItems).set({ category: sanitizeCategory(category) }).where(where);
    }

    return NextResponse.json({ success: true });
  }

  // ── Batch reorder ─────────────────────────────────────────────────────────
  const { order } = body as { order: { id: string; sortOrder: number }[] };
  if (!Array.isArray(order)) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  await Promise.all(
    order.map(({ id, sortOrder }) =>
      db.update(portfolioItems)
        .set({ sortOrder })
        .where(and(eq(portfolioItems.id, id), eq(portfolioItems.editorId, editorId)))
    )
  );

  return NextResponse.json({ success: true });
}

export async function GET() {
  const session = await auth();
  if (!session || session.user?.role !== "editor")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const editorId = session.user.editorId;
  if (!editorId) return NextResponse.json([]);

  const rows = await db
    .select()
    .from(portfolioItems)
    .where(eq(portfolioItems.editorId, editorId))
    .orderBy(asc(portfolioItems.sortOrder), asc(portfolioItems.createdAt));

  return NextResponse.json(rows);
}

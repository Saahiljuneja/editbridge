import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { portfolioItems, orders } from "@/lib/db/schema";
import { and, eq, count } from "drizzle-orm";
import { cleanupOrphanedPortfolioFiles } from "@/lib/portfolio-cleanup";
import {
  MAX_FEATURED_ITEMS,
  isSafeInternalPath,
  sanitizeCategory,
  sanitizeTags,
  sanitizeTitle,
  sanitizeDescription,
} from "@/lib/portfolio-validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user?.role !== "editor")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const editorId = session.user.editorId;
  if (!editorId) return NextResponse.json({ error: "Editor not found" }, { status: 404 });

  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = {};
  if ("title" in body)        updates.title        = sanitizeTitle(body.title);
  if ("description" in body)  updates.description  = sanitizeDescription(body.description);
  if ("category" in body)     updates.category     = sanitizeCategory(body.category);
  if ("isHidden" in body)     updates.isHidden     = body.isHidden;
  if ("sortOrder" in body)    updates.sortOrder    = body.sortOrder;
  if ("tags" in body)         updates.tags         = sanitizeTags(body.tags);

  if ("beforeUrl" in body) {
    if (body.beforeUrl === null) updates.beforeUrl = null;
    else if (isSafeInternalPath(body.beforeUrl)) updates.beforeUrl = body.beforeUrl;
    else return NextResponse.json({ error: "Invalid beforeUrl" }, { status: 400 });
  }

  if ("thumbnailUrl" in body) {
    if (body.thumbnailUrl === null) updates.thumbnailUrl = null;
    else if (isSafeInternalPath(body.thumbnailUrl)) updates.thumbnailUrl = body.thumbnailUrl;
    else return NextResponse.json({ error: "Invalid thumbnailUrl" }, { status: 400 });
  }

  if ("isFeatured" in body) {
    if (body.isFeatured) {
      const [row] = await db
        .select({ value: count() })
        .from(portfolioItems)
        .where(and(eq(portfolioItems.editorId, editorId), eq(portfolioItems.isFeatured, true)));
      const currentFeatured = row?.value ?? 0;

      const [existing] = await db
        .select({ isFeatured: portfolioItems.isFeatured })
        .from(portfolioItems)
        .where(and(eq(portfolioItems.id, id), eq(portfolioItems.editorId, editorId)))
        .limit(1);

      if (!existing?.isFeatured && currentFeatured >= MAX_FEATURED_ITEMS) {
        return NextResponse.json(
          { error: `You can feature at most ${MAX_FEATURED_ITEMS} items — unfeature another first.` },
          { status: 400 }
        );
      }
    }
    updates.isFeatured = body.isFeatured;
  }

  // Verified-portfolio link: only accept a genuinely completed order belonging to this editor.
  if ("orderId" in body) {
    if (body.orderId === null) {
      updates.orderId = null;
    } else {
      const [order] = await db
        .select({ id: orders.id, editorId: orders.editorId, status: orders.status })
        .from(orders)
        .where(eq(orders.id, body.orderId))
        .limit(1);
      if (!order || order.editorId !== editorId || order.status !== "completed")
        return NextResponse.json({ error: "Order must be one of your own completed orders" }, { status: 400 });
      updates.orderId = order.id;
    }
  }

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  // If beforeUrl/thumbnailUrl are being replaced, capture the old values so the
  // now-orphaned R2 objects can be cleaned up once the new ones are saved.
  const watchingFileFields = "beforeUrl" in updates || "thumbnailUrl" in updates;
  const previousFiles = watchingFileFields
    ? (await db
        .select({ beforeUrl: portfolioItems.beforeUrl, thumbnailUrl: portfolioItems.thumbnailUrl })
        .from(portfolioItems)
        .where(and(eq(portfolioItems.id, id), eq(portfolioItems.editorId, editorId)))
        .limit(1))[0] ?? null
    : null;

  const [updated] = await db
    .update(portfolioItems)
    .set(updates)
    .where(and(eq(portfolioItems.id, id), eq(portfolioItems.editorId, editorId)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (previousFiles) {
    const replacedRows: { url: string; beforeUrl: string | null; thumbnailUrl: string | null }[] = [];
    if ("beforeUrl" in updates && previousFiles.beforeUrl && previousFiles.beforeUrl !== updated.beforeUrl) {
      replacedRows.push({ url: "", beforeUrl: previousFiles.beforeUrl, thumbnailUrl: null });
    }
    if ("thumbnailUrl" in updates && previousFiles.thumbnailUrl && previousFiles.thumbnailUrl !== updated.thumbnailUrl) {
      replacedRows.push({ url: "", beforeUrl: null, thumbnailUrl: previousFiles.thumbnailUrl });
    }
    if (replacedRows.length > 0) cleanupOrphanedPortfolioFiles(editorId, replacedRows).catch(() => {});
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user?.role !== "editor")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const editorId = session.user.editorId;
  if (!editorId) return NextResponse.json({ error: "Editor not found" }, { status: 404 });

  const { id } = await params;

  const [deleted] = await db
    .delete(portfolioItems)
    .where(and(eq(portfolioItems.id, id), eq(portfolioItems.editorId, editorId)))
    .returning({ url: portfolioItems.url, beforeUrl: portfolioItems.beforeUrl, thumbnailUrl: portfolioItems.thumbnailUrl });

  if (deleted) cleanupOrphanedPortfolioFiles(editorId, [deleted]).catch(() => {});

  return NextResponse.json({ success: true });
}

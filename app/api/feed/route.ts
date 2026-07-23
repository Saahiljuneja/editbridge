import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { portfolioItems, portfolioLikes, portfolioSaves, editors, users } from "@/lib/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { toPortfolioProxyUrl } from "@/lib/portfolio-url";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

// GET /api/feed?cursor=<offset>&category=<cat>
export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.userId ?? null;

  const offsetParam = req.nextUrl.searchParams.get("cursor");
  const offset = offsetParam ? parseInt(offsetParam, 10) : 0;
  const category = req.nextUrl.searchParams.get("category") ?? null;

  // Engagement score: likes×3 + comments×5 + views×0.1, decayed by age (half-life ~7 days)
  const scoreExpr = sql<number>`(
    ${portfolioItems.likesCount} * 3.0 +
    ${portfolioItems.commentsCount} * 5.0 +
    ${portfolioItems.viewsCount} * 0.1
  ) * EXP(
    -0.693 * EXTRACT(EPOCH FROM (NOW() - ${portfolioItems.createdAt})) / 604800.0
  )`;

  const rows = await db
    .select({
      id: portfolioItems.id,
      type: portfolioItems.type,
      url: portfolioItems.url,
      beforeUrl: portfolioItems.beforeUrl,
      thumbnailUrl: portfolioItems.thumbnailUrl,
      title: portfolioItems.title,
      description: portfolioItems.description,
      category: portfolioItems.category,
      isFeatured: portfolioItems.isFeatured,
      likesCount: portfolioItems.likesCount,
      commentsCount: portfolioItems.commentsCount,
      viewsCount: portfolioItems.viewsCount,
      orderId: portfolioItems.orderId,
      createdAt: portfolioItems.createdAt,
      editorId: portfolioItems.editorId,
      editorDisplayName: editors.displayName,
      editorUserId: editors.userId,
      editorUserName: users.name,
      editorUserImage: users.image,
      score: scoreExpr,
    })
    .from(portfolioItems)
    .innerJoin(editors, eq(portfolioItems.editorId, editors.id))
    .innerJoin(users, eq(editors.userId, users.id))
    .where(
      and(
        eq(editors.kycStatus, "approved"), // #10: only show KYC-approved editors
        eq(portfolioItems.isHidden, false), // respect the editor's own hide toggle
        category ? eq(portfolioItems.category, category) : undefined
      )
    )
    .orderBy(desc(scoreExpr))
    .limit(PAGE_SIZE + 1)
    .offset(offset);

  const hasMore = rows.length > PAGE_SIZE;
  const items = rows.slice(0, PAGE_SIZE);

  // Check which items the current user has liked / saved (#5, #6)
  let likedSet = new Set<string>();
  let savedSet = new Set<string>();
  if (userId && items.length > 0) {
    const itemIds = items.map(i => i.id);
    const anyOf = sql.raw(`ARRAY[${itemIds.map(id => `'${id}'`).join(",")}]::uuid[]`);
    const [liked, saved] = await Promise.all([
      db.select({ portfolioItemId: portfolioLikes.portfolioItemId })
        .from(portfolioLikes)
        .where(and(eq(portfolioLikes.userId, userId), sql`${portfolioLikes.portfolioItemId} = ANY(${anyOf})`)),
      db.select({ portfolioItemId: portfolioSaves.portfolioItemId })
        .from(portfolioSaves)
        .where(and(eq(portfolioSaves.userId, userId), sql`${portfolioSaves.portfolioItemId} = ANY(${anyOf})`)),
    ]);
    likedSet = new Set(liked.map(l => l.portfolioItemId));
    savedSet = new Set(saved.map(s => s.portfolioItemId));
  }

  const r2Base = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");

  const feed = items.map(item => ({
    ...item,
    score: undefined,
    url: toPortfolioProxyUrl(item.url, r2Base) ?? item.url,
    beforeUrl: toPortfolioProxyUrl(item.beforeUrl, r2Base),
    thumbnailUrl: toPortfolioProxyUrl(item.thumbnailUrl, r2Base),
    isLiked: likedSet.has(item.id),
    isSaved: savedSet.has(item.id),
    editorDisplayName: item.editorDisplayName || item.editorUserName || "Editor",
  }));

  const nextCursor = hasMore ? String(offset + PAGE_SIZE) : null;

  return NextResponse.json({ feed, nextCursor });
}

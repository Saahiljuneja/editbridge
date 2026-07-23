import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { portfolioItems, portfolioLikes, portfolioSaves, editors, users } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.userId ?? null;

  const rows = await db
    .select({
      id: portfolioItems.id,
      type: portfolioItems.type,
      url: portfolioItems.url,
      beforeUrl: portfolioItems.beforeUrl,
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
      editorUserId: editors.userId,
      editorDisplayName: editors.displayName,
      editorUserName: users.name,
      editorUserImage: users.image,
    })
    .from(portfolioItems)
    .innerJoin(editors, eq(portfolioItems.editorId, editors.id))
    .innerJoin(users, eq(editors.userId, users.id))
    .where(and(eq(portfolioItems.id, id), eq(editors.kycStatus, "approved")))
    .limit(1);

  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const item = rows[0];

  let isLiked = false;
  let isSaved = false;
  if (userId) {
    const anyOf = sql.raw(`'${id}'::uuid`);
    const [likeRow, saveRow] = await Promise.all([
      db.select({ id: portfolioLikes.portfolioItemId }).from(portfolioLikes)
        .where(and(eq(portfolioLikes.userId, userId), sql`${portfolioLikes.portfolioItemId} = ${anyOf}`))
        .limit(1),
      db.select({ id: portfolioSaves.portfolioItemId }).from(portfolioSaves)
        .where(and(eq(portfolioSaves.userId, userId), sql`${portfolioSaves.portfolioItemId} = ${anyOf}`))
        .limit(1),
    ]);
    isLiked = likeRow.length > 0;
    isSaved = saveRow.length > 0;
  }

  const r2Base = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
  const toProxy = (raw: string | null) => {
    if (!raw) return null;
    if (raw.startsWith("/api/file/")) return raw;
    if (r2Base && raw.startsWith(r2Base)) return `/api/file/${raw.slice(r2Base.length + 1)}`;
    return `/api/file/${raw}`;
  };

  return NextResponse.json({
    ...item,
    url: toProxy(item.url) ?? item.url,
    beforeUrl: toProxy(item.beforeUrl ?? null),
    editorDisplayName: item.editorDisplayName || item.editorUserName || "Editor",
    isLiked,
    isSaved,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { portfolioLikes, portfolioItems, editors, users } from "@/lib/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { createInAppNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// GET /api/portfolio/like?portfolioItemId=xxx — who liked this item (#5)
export async function GET(req: NextRequest) {
  const portfolioItemId = req.nextUrl.searchParams.get("portfolioItemId");
  if (!portfolioItemId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const rows = await db
    .select({ userId: users.id, name: users.name, image: users.image, likedAt: portfolioLikes.createdAt })
    .from(portfolioLikes)
    .innerJoin(users, eq(portfolioLikes.userId, users.id))
    .where(eq(portfolioLikes.portfolioItemId, portfolioItemId))
    .orderBy(desc(portfolioLikes.createdAt))
    .limit(50);

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { portfolioItemId } = await req.json();
  if (!portfolioItemId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const userId = session.user.userId;

  try {
    await db.insert(portfolioLikes).values({ portfolioItemId, userId });
  } catch {
    return NextResponse.json({ liked: true }); // already liked
  }

  await db.update(portfolioItems)
    .set({ likesCount: sql`${portfolioItems.likesCount} + 1` })
    .where(eq(portfolioItems.id, portfolioItemId));

  // Notify the editor (fire-and-forget, skip if liker is the editor themselves)
  const itemRow = await db
    .select({ editorId: portfolioItems.editorId, title: portfolioItems.title })
    .from(portfolioItems)
    .where(eq(portfolioItems.id, portfolioItemId))
    .limit(1)
    .then(r => r[0]);

  if (itemRow) {
    const editorRow = await db
      .select({ userId: editors.userId })
      .from(editors)
      .where(eq(editors.id, itemRow.editorId))
      .limit(1)
      .then(r => r[0]);

    if (editorRow && editorRow.userId !== userId) {
      const liker = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
        .then(r => r[0]);

      createInAppNotification({
        userId: editorRow.userId,
        type: "portfolio_like",
        title: `${liker?.name ?? "Someone"} liked your portfolio item`,
        body: itemRow.title ?? undefined,
        link: `/feed`,
      }).catch(() => {});
    }
  }

  return NextResponse.json({ liked: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { portfolioItemId } = await req.json();
  if (!portfolioItemId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const userId = session.user.userId;

  const deleted = await db.delete(portfolioLikes)
    .where(and(eq(portfolioLikes.portfolioItemId, portfolioItemId), eq(portfolioLikes.userId, userId)))
    .returning();

  if (deleted.length > 0) {
    await db.update(portfolioItems)
      .set({ likesCount: sql`GREATEST(${portfolioItems.likesCount} - 1, 0)` })
      .where(eq(portfolioItems.id, portfolioItemId));
  }

  return NextResponse.json({ liked: false });
}

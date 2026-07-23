import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { portfolioComments, portfolioItems, editors, users } from "@/lib/db/schema";
import { eq, desc, sql, gt, count, and } from "drizzle-orm";
import { createInAppNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const portfolioItemId = req.nextUrl.searchParams.get("portfolioItemId");
  if (!portfolioItemId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const rows = await db
    .select({
      id: portfolioComments.id,
      text: portfolioComments.text,
      createdAt: portfolioComments.createdAt,
      userId: portfolioComments.userId,
      parentId: portfolioComments.parentId,
      userName: users.name,
      userImage: users.image,
    })
    .from(portfolioComments)
    .innerJoin(users, eq(portfolioComments.userId, users.id))
    .where(eq(portfolioComments.portfolioItemId, portfolioItemId))
    .orderBy(desc(portfolioComments.createdAt))
    .limit(50);

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { portfolioItemId, text, parentId } = await req.json();
  if (!portfolioItemId || !text?.trim())
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (text.length > 500)
    return NextResponse.json({ error: "Comment too long" }, { status: 400 });

  const userId = session.user.userId;

  // Rate limit: max 5 comments per user per minute (#11)
  const oneMinuteAgo = new Date(Date.now() - 60_000);
  const [{ recentCount }] = await db
    .select({ recentCount: count() })
    .from(portfolioComments)
    .where(and(eq(portfolioComments.userId, userId), gt(portfolioComments.createdAt, oneMinuteAgo)));
  if (recentCount >= 5)
    return NextResponse.json({ error: "Too many comments — slow down" }, { status: 429 });

  const [comment] = await db.insert(portfolioComments)
    .values({ portfolioItemId, userId, text: text.trim(), parentId: parentId ?? null })
    .returning();

  await db.update(portfolioItems)
    .set({ commentsCount: sql`${portfolioItems.commentsCount} + 1` })
    .where(eq(portfolioItems.id, portfolioItemId));

  const userRow = await db.select({ name: users.name, image: users.image })
    .from(users).where(eq(users.id, userId)).limit(1).then(r => r[0]);

  // Notify the editor (fire-and-forget)
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
      createInAppNotification({
        userId: editorRow.userId,
        type: "portfolio_comment",
        title: `${userRow?.name ?? "Someone"} commented on your portfolio`,
        body: text.trim().slice(0, 80),
        link: `/feed`,
      }).catch(() => {});
    }
  }

  return NextResponse.json({
    ...comment,
    userName: userRow?.name ?? null,
    userImage: userRow?.image ?? null,
    parentId: parentId ?? null,
  }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { commentId } = await req.json();
  if (!commentId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const deleted = await db.delete(portfolioComments)
    .where(eq(portfolioComments.id, commentId))
    .returning();

  if (deleted.length > 0) {
    await db.update(portfolioItems)
      .set({ commentsCount: sql`GREATEST(${portfolioItems.commentsCount} - 1, 0)` })
      .where(eq(portfolioItems.id, deleted[0].portfolioItemId));
  }

  return NextResponse.json({ success: true });
}

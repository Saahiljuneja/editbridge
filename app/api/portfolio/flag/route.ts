import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { portfolioComments, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createInAppNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// POST /api/portfolio/flag  { commentId }
// Notifies admin/moderation staff — no separate table needed for MVP
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { commentId } = await req.json();
  if (!commentId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const comment = await db
    .select({ id: portfolioComments.id, text: portfolioComments.text, userId: portfolioComments.userId })
    .from(portfolioComments)
    .where(eq(portfolioComments.id, commentId))
    .limit(1)
    .then(r => r[0]);

  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Mark the comment as flagged for admin review
  await db.update(portfolioComments)
    .set({ isFlagged: true })
    .where(eq(portfolioComments.id, commentId));

  const reporter = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, session.user.userId))
    .limit(1)
    .then(r => r[0]);

  // Notify all moderation admins — find users with admin/staff_moderation role
  const mods = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role as never, "staff_moderation" as never));

  await Promise.all(mods.map(mod =>
    createInAppNotification({
      userId: mod.id,
      type: "comment_flagged",
      title: `Comment flagged by ${reporter?.name ?? "a user"}`,
      body: comment.text.slice(0, 100),
      link: `/admin/moderation`,
    }).catch(() => {})
  ));

  return NextResponse.json({ success: true });
}

// DELETE /api/portfolio/flag  { commentId } — admin dismisses a flag
export async function DELETE(req: NextRequest) {
  const session = await auth();
  const role = session?.user?.role;
  if (!role || !["admin", "staff_moderation"].includes(role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { commentId } = await req.json();
  if (!commentId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db.update(portfolioComments)
    .set({ isFlagged: false })
    .where(eq(portfolioComments.id, commentId));

  return NextResponse.json({ success: true });
}

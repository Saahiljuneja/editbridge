import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, reviews, editors, users, packages } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { submitReviewSchema } from "@/lib/validations";
import { notifyReviewReceived, createInAppNotification, editorWantsNotif } from "@/lib/notifications";
import { onFiveStarReview, onClientReviewLeft } from "@/lib/rewards";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = submitReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { orderId, rating, text } = parsed.data;
  const userId = session.user.userId!;
  const role = session.user.role;

  const [order] = await db
    .select({
      id: orders.id,
      clientId: orders.clientId,
      editorId: orders.editorId,
      status: orders.status,
    })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "completed") {
    return NextResponse.json({ error: "Reviews can only be submitted for completed orders" }, { status: 409 });
  }

  let revieweeId: string;
  let reviewRole: "client" | "editor";

  if (role === "client" && order.clientId === userId) {
    // Client reviews editor
    const [editor] = await db
      .select({ userId: editors.userId })
      .from(editors)
      .where(eq(editors.id, order.editorId))
      .limit(1);
    if (!editor) return NextResponse.json({ error: "Editor not found" }, { status: 404 });
    revieweeId = editor.userId;
    reviewRole = "client";
  } else if (role === "editor" && session.user.editorId === order.editorId) {
    // Editor reviews client
    revieweeId = order.clientId;
    reviewRole = "editor";
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // One review per order per role
  const [existing] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(and(eq(reviews.orderId, orderId), eq(reviews.reviewerId, userId)))
    .limit(1);

  if (existing) {
    return NextResponse.json({ error: "You have already reviewed this order" }, { status: 409 });
  }

  const [review] = await db
    .insert(reviews)
    .values({
      orderId,
      reviewerId: userId,
      revieweeId,
      role: reviewRole,
      rating,
      text: text ?? null,
    })
    .returning();

  // Rewards (fire-and-forget)
  if (reviewRole === "client") {
    // Client reviewed the editor → award editor for 5-star
    onFiveStarReview(revieweeId, rating).catch(() => {});
    // Client gets XP for leaving review
    onClientReviewLeft(userId, orderId).catch(() => {});
  }

  // Notify reviewee (fire-and-forget)
  const [[revieweeUser], [pkg]] = await Promise.all([
    db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, revieweeId)).limit(1),
    db.select({ title: packages.title }).from(packages).innerJoin(orders, eq(orders.packageId, packages.id)).where(eq(orders.id, orderId)).limit(1),
  ]);

  if (revieweeUser && pkg) {
    notifyReviewReceived({
      recipientEmail: revieweeUser.email,
      recipientName: revieweeUser.name ?? "",
      reviewerName: session.user.name ?? "",
      packageTitle: pkg.title,
      rating,
      reviewText: text,
      reviewId: review.id,
    });

    // In-app notification — only applies when the reviewee is the editor (clients have no preference row)
    if (reviewRole === "client" && (await editorWantsNotif(order.editorId, "review"))) {
      createInAppNotification({
        userId: revieweeId,
        type: "review_received",
        title: `New ${rating}-star review`,
        body: `${session.user.name ?? "A client"} left you a ${rating}-star review${text ? `: "${text.slice(0, 80)}"` : "."}`,
        link: `/editor/orders/${orderId}`,
      });
    }
  }

  return NextResponse.json(review, { status: 201 });
}

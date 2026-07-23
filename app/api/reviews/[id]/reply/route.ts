import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reviews } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const replySchema = z.object({
  replyText: z.string().min(1).max(500),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const parsed = replySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [review] = await db
    .select({ id: reviews.id, revieweeId: reviews.revieweeId, replyText: reviews.replyText })
    .from(reviews)
    .where(eq(reviews.id, id))
    .limit(1);

  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });
  if (review.revieweeId !== session.user.userId) {
    return NextResponse.json({ error: "Only the reviewee can reply" }, { status: 403 });
  }
  if (review.replyText) {
    return NextResponse.json({ error: "Reply already submitted" }, { status: 409 });
  }

  const [updated] = await db
    .update(reviews)
    .set({ replyText: parsed.data.replyText, updatedAt: new Date() })
    .where(eq(reviews.id, id))
    .returning();

  return NextResponse.json(updated);
}

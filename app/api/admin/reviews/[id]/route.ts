import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reviews } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logAction } from "@/lib/audit";
import type { UserRole } from "@/types";

const ALLOWED: UserRole[] = ["admin"];

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const [review] = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  await db.delete(reviews).where(eq(reviews.id, id));

  logAction({
    actorId: session.user.userId!,
    actorRole: session.user.role as UserRole,
    action: "review.delete",
    entityType: "review",
    entityId: id,
    metadata: { revieweeId: review.revieweeId, reviewerId: review.reviewerId, rating: review.rating },
  });

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { portfolioItems, portfolioViews } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// POST /api/portfolio/view  { portfolioItemId }
// Logged-in users: deduplicated per user in DB (#2)
// Anonymous: client uses localStorage to avoid repeat calls (#2)
export async function POST(req: NextRequest) {
  const { portfolioItemId } = await req.json();
  if (!portfolioItemId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const session = await auth();
  const userId = session?.user?.userId ?? null;

  if (userId) {
    // Try to insert a view row — conflict = already viewed, skip counter
    const inserted = await db
      .insert(portfolioViews)
      .values({ portfolioItemId, userId })
      .onConflictDoNothing()
      .returning();

    if (inserted.length === 0) {
      // Already viewed — don't increment
      return NextResponse.json({ counted: false });
    }
  }

  await db
    .update(portfolioItems)
    .set({ viewsCount: sql`${portfolioItems.viewsCount} + 1` })
    .where(eq(portfolioItems.id, portfolioItemId));

  return NextResponse.json({ counted: true });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { portfolioSaves } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

// POST /api/portfolio/save  { portfolioItemId }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { portfolioItemId } = await req.json();
  if (!portfolioItemId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db.insert(portfolioSaves)
    .values({ portfolioItemId, userId: session.user.userId })
    .onConflictDoNothing();

  return NextResponse.json({ saved: true });
}

// DELETE /api/portfolio/save  { portfolioItemId }
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { portfolioItemId } = await req.json();
  if (!portfolioItemId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db.delete(portfolioSaves).where(
    and(
      eq(portfolioSaves.portfolioItemId, portfolioItemId),
      eq(portfolioSaves.userId, session.user.userId)
    )
  );

  return NextResponse.json({ saved: false });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

// POST /api/blog/[id]/view — increment view count by slug, return new total
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: slug } = await params;

    const [updated] = await db
      .update(blogPosts)
      .set({ views: sql`${blogPosts.views} + 1` })
      .where(eq(blogPosts.slug, slug))
      .returning({ views: blogPosts.views });

    return NextResponse.json({ views: updated?.views ?? 0 });
  } catch {
    return NextResponse.json({ views: 0 });
  }
}

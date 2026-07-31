import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { helpArticles } from "@/lib/db/schema";
import { ilike, or, and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? "";

    if (!query.trim()) {
      return NextResponse.json({ articles: [] });
    }

    // Search query in title, excerpt, and content
    const results = await db
      .select({
        id: helpArticles.id,
        title: helpArticles.title,
        slug: helpArticles.slug,
        excerpt: helpArticles.excerpt,
        readTime: helpArticles.readTime,
      })
      .from(helpArticles)
      .where(
        and(
          eq(helpArticles.isPublished, true),
          or(
            ilike(helpArticles.title, `%${query}%`),
            ilike(helpArticles.excerpt, `%${query}%`),
            ilike(helpArticles.content, `%${query}%`)
          )
        )
      )
      .limit(10);

    return NextResponse.json({ articles: results });
  } catch (error: any) {
    console.error("Error searching help articles:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

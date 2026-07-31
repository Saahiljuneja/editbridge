import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { helpArticles } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { articleId, vote } = body; // vote is "helpful" or "unhelpful"

    if (!articleId || !["helpful", "unhelpful"].includes(vote)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    if (vote === "helpful") {
      await db
        .update(helpArticles)
        .set({ helpfulVotes: sql`${helpArticles.helpfulVotes} + 1` })
        .where(eq(helpArticles.id, articleId));
    } else {
      await db
        .update(helpArticles)
        .set({ unhelpfulVotes: sql`${helpArticles.unhelpfulVotes} + 1` })
        .where(eq(helpArticles.id, articleId));
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error submitting help article vote:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

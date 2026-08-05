import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

// GET /api/blog/[id]/react — retrieve reaction counts by slug
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: slug } = await params;
    const post = await db
      .select({
        love: blogPosts.loveReactions,
        fire: blogPosts.fireReactions,
        clap: blogPosts.clapReactions,
      })
      .from(blogPosts)
      .where(eq(blogPosts.slug, slug))
      .limit(1)
      .then((r) => r[0]);

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json(post);
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/blog/[id]/react — increment/decrement a reaction count by slug
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: slug } = await params;
    const body = await req.json();
    const { reaction, action } = body; // reaction: 'love' | 'fire' | 'clap', action: 'add' | 'remove'
    
    if (!["love", "fire", "clap"].includes(reaction)) {
      return NextResponse.json({ error: "Invalid reaction key" }, { status: 400 });
    }
    if (!["add", "remove"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const amount = action === "add" ? 1 : -1;
    const column = reaction === "love" 
      ? blogPosts.loveReactions 
      : reaction === "fire" 
        ? blogPosts.fireReactions 
        : blogPosts.clapReactions;

    const key = reaction === "love" ? "loveReactions" : reaction === "fire" ? "fireReactions" : "clapReactions";

    const [updated] = await db
      .update(blogPosts)
      .set({ 
        [key]: sql`GREATEST(0, ${column} + ${amount})`
      })
      .where(eq(blogPosts.slug, slug))
      .returning({
        love: blogPosts.loveReactions,
        fire: blogPosts.fireReactions,
        clap: blogPosts.clapReactions,
      });

    if (!updated) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

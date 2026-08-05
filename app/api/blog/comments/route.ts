import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blogComments, blogPosts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const createCommentSchema = z.object({
  postId: z.string().uuid(),
  authorName: z.string().min(1).max(100),
  authorEmail: z.string().email(),
  content: z.string().min(1).max(1000),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createCommentSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { postId, authorName, authorEmail, content } = parsed.data;

    // Check if post exists
    const post = await db.select().from(blogPosts).where(eq(blogPosts.id, postId)).limit(1).then((r) => r[0]);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const [comment] = await db
      .insert(blogComments)
      .values({
        postId,
        authorName,
        authorEmail,
        content,
        status: "pending",
      })
      .returning();

    return NextResponse.json({ comment }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

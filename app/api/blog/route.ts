import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers and hyphens only"),
  excerpt: z.string().min(1).max(500),
  content: z.string().min(1),
  category: z.string().min(1).max(100),
  readTime: z.string().min(1).max(30),
  status: z.enum(["draft", "published", "in-review"]),
  thumbnailUrl: z.string().optional().nullable(),
  publishedAt: z.string().datetime().optional().nullable(),
  ogImageUrl: z.string().optional().nullable(),
  twitterCardType: z.string().max(50).optional().nullable(),
  canonicalUrl: z.string().optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session || !["admin", "staff_moderation"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const posts = await db
    .select()
    .from(blogPosts)
    .orderBy(desc(blogPosts.createdAt));

  return NextResponse.json({ posts });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !["admin", "staff_moderation"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { title, slug, excerpt, content, category, readTime, status, thumbnailUrl, publishedAt, ogImageUrl, twitterCardType, canonicalUrl } = parsed.data;

  const [post] = await db
    .insert(blogPosts)
    .values({
      title,
      slug,
      excerpt,
      content,
      category,
      readTime,
      status,
      thumbnailUrl,
      ogImageUrl: ogImageUrl ?? null,
      twitterCardType: twitterCardType ?? "summary_large_image",
      canonicalUrl: canonicalUrl ?? null,
      authorId: session.user.userId!,
      publishedAt: publishedAt ? new Date(publishedAt) : (status === "published" ? new Date() : null),
    })
    .returning();

  return NextResponse.json({ post }, { status: 201 });
}

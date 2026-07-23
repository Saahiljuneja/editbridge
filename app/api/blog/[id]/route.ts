import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/).optional(),
  excerpt: z.string().min(1).max(500).optional(),
  content: z.string().min(1).optional(),
  category: z.string().min(1).max(100).optional(),
  readTime: z.string().min(1).max(30).optional(),
  status: z.enum(["draft", "published"]).optional(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session || !["admin", "staff_moderation"].includes(session.user.role ?? "")) return null;
  return session;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const post = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1).then((r) => r[0]);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ post });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const existing = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1).then((r) => r[0]);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updates: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
  if (parsed.data.status === "published" && existing.status === "draft") {
    updates.publishedAt = new Date();
  }

  const [post] = await db.update(blogPosts).set(updates).where(eq(blogPosts.id, id)).returning();
  return NextResponse.json({ post });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await db.delete(blogPosts).where(eq(blogPosts.id, id));
  return NextResponse.json({ ok: true });
}

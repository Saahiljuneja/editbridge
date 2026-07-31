import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { helpArticles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !["admin", "staff_support"].includes(session.user?.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { title, slug, excerpt, content, readTime, isPublished, categoryId } = body;

    if (!title || !slug || !content || !categoryId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await db
      .update(helpArticles)
      .set({
        title,
        slug,
        excerpt: excerpt || null,
        content,
        readTime: readTime || "3 min read",
        isPublished: isPublished ?? false,
        categoryId,
        updatedAt: new Date(),
      })
      .where(eq(helpArticles.id, id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === "23505") {
      return NextResponse.json({ error: "Slug already exists. Please use a unique slug." }, { status: 409 });
    }
    console.error("Error updating help article:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !["admin"].includes(session.user?.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await db.delete(helpArticles).where(eq(helpArticles.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting help article:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

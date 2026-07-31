import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { helpArticles } from "@/lib/db/schema";

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !["admin", "staff_support"].includes(session.user?.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { title, slug, excerpt, content, readTime, isPublished, categoryId } = body;

    if (!title || !slug || !content || !categoryId) {
      return NextResponse.json({ error: "Missing required fields: title, slug, content, categoryId" }, { status: 400 });
    }

    const [newArticle] = await db
      .insert(helpArticles)
      .values({
        title,
        slug,
        excerpt: excerpt || null,
        content,
        readTime: readTime || "3 min read",
        isPublished: isPublished ?? false,
        categoryId,
      })
      .returning({ id: helpArticles.id, slug: helpArticles.slug });

    return NextResponse.json({ article: newArticle });
  } catch (error: any) {
    if (error?.code === "23505") {
      return NextResponse.json({ error: "Slug already exists. Please use a unique slug." }, { status: 409 });
    }
    console.error("Error creating help article:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

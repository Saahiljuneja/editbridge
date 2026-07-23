export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { BlogEditor } from "../../blog-editor";

export const metadata = { title: "Edit post — EditBridge Admin" };

export default async function EditBlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session || !["admin", "staff_moderation"].includes(session.user.role ?? "")) {
    redirect("/admin/dashboard");
  }

  const { id } = await params;
  const post = await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.id, id))
    .limit(1)
    .then((r) => r[0]);

  if (!post) notFound();

  return (
    <BlogEditor
      post={{
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        category: post.category,
        readTime: post.readTime,
        status: post.status,
      }}
    />
  );
}

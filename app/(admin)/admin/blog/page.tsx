export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { blogPosts, blogSubscribers, blogComments } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { AdminBlogClient } from "./admin-blog-client";

export default async function AdminBlogPage() {
  const session = await auth();
  if (!session || !["admin", "staff_moderation"].includes(session.user.role ?? "")) {
    redirect("/admin/dashboard");
  }

  const posts = await db
    .select()
    .from(blogPosts)
    .orderBy(desc(blogPosts.createdAt));

  const subscribers = await db
    .select()
    .from(blogSubscribers)
    .orderBy(desc(blogSubscribers.createdAt));

  const comments = await db
    .select({
      id: blogComments.id,
      postId: blogComments.postId,
      postTitle: blogPosts.title,
      authorName: blogComments.authorName,
      authorEmail: blogComments.authorEmail,
      content: blogComments.content,
      status: blogComments.status,
      adminReply: blogComments.adminReply,
      isPinned: blogComments.isPinned,
      createdAt: blogComments.createdAt,
    })
    .from(blogComments)
    .innerJoin(blogPosts, eq(blogPosts.id, blogComments.postId))
    .orderBy(desc(blogComments.createdAt));

  return <AdminBlogClient posts={posts} subscribers={subscribers} comments={comments} />;
}

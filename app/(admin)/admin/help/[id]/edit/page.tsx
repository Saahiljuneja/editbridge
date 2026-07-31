export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { helpArticles, helpCategories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ArticleEditor } from "../../article-editor";

export default async function AdminHelpEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session || !["admin", "staff_support"].includes(session.user?.role ?? "")) {
    redirect("/admin/dashboard");
  }

  const { id } = await params;

  const [article] = await db
    .select()
    .from(helpArticles)
    .where(eq(helpArticles.id, id))
    .limit(1);

  if (!article) notFound();

  const categories = await db
    .select({ id: helpCategories.id, name: helpCategories.name })
    .from(helpCategories)
    .orderBy(helpCategories.sortOrder);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="px-8 py-6">
          <Link href="/admin/help" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-3">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Help Center
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Edit Article</h1>
          <p className="text-sm text-gray-400 mt-0.5 font-mono">{article.slug}</p>
        </div>
      </div>
      <div className="px-8 py-6 max-w-4xl">
        <ArticleEditor
          categories={categories}
          mode="edit"
          initialData={{
            id: article.id,
            title: article.title,
            slug: article.slug,
            excerpt: article.excerpt ?? "",
            content: article.content,
            readTime: article.readTime ?? "3 min read",
            isPublished: article.isPublished ?? false,
            categoryId: article.categoryId ?? "",
          }}
        />
      </div>
    </div>
  );
}

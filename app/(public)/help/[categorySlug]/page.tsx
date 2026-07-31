import { db } from "@/lib/db";
import { helpCategories, helpArticles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  IndianRupee, ShoppingBag, AlertTriangle, UserCheck,
  Shield, HelpCircle, ArrowLeft, Clock, ArrowRight,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  IndianRupee, ShoppingBag, AlertTriangle, UserCheck, Shield, HelpCircle,
};

export const dynamic = "force-dynamic";

export default async function HelpCategoryPage({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}) {
  const { categorySlug } = await params;

  const [category] = await db
    .select()
    .from(helpCategories)
    .where(eq(helpCategories.slug, categorySlug))
    .limit(1);

  if (!category) notFound();

  const articles = await db
    .select({
      id: helpArticles.id,
      title: helpArticles.title,
      slug: helpArticles.slug,
      excerpt: helpArticles.excerpt,
      readTime: helpArticles.readTime,
      viewCount: helpArticles.viewCount,
    })
    .from(helpArticles)
    .where(eq(helpArticles.categoryId, category.id))
    .orderBy(helpArticles.createdAt);

  const IconComponent = category.icon ? (ICON_MAP[category.icon] ?? HelpCircle) : HelpCircle;

  return (
    <div className="min-h-screen bg-[#FAF9FC]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Link
            href="/help"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Help Center
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#0EA5E9]/10 flex items-center justify-center shrink-0">
              <IconComponent className="w-6 h-6 text-[#0EA5E9]" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">{category.name}</h1>
              <p className="text-sm text-gray-400 mt-0.5">{category.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Articles List */}
      <main className="max-w-4xl mx-auto px-6 py-10">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
          {articles.length} article{articles.length !== 1 ? "s" : ""} in this category
        </p>

        {articles.length === 0 ? (
          <div className="rounded-2xl bg-white border border-gray-100 py-16 text-center">
            <HelpCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-semibold">No articles in this category yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/help/article/${article.slug}`}
                className="flex items-center justify-between gap-4 bg-white border border-gray-100 rounded-2xl px-6 py-5 hover:border-[#0EA5E9]/30 hover:shadow-md transition-all group"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 text-base group-hover:text-[#0EA5E9] transition-colors mb-1">
                    {article.title}
                  </p>
                  {article.excerpt && (
                    <p className="text-sm text-gray-400 line-clamp-1">{article.excerpt}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                      <Clock className="w-3 h-3" /> {article.readTime}
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#0EA5E9] shrink-0 transition-colors" />
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

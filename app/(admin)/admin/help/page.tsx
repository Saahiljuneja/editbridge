export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { helpArticles, helpCategories } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { Plus, Edit, Eye, BookOpen, CheckCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function AdminHelpPage() {
  const session = await auth();
  if (!session || !["admin", "staff_support"].includes(session.user?.role ?? "")) {
    redirect("/admin/dashboard");
  }

  const [categories, articles] = await Promise.all([
    db.select().from(helpCategories).orderBy(helpCategories.sortOrder),
    db
      .select({
        id: helpArticles.id,
        title: helpArticles.title,
        slug: helpArticles.slug,
        isPublished: helpArticles.isPublished,
        viewCount: helpArticles.viewCount,
        helpfulVotes: helpArticles.helpfulVotes,
        readTime: helpArticles.readTime,
        categoryName: helpCategories.name,
        categorySlug: helpCategories.slug,
        updatedAt: helpArticles.updatedAt,
      })
      .from(helpArticles)
      .innerJoin(helpCategories, eq(helpCategories.id, helpArticles.categoryId))
      .orderBy(desc(helpArticles.updatedAt)),
  ]);

  const publishedCount = articles.filter(a => a.isPublished).length;
  const totalViews = articles.reduce((s, a) => s + (a.viewCount ?? 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Help Center Management</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {articles.length} articles · {publishedCount} published · {totalViews} total views
            </p>
          </div>
          <Link
            href="/admin/help/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#1e40af] hover:bg-brand-primary transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Article
          </Link>
        </div>
      </div>

      <div className="px-8 py-6 space-y-5">
        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Articles", value: articles.length, icon: BookOpen, color: "text-brand-primary", bg: "bg-blue-50" },
            { label: "Published", value: publishedCount, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Categories", value: categories.length, icon: BookOpen, color: "text-violet-600", bg: "bg-violet-50" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", bg)}>
                <Icon className={cn("w-5 h-5", color)} />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Articles list grouped by category */}
        {categories.map(cat => {
          const catArticles = articles.filter(a => a.categorySlug === cat.slug);
          if (catArticles.length === 0) return null;
          return (
            <div key={cat.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
                <p className="font-semibold text-gray-900 text-sm">{cat.name}</p>
                <span className="text-[11px] text-gray-400">{catArticles.length} articles</span>
              </div>
              <div className="divide-y divide-gray-50">
                {catArticles.map(art => (
                  <div key={art.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{art.title}</p>
                      <p className="text-xs text-gray-400 font-mono truncate">/help/article/{art.slug}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {art.isPublished ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                          <CheckCircle className="w-3 h-3" /> Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                          <Circle className="w-3 h-3" /> Draft
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Eye className="w-3.5 h-3.5" /> {art.viewCount ?? 0}
                      </span>
                      <Link
                        href={`/admin/help/${art.id}/edit`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-100 transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </Link>
                      <Link
                        href={`/help/article/${art.slug}`}
                        target="_blank"
                        className="text-xs text-[#1e40af] hover:underline font-medium"
                      >
                        Preview
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

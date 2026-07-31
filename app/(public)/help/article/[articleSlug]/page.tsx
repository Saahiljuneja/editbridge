import { db } from "@/lib/db";
import { helpArticles, helpCategories } from "@/lib/db/schema";
import { eq, ne, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Eye, BookOpen, ArrowRight } from "lucide-react";
import { VoteWidget } from "./vote-widget";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** Very lightweight markdown → HTML renderer (no external libs needed) */
function renderMarkdown(md: string): string {
  return md
    // H2 headings
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-gray-900 mt-8 mb-3 tracking-tight">$1</h2>')
    // H3 headings
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold text-gray-800 mt-5 mb-2">$1</h3>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em class="italic text-gray-700">$1</em>')
    // Unordered list items (lines starting with *)
    .replace(/^\* (.+)$/gm, '<li class="text-gray-600 text-sm leading-relaxed mb-1">$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/(<li[\s\S]*?<\/li>\n?)+/g, '<ul class="list-disc list-inside space-y-1 my-3 pl-2">$&</ul>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="my-6 border-gray-100" />')
    // Paragraphs (non-empty lines not matching other patterns)
    .replace(/^(?!<[hul]|<hr|<li)(.+)$/gm, '<p class="text-gray-600 text-sm leading-relaxed mb-3">$1</p>')
    // Clean up extra blank lines
    .replace(/\n{3,}/g, '\n\n');
}

export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ articleSlug: string }>;
}) {
  const { articleSlug } = await params;

  // Fetch article + its category in one join
  const [row] = await db
    .select({
      id: helpArticles.id,
      title: helpArticles.title,
      slug: helpArticles.slug,
      content: helpArticles.content,
      excerpt: helpArticles.excerpt,
      readTime: helpArticles.readTime,
      viewCount: helpArticles.viewCount,
      helpfulVotes: helpArticles.helpfulVotes,
      categoryId: helpArticles.categoryId,
      categoryName: helpCategories.name,
      categorySlug: helpCategories.slug,
      isPublished: helpArticles.isPublished,
    })
    .from(helpArticles)
    .innerJoin(helpCategories, eq(helpCategories.id, helpArticles.categoryId))
    .where(and(eq(helpArticles.slug, articleSlug), eq(helpArticles.isPublished, true)))
    .limit(1);

  if (!row) notFound();

  // Increment view count (fire and forget — best effort)
  db.update(helpArticles)
    .set({ viewCount: sql`${helpArticles.viewCount} + 1` })
    .where(eq(helpArticles.id, row.id))
    .catch(() => {});

  // Fetch related articles from same category
  const relatedArticles = await db
    .select({
      id: helpArticles.id,
      title: helpArticles.title,
      slug: helpArticles.slug,
    })
    .from(helpArticles)
    .where(
      and(
        eq(helpArticles.categoryId, row.categoryId!),
        ne(helpArticles.id, row.id),
        eq(helpArticles.isPublished, true)
      )
    )
    .limit(5);

  const htmlContent = renderMarkdown(row.content);

  return (
    <div className="min-h-screen bg-[#FAF9FC]">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-5">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-xs text-gray-400 font-medium mb-3">
            <Link href="/help" className="hover:text-gray-700 transition-colors">Help Center</Link>
            <span>›</span>
            <Link href={`/help/${row.categorySlug}`} className="hover:text-gray-700 transition-colors">
              {row.categoryName}
            </Link>
            <span>›</span>
            <span className="text-gray-600 truncate max-w-xs">{row.title}</span>
          </nav>
          <Link
            href={`/help/${row.categorySlug}`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to {row.categoryName}
          </Link>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-10 grid lg:grid-cols-3 gap-10">
        {/* Article content (2 cols) */}
        <article className="lg:col-span-2">
          {/* Header */}
          <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm mb-6">
            <div className="flex items-center gap-3 mb-5">
              <Link
                href={`/help/${row.categorySlug}`}
                className="text-[11px] font-bold uppercase tracking-widest text-[#0EA5E9] bg-[#0EA5E9]/8 border border-[#0EA5E9]/20 px-3 py-1.5 rounded-full hover:bg-[#0EA5E9]/15 transition-colors"
              >
                {row.categoryName}
              </Link>
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-tight mb-3">
              {row.title}
            </h1>
            {row.excerpt && (
              <p className="text-gray-500 text-sm leading-relaxed mb-4">{row.excerpt}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {row.readTime}</span>
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {(row.viewCount ?? 0) + 1} views</span>
            </div>
          </div>

          {/* Body */}
          <div
            className="bg-white border border-gray-100 rounded-2xl px-8 py-7 shadow-sm prose-sm text-gray-600 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />

          {/* Vote Widget */}
          <div className="bg-white border border-gray-100 rounded-2xl px-8 py-6 shadow-sm mt-5 flex items-center justify-between flex-wrap gap-4">
            <VoteWidget articleId={row.id} />
            <Link
              href="/contact"
              className="text-xs text-gray-400 hover:text-[#0EA5E9] transition-colors underline"
            >
              Still confused? Contact support →
            </Link>
          </div>
        </article>

        {/* Related articles sidebar */}
        <aside className="space-y-5">
          {relatedArticles.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4">
                <BookOpen className="w-4 h-4 text-[#0EA5E9]" /> Related Articles
              </h3>
              <div className="space-y-3">
                {relatedArticles.map((rel) => (
                  <Link
                    key={rel.id}
                    href={`/help/article/${rel.slug}`}
                    className="flex items-start gap-2 text-sm text-gray-600 hover:text-[#0EA5E9] transition-colors group"
                  >
                    <ArrowRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-300 group-hover:text-[#0EA5E9] transition-colors" />
                    <span className="leading-snug">{rel.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Browse all categories */}
          <div className="bg-gradient-to-br from-[#0EA5E9] to-sky-600 text-white rounded-2xl p-6 shadow-sm">
            <p className="font-bold text-sm mb-1">Browse all policies</p>
            <p className="text-xs text-sky-100 mb-4 leading-relaxed">
              View our complete policy directory organized by topic.
            </p>
            <Link
              href="/help"
              className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              Help Center Home <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </aside>
      </main>
    </div>
  );
}

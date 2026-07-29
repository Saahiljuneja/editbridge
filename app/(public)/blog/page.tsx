import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, Tag, ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { unstable_cache } from "next/cache";

export const metadata: Metadata = {
  title: "Blog — EditBridge | Video Editing Tips & Guides",
  description:
    "Guides and tips on hiring video editors in India, YouTube growth, Reels editing, and creator workflows.",
};

const CATEGORY_COLORS: Record<string, string> = {
  "Hiring guide":     "bg-purple-50 text-purple-700",
  "Pricing":          "bg-blue-50 text-blue-700",
  "YouTube":          "bg-red-50 text-red-700",
  "Reels & Shorts":   "bg-pink-50 text-pink-700",
  "Client guide":     "bg-green-50 text-green-700",
  "Thumbnails":       "bg-amber-50 text-amber-700",
  "Podcast":          "bg-indigo-50 text-indigo-700",
  "Creator workflow": "bg-teal-50 text-teal-700",
  "Platform news":    "bg-[var(--brand-client)]/10 text-[var(--brand-client)]",
  "General":          "bg-gray-100 text-gray-600",
};

const PER_PAGE = 10;

function formatDate(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

const getCachedBlogPosts = unstable_cache(
  async (page: number) => {
    const offset = (page - 1) * PER_PAGE;
    const [totalResult, posts] = await Promise.all([
      db.select({ count: count() }).from(blogPosts).where(eq(blogPosts.status, "published")),
      db
        .select()
        .from(blogPosts)
        .where(eq(blogPosts.status, "published"))
        .orderBy(desc(blogPosts.publishedAt))
        .limit(PER_PAGE)
        .offset(offset),
    ]);

    const serializedPosts = posts.map((p) => ({
      ...p,
      publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    return {
      total: totalResult[0]?.count ?? 0,
      posts: serializedPosts,
    };
  },
  ["blog-posts-list"],
  { revalidate: 600, tags: ["blog-posts-list"] }
);

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const { total, posts: postsRaw } = await getCachedBlogPosts(page);

  const posts = postsRaw.map((p) => ({
    ...p,
    publishedAt: p.publishedAt ? new Date(p.publishedAt) : null,
    createdAt: new Date(p.createdAt),
    updatedAt: new Date(p.updatedAt),
  }));

  const totalPages = Math.ceil(total / PER_PAGE);

  // On page 1, first 2 posts are featured; the rest go into the list
  const featured = page === 1 ? posts.slice(0, 2) : [];
  const list = page === 1 ? posts.slice(2) : posts;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-[#07050f] pt-20 pb-14 px-4">
        <div className="px-8 py-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/8 border border-white/10 text-white/50 text-xs font-medium mb-6">
            <Tag className="w-3.5 h-3.5" />
            EditBridge Blog
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight tracking-tight">
            Guides for creators &<br />
            <span className="text-[#8B7FE8]">the editors who help them</span>
          </h1>
          <p className="text-white/50 text-base max-w-xl leading-relaxed">
            Hiring guides, editing tips, pricing breakdowns, and creator workflows.
          </p>
        </div>
      </section>

      <div className="px-8 py-6">
        {total === 0 ? (
          <div className="text-center py-20 text-gray-300">
            <p className="text-sm">No posts yet. Check back soon.</p>
          </div>
        ) : (
          <>
            {/* Featured posts — page 1 only */}
            {featured.length > 0 && (
              <section className="mb-14">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5">Featured</p>
                <div className="grid md:grid-cols-2 gap-5">
                  {featured.map((post) => (
                    <Link
                      key={post.id}
                      href={`/blog/${post.slug}`}
                      className="group block bg-[#07050f] rounded-2xl p-6 hover:ring-2 hover:ring-[var(--brand-client)]/50 transition-all"
                    >
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold mb-4 ${CATEGORY_COLORS[post.category] ?? "bg-gray-100 text-gray-600"}`}>
                        {post.category}
                      </span>
                      <h2 className="text-lg font-bold text-white mb-3 leading-snug group-hover:text-[#8B7FE8] transition-colors">
                        {post.title}
                      </h2>
                      <p className="text-white/40 text-sm leading-relaxed mb-5">{post.excerpt}</p>
                      <div className="flex items-center justify-between text-xs text-white/25">
                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{post.readTime}</span>
                        <span>{post.publishedAt ? formatDate(post.publishedAt) : ""}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Post list */}
            {list.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-5">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    {page === 1 ? "All posts" : `Page ${page} of ${totalPages}`}
                  </p>
                  <p className="text-xs text-gray-300">{total} posts total</p>
                </div>
                <div className="space-y-4">
                  {list.map((post) => (
                    <Link
                      key={post.id}
                      href={`/blog/${post.slug}`}
                      className="group flex flex-col sm:flex-row sm:items-start gap-4 p-5 rounded-2xl border border-gray-100 hover:border-[var(--brand-client)]/20 hover:bg-[var(--brand-client)]/2 transition-all"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${CATEGORY_COLORS[post.category] ?? "bg-gray-100 text-gray-600"}`}>
                            {post.category}
                          </span>
                          <span className="text-xs text-gray-300">{post.readTime}</span>
                        </div>
                        <h3 className="font-bold text-gray-900 text-base leading-snug mb-1.5 group-hover:text-[var(--brand-client)] transition-colors">
                          {post.title}
                        </h3>
                        <p className="text-sm text-gray-400 leading-relaxed line-clamp-2">{post.excerpt}</p>
                      </div>
                      <div className="flex sm:flex-col items-center sm:items-end gap-3 shrink-0">
                        <span className="text-xs text-gray-300">{post.publishedAt ? formatDate(post.publishedAt) : ""}</span>
                        <ArrowRight className="w-4 h-4 text-gray-200 group-hover:text-[var(--brand-client)] group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                {page > 1 ? (
                  <Link
                    href={`/blog?page=${page - 1}`}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-[var(--brand-client)]/40 hover:text-[var(--brand-client)] transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </Link>
                ) : (
                  <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-100 text-sm font-medium text-gray-300 cursor-not-allowed">
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </span>
                )}

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <Link
                      key={p}
                      href={`/blog?page=${p}`}
                      className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-semibold transition-colors ${
                        p === page
                          ? "bg-[var(--brand-client)] text-white"
                          : "text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      {p}
                    </Link>
                  ))}
                </div>

                {page < totalPages ? (
                  <Link
                    href={`/blog?page=${page + 1}`}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-[var(--brand-client)]/40 hover:text-[var(--brand-client)] transition-colors"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-100 text-sm font-medium text-gray-300 cursor-not-allowed">
                    Next <ChevronRight className="w-4 h-4" />
                  </span>
                )}
              </div>
            )}
          </>
        )}

        {/* CTA */}
        <section className="mt-14 rounded-2xl bg-[var(--brand-client)]/5 border border-[var(--brand-client)]/10 p-8 text-center">
          <p className="text-base font-bold text-gray-900 mb-2">Ready to hire a video editor?</p>
          <p className="text-sm text-gray-500 mb-6">Browse verified editors, compare packages, and place your first order in minutes.</p>
          <Link
            href="/browse"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white text-sm transition-opacity hover:opacity-90"
            style={{ background: "var(--brand-client)" }}
          >
            Browse editors <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </div>
    </div>
  );
}
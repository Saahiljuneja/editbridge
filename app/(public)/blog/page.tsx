import { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Tag } from "lucide-react";
import { db } from "@/lib/db";
import { blogPosts, users } from "@/lib/db/schema";
import { eq, desc, and, lte } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { BlogClient, type SerializedPost } from "./blog-client";

export const metadata: Metadata = {
  title: "Blog — EditBridge | Video Editing Tips & Guides",
  description:
    "Guides and tips on hiring video editors in India, YouTube growth, Reels editing, and creator workflows.",
};

// ── Category styling ──────────────────────────────────────────────────────────
const CATEGORY_META: Record<string, { pill: string; accent: string }> = {
  "Hiring guide":     { pill: "bg-purple-100 text-purple-700",  accent: "#7c3aed" },
  "Pricing":          { pill: "bg-blue-100 text-blue-700",      accent: "#1d4ed8" },
  "YouTube":          { pill: "bg-red-100 text-red-700",        accent: "#dc2626" },
  "Reels & Shorts":   { pill: "bg-pink-100 text-pink-700",      accent: "#db2777" },
  "Client guide":     { pill: "bg-green-100 text-green-700",    accent: "#16a34a" },
  "Thumbnails":       { pill: "bg-amber-100 text-amber-700",    accent: "#d97706" },
  "Podcast":          { pill: "bg-indigo-100 text-indigo-700",  accent: "#4338ca" },
  "Creator workflow": { pill: "bg-teal-100 text-teal-700",      accent: "#0d9488" },
  "Platform news":    { pill: "bg-violet-100 text-violet-700",  accent: "#7c3aed" },
  "General":          { pill: "bg-gray-100 text-gray-600",      accent: "#6b7280" },
};

function getMeta(cat: string) {
  return CATEGORY_META[cat] ?? CATEGORY_META["General"];
}

// ── Data fetching — all posts (up to 200), joined with author ─────────────────
const getCachedAllPosts = unstable_cache(
  async () => {
    const rows = await db
      .select({
        id: blogPosts.id,
        title: blogPosts.title,
        slug: blogPosts.slug,
        excerpt: blogPosts.excerpt,
        category: blogPosts.category,
        readTime: blogPosts.readTime,
        publishedAt: blogPosts.publishedAt,
        authorName: users.name,
        authorImage: users.image,
        thumbnailUrl: blogPosts.thumbnailUrl,
      })
      .from(blogPosts)
      .innerJoin(users, eq(users.id, blogPosts.authorId))
      .where(
        and(
          eq(blogPosts.status, "published"),
          lte(blogPosts.publishedAt, new Date())
        )
      )
      .orderBy(desc(blogPosts.publishedAt))
      .limit(200);

    return rows.map((p): SerializedPost => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt ?? "",
      category: p.category,
      readTime: p.readTime ?? "",
      publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
      authorName: p.authorName,
      authorImage: p.authorImage ?? null,
      accentColor: getMeta(p.category).accent,
      pillClass: getMeta(p.category).pill,
      thumbnailUrl: p.thumbnailUrl ?? null,
    }));
  },
  ["blog-posts-all"],
  { revalidate: 600, tags: ["blog-posts-list"] }
);

export default async function BlogPage() {
  const allPosts = await getCachedAllPosts();

  const featured = allPosts.slice(0, 2);

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="pt-20 pb-16 px-4 sm:px-8 border-b border-neutral-200/50 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-50 border border-neutral-200 text-neutral-550 text-xs font-bold mb-6">
            <Tag className="w-3.5 h-3.5 text-[#8B7FE8]" />
            EditBridge Blog
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-neutral-900 mb-4 leading-tight tracking-tight">
            Guides for creators &<br />
            <span className="text-[#7c6ff7]">the editors who help them</span>
          </h1>
          <p className="text-neutral-500 text-base max-w-xl leading-relaxed">
            Hiring guides, editing tips, pricing breakdowns, and creator workflows.
          </p>
        </div>
      </section>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="bg-slate-50/50 min-h-[60vh]">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10">
          {allPosts.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-4">
                <Tag className="w-8 h-8 text-purple-300" />
              </div>
              <p className="font-bold text-gray-700 mb-1">No posts yet</p>
              <p className="text-sm text-gray-400">Check back soon — guides are on the way.</p>
            </div>
          ) : (
            <Suspense fallback={
              <div className="h-96 flex items-center justify-center bg-white rounded-2xl border border-gray-100 shadow-sm">
                <span className="w-8 h-8 border-4 border-[#8B7FE8]/40 border-t-[#8B7FE8] rounded-full animate-spin" />
              </div>
            }>
              <BlogClient allPosts={allPosts} featured={featured} />
            </Suspense>
          )}

          {/* CTA */}
          <section className="mt-14 rounded-2xl bg-gradient-to-br from-[#1a1060] to-[#2d1b8e] p-8 text-center shadow-lg">
            <p className="text-base font-bold text-white mb-2">Ready to hire a video editor?</p>
            <p className="text-sm text-white/60 mb-6">
              Browse verified editors, compare packages, and place your first order in minutes.
            </p>
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-[#1a1060] text-sm bg-white hover:bg-gray-50 transition-colors"
            >
              Browse editors <ArrowRight className="w-4 h-4" />
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
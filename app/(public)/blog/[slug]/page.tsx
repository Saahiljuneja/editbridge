import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Calendar, Tag, ChevronRight, User } from "lucide-react";
import { db } from "@/lib/db";
import { blogPosts, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";

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

const getCachedBlogPost = (slug: string) =>
  unstable_cache(
    async () => {
      const [post] = await db
        .select({
          id: blogPosts.id,
          title: blogPosts.title,
          excerpt: blogPosts.excerpt,
          content: blogPosts.content,
          category: blogPosts.category,
          readTime: blogPosts.readTime,
          publishedAt: blogPosts.publishedAt,
          authorName: users.name,
        })
        .from(blogPosts)
        .innerJoin(users, eq(users.id, blogPosts.authorId))
        .where(eq(blogPosts.slug, slug))
        .limit(1);

      if (!post) return null;

      return {
        ...post,
        publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
      };
    },
    ["single-blog-post-slug", slug],
    { revalidate: 600, tags: ["single-blog-post-slug", `blog-post-${slug}`] }
  )();

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getCachedBlogPost(slug);
  if (!post) notFound();

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Blog Article Hero Header */}
      <section className="bg-[#07050f] pt-24 pb-16 px-6 text-left">
        <div className="max-w-3xl mx-auto space-y-6">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to blog
          </Link>

          <div className="space-y-4">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                CATEGORY_COLORS[post.category] ?? "bg-gray-100 text-gray-600"
              }`}
            >
              {post.category}
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight tracking-tight">
              {post.title}
            </h1>
            <p className="text-white/60 text-base md:text-lg leading-relaxed font-medium">
              {post.excerpt}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-white/40 pt-2 border-t border-white/10">
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4" /> By {post.authorName ?? "EditBridge Team"}
            </span>
            {post.publishedAt && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> {formatDate(post.publishedAt)}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> {post.readTime}
            </span>
          </div>
        </div>
      </section>

      {/* Article Content Container */}
      <main className="max-w-3xl mx-auto px-6 mt-10">
        <article className="bg-white border border-gray-100 rounded-2xl p-8 sm:p-10 shadow-sm">
          {/* Simple prose container to format the markdown body text */}
          <div className="text-gray-800 text-base leading-relaxed space-y-6 whitespace-pre-wrap">
            {post.content}
          </div>
        </article>

        {/* Call to Action card at bottom */}
        <section className="mt-10 rounded-2xl bg-[var(--brand-client)]/5 border border-[var(--brand-client)]/10 p-8 text-center">
          <p className="text-base font-bold text-gray-900 mb-2">Need professional video editing?</p>
          <p className="text-sm text-gray-500 mb-6">Hire KYC-verified video editors and thumbnail artists with secure escrow payments.</p>
          <Link
            href="/browse"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white text-sm hover:opacity-95 transition-opacity"
            style={{ background: "var(--brand-client)" }}
          >
            Browse verified editors <ChevronRight className="w-4 h-4" />
          </Link>
        </section>
      </main>
    </div>
  );
}
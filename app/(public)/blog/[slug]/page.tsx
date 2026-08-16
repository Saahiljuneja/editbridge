import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Calendar, Tag, ChevronRight, BookOpen } from "lucide-react";
import { db } from "@/lib/db";
import { blogPosts, users } from "@/lib/db/schema";
import { eq, and, ne, lte } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { MarkdownRenderer } from "../markdown-renderer";
import { ReadingProgressBar } from "./reading-progress";
import { SocialShare } from "./social-share";
import { TableOfContents } from "./toc";
import { extractToc } from "./toc-utils";
import { BackToTop } from "./back-to-top";
import { ViewCounter } from "./view-counter";
import { Reactions } from "./reactions";
import { TTSReader } from "./tts-reader";
import { ReadingThemeToggle } from "./reading-theme-toggle";
import { BookmarkButton } from "./bookmark-button";

// ── Category styling ──────────────────────────────────────────────────────────
const CATEGORY_META: Record<string, { pill: string; accent: string; heroBg: string }> = {
  "Hiring guide":     { pill: "bg-purple-100 text-purple-700",  accent: "#7c3aed", heroBg: "from-purple-50 via-slate-50/50 to-slate-50/50" },
  "Pricing":          { pill: "bg-blue-100 text-blue-700",      accent: "#1d4ed8", heroBg: "from-blue-50 via-slate-50/50 to-slate-50/50"   },
  "YouTube":          { pill: "bg-red-100 text-red-700",        accent: "#dc2626", heroBg: "from-red-50 via-slate-50/50 to-slate-50/50"    },
  "Reels & Shorts":   { pill: "bg-pink-100 text-pink-700",      accent: "#db2777", heroBg: "from-pink-50 via-slate-50/50 to-slate-50/50"   },
  "Client guide":     { pill: "bg-green-100 text-green-700",    accent: "#16a34a", heroBg: "from-green-50 via-slate-50/50 to-slate-50/50"  },
  "Thumbnails":       { pill: "bg-amber-100 text-amber-700",    accent: "#d97706", heroBg: "from-amber-50 via-slate-50/50 to-slate-50/50"  },
  "Podcast":          { pill: "bg-indigo-100 text-indigo-700",  accent: "#4338ca", heroBg: "from-indigo-50 via-slate-50/50 to-slate-50/50" },
  "Creator workflow": { pill: "bg-teal-100 text-teal-700",      accent: "#0d9488", heroBg: "from-teal-50 via-slate-50/50 to-slate-50/50"   },
  "Platform news":    { pill: "bg-violet-100 text-violet-700",  accent: "#7c3aed", heroBg: "from-violet-50 via-slate-50/50 to-slate-50/50" },
  "General":          { pill: "bg-gray-100 text-gray-600",      accent: "#6b7280", heroBg: "from-slate-50 via-slate-50/50 to-slate-50/50"   },
};

function getCategoryMeta(cat: string) {
  return CATEGORY_META[cat] ?? CATEGORY_META["General"];
}

function categorySlug(cat: string) {
  return cat.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ── Data fetching ─────────────────────────────────────────────────────────────
const getCachedBlogPost = (slug: string) =>
  unstable_cache(
    async () => {
      const [post] = await db
        .select({
          id: blogPosts.id,
          title: blogPosts.title,
          slug: blogPosts.slug,
          excerpt: blogPosts.excerpt,
          content: blogPosts.content,
          category: blogPosts.category,
          readTime: blogPosts.readTime,
          views: blogPosts.views,
          publishedAt: blogPosts.publishedAt,
          authorName: users.name,
          authorImage: users.image,
        })
        .from(blogPosts)
        .innerJoin(users, eq(users.id, blogPosts.authorId))
        .where(
          and(
            eq(blogPosts.slug, slug),
            eq(blogPosts.status, "published"),
            lte(blogPosts.publishedAt, new Date())
          )
        )
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

const getCachedRelatedPosts = (category: string, excludeSlug: string) =>
  unstable_cache(
    async () => {
      return db
        .select({
          id: blogPosts.id,
          title: blogPosts.title,
          slug: blogPosts.slug,
          category: blogPosts.category,
          readTime: blogPosts.readTime,
        })
        .from(blogPosts)
        .where(
          and(
            eq(blogPosts.status, "published"),
            eq(blogPosts.category, category),
            ne(blogPosts.slug, excludeSlug),
            lte(blogPosts.publishedAt, new Date())
          )
        )
        .limit(3);
    },
    ["related-posts", category, excludeSlug],
    { revalidate: 600 }
  )();

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function AuthorAvatar({
  src, name, size = "w-8 h-8", ring = "ring-2 ring-white/20",
}: {
  src: string | null; name: string | null; size?: string; ring?: string;
}) {
  const initials = (name ?? "E").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={name ?? "Author"} className={`${size} rounded-full object-cover ${ring}`} />
    );
  }
  return (
    <div className={`${size} rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xs font-bold text-white shrink-0`}>
      {initials}
    </div>
  );
}

// ── Sticky Author Sidebar Card ─────────────────────────────────────────────────
function AuthorCard({
  name, image, category, accent, catSlug,
}: {
  name: string | null; image: string | null; category: string; accent: string; catSlug: string;
}) {
  const initials = (name ?? "E").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#0d0030] to-[#1a0050] p-5 mt-4">
      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">Written by</p>
      <div className="flex items-center gap-3 mb-3">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={name ?? "Author"} className="w-12 h-12 rounded-full object-cover ring-2 ring-[#8B7FE8]/40" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-[#8B7FE8]/20 border border-[#8B7FE8]/30 flex items-center justify-center text-sm font-bold text-[#8B7FE8]">
            {initials}
          </div>
        )}
        <div>
          <p className="font-bold text-white text-sm">{name ?? "EditBridge Team"}</p>
          <p className="text-[10px] text-white/40">Contributor</p>
        </div>
      </div>
      <p className="text-xs text-white/40 leading-relaxed mb-4">
        Guides and resources to help creators and video editors work better together.
      </p>
      <Link
        href={`/blog/category/${catSlug}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white/70 hover:text-white transition-colors"
        style={{ background: `${accent}22`, borderColor: `${accent}33`, border: `1px solid ${accent}33` }}
      >
        More {category} posts
      </Link>
    </div>
  );
}

// ── Metadata ──────────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getCachedBlogPost(slug);
  if (!post) return {};
  return {
    title: `${post.title} — EditBridge Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      type: "article",
      publishedTime: post.publishedAt ?? undefined,
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getCachedBlogPost(slug);
  if (!post) notFound();

  const [related, toc] = await Promise.all([
    getCachedRelatedPosts(post.category, slug),
    Promise.resolve(extractToc(post.content)),
  ]);

  const meta = getCategoryMeta(post.category);
  const catSlug = categorySlug(post.category);

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Fixed UI chrome */}
      <ReadingProgressBar />
      <BackToTop />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className={`bg-gradient-to-b ${meta.heroBg} pt-20 pb-16 px-4 sm:px-8 border-b border-neutral-200/50`}>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-neutral-500 flex-wrap">
            <Link href="/blog" className="hover:text-neutral-900 transition-colors inline-flex items-center gap-1 font-medium">
              <ArrowLeft className="w-3 h-3" /> Blog
            </Link>
            <span>/</span>
            <Link
              href={`/blog/category/${catSlug}`}
              className="hover:text-neutral-900 transition-colors font-medium"
            >
              {post.category}
            </Link>
          </nav>

          <div className="space-y-4">
            <Link href={`/blog/category/${catSlug}`}>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${meta.pill} hover:opacity-80 transition-opacity`}>
                {post.category}
              </span>
            </Link>
            <h1 className="text-3xl sm:text-4xl font-black text-neutral-900 leading-tight tracking-tight">
              {post.title}
            </h1>
            <p className="text-neutral-550 text-base sm:text-lg leading-relaxed">
              {post.excerpt}
            </p>
          </div>

          {/* Meta row: author + date + read time + views */}
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-neutral-200/60">

            {post.publishedAt && (
              <span className="flex items-center gap-1.5 text-xs text-neutral-450">
                <Calendar className="w-3.5 h-3.5" /> {formatDate(post.publishedAt)}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-xs text-neutral-450">
              <BookOpen className="w-3.5 h-3.5" />
              <strong className="text-neutral-600 font-semibold">{post.readTime}</strong>
            </span>
            {/* Live view counter — fires API, counts once per session */}
            <ViewCounter slug={post.slug} initialViews={post.views ?? 0} />
          </div>

        </div>
      </section>

      {/* ── Article + sidebar layout ──────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="xl:grid xl:grid-cols-[1fr_236px] xl:gap-10 xl:items-start">

          {/* ── Left: Article ────────────────────────────────────────────── */}
          <div>
            {/* TOC — Mobile collapsible layout only */}
            <div className="xl:hidden">
              <TableOfContents items={toc} />
            </div>

            {/* Reading enhancements controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <TTSReader />
              <ReadingThemeToggle />
            </div>

            <article id="article-content" className="bg-white border border-gray-100 rounded-2xl px-6 sm:px-10 py-10 shadow-sm transition-all duration-300">
              <MarkdownRenderer content={post.content} />
            </article>

            {/* Reactions + bookmark + share bar */}
            <div className="mt-5 bg-white border border-gray-100 rounded-2xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <Reactions slug={post.slug} />
                <span className="w-px h-5 bg-gray-100 hidden sm:block" />
                <BookmarkButton slug={post.slug} />
              </div>
              <div className="flex items-center gap-3">
                <p className="text-xs text-gray-400 font-medium hidden sm:block">Share</p>
                <SocialShare title={post.title} slug={post.slug} />
              </div>
            </div>

            {/* Related posts */}
            {related.length > 0 && (
              <section className="mt-10">
                <div className="flex items-center gap-2 mb-5">
                  <Tag className="w-4 h-4 text-gray-400" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    More in {post.category}
                  </p>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  {related.map((rp) => {
                    const rm = getCategoryMeta(rp.category);
                    return (
                      <Link
                        key={rp.id}
                        href={`/blog/${rp.slug}`}
                        className="group bg-white border border-gray-100 rounded-xl p-4 hover:border-[#8B7FE8]/30 hover:shadow-md transition-all duration-200"
                      >
                        <div className="w-full h-1.5 rounded-full mb-3" style={{ background: rm.accent }} />
                        <p className="text-sm font-bold text-gray-900 group-hover:text-[#8B7FE8] transition-colors leading-snug mb-2 line-clamp-2">
                          {rp.title}
                        </p>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {rp.readTime}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* CTA */}
            <section className="mt-10 rounded-2xl bg-gradient-to-br from-[#1a1060] to-[#2d1b8e] p-8 text-center shadow-lg">
              <p className="text-base font-bold text-white mb-2">Need professional video editing?</p>
              <p className="text-sm text-white/60 mb-6">
                Hire KYC-verified video editors and thumbnail artists with secure escrow payments.
              </p>
              <Link
                href="/browse"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-[#1a1060] text-sm bg-white hover:bg-gray-50 transition-colors"
              >
                Browse verified editors <ChevronRight className="w-4 h-4" />
              </Link>
            </section>
          </div>

          {/* ── Right: Sticky desktop sidebar ────────────────────────────── */}
          <aside className="hidden xl:block sticky top-20">
            {/* TOC */}
            <TableOfContents items={toc} />

            {/* Sticky author card */}
            <AuthorCard
              name={post.authorName}
              image={post.authorImage ?? null}
              category={post.category}
              accent={meta.accent}
              catSlug={catSlug}
            />
          </aside>
        </div>
      </main>
    </div>
  );
}
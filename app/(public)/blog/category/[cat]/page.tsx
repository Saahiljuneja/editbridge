import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock, BookOpen, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { blogPosts, users } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";

// ── Category metadata ─────────────────────────────────────────────────────────
const CATEGORY_META: Record<string, { pill: string; accent: string; heroBg: string; description: string }> = {
  "Hiring guide":     { pill: "bg-purple-100 text-purple-700",  accent: "#7c3aed", heroBg: "from-purple-950", description: "How to find, vet, and hire the perfect video editor for your channel."   },
  "Pricing":          { pill: "bg-blue-100 text-blue-700",      accent: "#1d4ed8", heroBg: "from-blue-950",   description: "Understand video editing rates, packages, and what you should pay."        },
  "YouTube":          { pill: "bg-red-100 text-red-700",        accent: "#dc2626", heroBg: "from-red-950",    description: "Grow your YouTube channel with better editing, thumbnails, and strategy."  },
  "Reels & Shorts":   { pill: "bg-pink-100 text-pink-700",      accent: "#db2777", heroBg: "from-pink-950",   description: "Short-form video editing tips for Instagram Reels and YouTube Shorts."   },
  "Client guide":     { pill: "bg-green-100 text-green-700",    accent: "#16a34a", heroBg: "from-green-950",  description: "Guides for clients on working effectively with video editors."             },
  "Thumbnails":       { pill: "bg-amber-100 text-amber-700",    accent: "#d97706", heroBg: "from-amber-950",  description: "Design thumbnails that get clicks — tips, tools, and best practices."    },
  "Podcast":          { pill: "bg-indigo-100 text-indigo-700",  accent: "#4338ca", heroBg: "from-indigo-950", description: "Editing and production tips for podcast creators."                        },
  "Creator workflow": { pill: "bg-teal-100 text-teal-700",      accent: "#0d9488", heroBg: "from-teal-950",   description: "Streamline your content creation workflow from script to upload."        },
  "Platform news":    { pill: "bg-violet-100 text-violet-700",  accent: "#7c3aed", heroBg: "from-violet-950", description: "Latest news and updates from YouTube, Instagram, and other platforms."   },
  "General":          { pill: "bg-gray-100 text-gray-600",      accent: "#6b7280", heroBg: "from-gray-900",   description: "General guides and resources for content creators."                      },
};

function getCatMeta(cat: string) {
  return CATEGORY_META[cat] ?? { ...CATEGORY_META["General"], description: `All posts about ${cat}.` };
}

function slugToCategory(slug: string) {
  // "hiring-guide" → "Hiring guide", "reels-shorts" → "Reels & Shorts", etc.
  const map: Record<string, string> = {
    "hiring-guide":     "Hiring guide",
    "pricing":          "Pricing",
    "youtube":          "YouTube",
    "reels-shorts":     "Reels & Shorts",
    "client-guide":     "Client guide",
    "thumbnails":       "Thumbnails",
    "podcast":          "Podcast",
    "creator-workflow": "Creator workflow",
    "platform-news":    "Platform news",
    "general":          "General",
  };
  return map[slug] ?? slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function isNew(publishedAt: Date | null) {
  if (!publishedAt) return false;
  return Date.now() - publishedAt.getTime() < 7 * 24 * 60 * 60 * 1000;
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

const getCachedCategoryPosts = (category: string) =>
  unstable_cache(
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
        })
        .from(blogPosts)
        .innerJoin(users, eq(users.id, blogPosts.authorId))
        .where(and(eq(blogPosts.status, "published"), eq(blogPosts.category, category)))
        .orderBy(desc(blogPosts.publishedAt));

      return rows.map((p) => ({
        ...p,
        publishedAt: p.publishedAt ?? null,
      }));
    },
    ["category-posts", category],
    { revalidate: 600, tags: ["blog-posts-list"] }
  )();

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cat: string }>;
}): Promise<Metadata> {
  const { cat } = await params;
  const category = slugToCategory(cat);
  const meta = getCatMeta(category);
  return {
    title: `${category} — EditBridge Blog`,
    description: meta.description,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ cat: string }>;
}) {
  const { cat } = await params;
  const category = slugToCategory(cat);
  const meta = getCatMeta(category);

  const posts = await getCachedCategoryPosts(category);
  if (posts.length === 0) notFound();

  return (
    <div className="min-h-screen bg-[#07050f]">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className={`bg-gradient-to-b ${meta.heroBg} via-[#07050f] to-[#07050f] pt-20 pb-14 px-4 sm:px-8`}>
        <div className="max-w-5xl mx-auto">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Blog
          </Link>

          <div className="flex items-center gap-3 mb-4">
            <span
              className="w-3 h-3 rounded-full inline-block"
              style={{ background: meta.accent }}
            />
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${meta.pill}`}>
              {category}
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 leading-tight tracking-tight">
            {category}
          </h1>
          <p className="text-white/50 text-base max-w-xl leading-relaxed mb-4">
            {meta.description}
          </p>
          <p className="text-xs text-white/30">{posts.length} article{posts.length !== 1 ? "s" : ""}</p>
        </div>
      </section>

      {/* ── Gradient bridge ───────────────────────────────────────────────── */}
      <div className="h-16 bg-gradient-to-b from-[#07050f] to-[#f8f7ff]" />

      {/* ── Posts ─────────────────────────────────────────────────────────── */}
      <div className="bg-[#f8f7ff] min-h-[60vh]">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10">
          <div className="space-y-3">
            {posts.map((post) => {
              const fresh = isNew(post.publishedAt);
              return (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group flex items-start gap-4 p-5 rounded-2xl bg-white border border-gray-100 hover:border-[#8B7FE8]/30 hover:shadow-md transition-all duration-200"
                >
                  <div className="w-1 self-stretch rounded-full shrink-0" style={{ background: meta.accent }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      {fresh && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                          <Sparkles className="w-2.5 h-2.5" /> NEW
                        </span>
                      )}
                      <span className="text-xs text-gray-300 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> {post.readTime}
                      </span>
                    </div>
                    <h2 className="font-bold text-gray-900 text-base leading-snug mb-1 group-hover:text-[#8B7FE8] transition-colors">
                      {post.title}
                    </h2>
                    <p className="text-sm text-gray-400 leading-relaxed line-clamp-1">{post.excerpt}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      {post.authorImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={post.authorImage} alt={post.authorName ?? ""} className="w-5 h-5 rounded-full object-cover" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-[#8B7FE8]/20 flex items-center justify-center text-[8px] font-bold text-[#8B7FE8]">
                          {(post.authorName ?? "E")[0]}
                        </div>
                      )}
                      <span className="text-xs text-gray-300 whitespace-nowrap hidden sm:inline">
                        {post.publishedAt ? formatDate(post.publishedAt) : ""}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-200 group-hover:text-[#8B7FE8] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              );
            })}
          </div>

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

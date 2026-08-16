"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Search, X, ArrowRight, BookOpen, Sparkles, Mail, Send, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface SerializedPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  readTime: string;
  publishedAt: string | null;
  authorName: string | null;
  authorImage: string | null;
  accentColor: string;
  pillClass: string;
  thumbnailUrl: string | null;
}

interface BlogClientProps {
  allPosts: SerializedPost[];
  featured: SerializedPost[];
}

const PER_PAGE = 10;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function isNew(iso: string | null) {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < 7 * 24 * 60 * 60 * 1000;
}

function categorySlug(cat: string) {
  return cat.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ── Author Avatar ─────────────────────────────────────────────────────────────
const AVATAR_SIZE_MAP: Record<number, string> = {
  5: "w-5 h-5",
  6: "w-6 h-6",
  7: "w-7 h-7",
  10: "w-10 h-10",
};

function AuthorAvatar({ src, name, size = 6 }: { src: string | null; name: string | null; size?: number }) {
  const initials = (name ?? "E").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const sizeClass = AVATAR_SIZE_MAP[size] || "w-6 h-6";
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name ?? "Author"}
        width={size * 4}
        height={size * 4}
        className={`${sizeClass} rounded-full object-cover ring-1 ring-white/20 shrink-0`}
      />
    );
  }
  return (
    <div className={`${sizeClass} rounded-full bg-[#8B7FE8]/20 flex items-center justify-center text-[10px] font-bold text-[#8B7FE8] shrink-0`}>
      {initials}
    </div>
  );
}

// ── NEW badge (pulsing) ───────────────────────────────────────────────────────
function NewBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white">
      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
      NEW
    </span>
  );
}

// ── Hero card (first featured post — large full-width) ────────────────────────
function HeroCard({
  post, isBookmarked, onToggleBookmark,
}: {
  post: SerializedPost; isBookmarked: boolean; onToggleBookmark: (e: React.MouseEvent) => void;
}) {
  const fresh = isNew(post.publishedAt);
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group relative flex flex-col sm:flex-row rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 duration-200 min-h-[280px]"
    >
      {/* Full gradient cover */}
      <div
        className="sm:w-[45%] h-48 sm:h-auto flex-shrink-0 relative overflow-hidden bg-gray-900"
        style={!post.thumbnailUrl ? { background: `linear-gradient(135deg, ${post.accentColor}ee 0%, ${post.accentColor}99 100%)` } : {}}
      >
        {post.thumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.thumbnailUrl} alt={post.title} className="absolute inset-0 w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-300" />
        )}
        {/* Large category label + bookmark */}
        <div className="absolute inset-0 flex flex-col justify-between p-6 z-10">
          <div className="flex items-start justify-between w-full">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-sm">
                {post.category}
              </span>
              {fresh && <NewBadge />}
            </div>
            <button
              onClick={onToggleBookmark}
              className="relative z-10 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-sm shadow-sm"
              title={isBookmarked ? "Remove bookmark" : "Bookmark post"}
            >
              <Bookmark className={cn("w-4 h-4", isBookmarked ? "fill-amber-400 text-amber-400" : "text-white/80")} />
            </button>
          </div>
          {/* Large sparkle icon decoration */}
          <Sparkles className="w-20 h-20 text-white/10 absolute bottom-4 right-4" />
        </div>
      </div>

      {/* Content panel */}
      <div className="flex-1 bg-white p-7 sm:p-8 flex flex-col justify-between">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Featured Article</p>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 mb-3 leading-tight group-hover:text-[#8B7FE8] transition-colors">
            {post.title}
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-5 line-clamp-3">{post.excerpt}</p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AuthorAvatar src={post.authorImage} name={post.authorName} size={7} />
            <div>
              <p className="text-xs font-semibold text-gray-700">{post.authorName ?? "EditBridge"}</p>
              <p className="text-[10px] text-gray-400 flex items-center gap-1">
                <BookOpen className="w-2.5 h-2.5" /> {post.readTime}
                {post.publishedAt && <> · {formatDate(post.publishedAt)}</>}
              </p>
            </div>
          </div>
          <span className="hidden sm:flex items-center gap-1 text-xs font-semibold text-[#8B7FE8] group-hover:gap-2 transition-all">
            Read more <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── Secondary featured card ───────────────────────────────────────────────────
function FeaturedCard({
  post, isBookmarked, onToggleBookmark,
}: {
  post: SerializedPost; isBookmarked: boolean; onToggleBookmark: (e: React.MouseEvent) => void;
}) {
  const fresh = isNew(post.publishedAt);
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all hover:-translate-y-0.5 duration-200"
    >
      <div
        className="h-32 w-full flex items-end justify-between p-4 relative overflow-hidden bg-gray-900"
        style={!post.thumbnailUrl ? { background: `linear-gradient(135deg, ${post.accentColor}cc 0%, ${post.accentColor}88 100%)` } : {}}
      >
        {post.thumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.thumbnailUrl} alt={post.title} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-300" />
        )}
        <div className="relative z-10 flex items-center gap-1.5 flex-wrap">
          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-sm">
            {post.category}
          </span>
          {fresh && <NewBadge />}
        </div>
        <button
          onClick={onToggleBookmark}
          className="relative z-10 p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-all backdrop-blur-sm"
          title={isBookmarked ? "Remove bookmark" : "Bookmark post"}
        >
          <Bookmark className={cn("w-3.5 h-3.5", isBookmarked ? "fill-amber-400 text-amber-400" : "text-white/80")} />
        </button>
      </div>
      <div className="flex-1 bg-white p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-2 leading-snug group-hover:text-[#8B7FE8] transition-colors line-clamp-2">
          {post.title}
        </h2>
        <p className="text-gray-400 text-xs leading-relaxed mb-3 line-clamp-2">{post.excerpt}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AuthorAvatar src={post.authorImage} name={post.authorName} size={5} />
            <span className="text-xs text-gray-400">{post.authorName ?? "EditBridge"}</span>
          </div>
          <span className="text-[10px] text-gray-300 flex items-center gap-1">
            <BookOpen className="w-2.5 h-2.5" /> {post.readTime}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── List Row Card ─────────────────────────────────────────────────────────────
function ListCard({
  post, isBookmarked, onToggleBookmark,
}: {
  post: SerializedPost; isBookmarked: boolean; onToggleBookmark: (e: React.MouseEvent) => void;
}) {
  const fresh = isNew(post.publishedAt);
  return (
    <div
      className="relative group flex items-start gap-4 p-5 rounded-2xl bg-white border border-gray-100 hover:border-[#8B7FE8]/30 hover:shadow-md transition-all duration-200"
    >
      <div className="w-1 self-stretch rounded-full shrink-0" style={{ background: post.accentColor }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <Link
            href={`/blog/category/${categorySlug(post.category)}`}
            className={`relative z-10 inline-block px-2 py-0.5 rounded-full text-xs font-semibold hover:opacity-80 transition-opacity ${post.pillClass}`}
          >
            {post.category}
          </Link>
          {fresh && <NewBadge />}
          <span className="text-xs text-gray-300 flex items-center gap-1">
            <BookOpen className="w-3 h-3" /> {post.readTime}
          </span>
        </div>
        <h3 className="font-bold text-gray-900 text-base leading-snug mb-1 group-hover:text-[#8B7FE8] transition-colors">
          <Link
            href={`/blog/${post.slug}`}
            className="focus:outline-none after:absolute after:inset-0 after:rounded-2xl"
          >
            {post.title}
          </Link>
        </h3>
        <p className="text-sm text-gray-400 leading-relaxed line-clamp-1">{post.excerpt}</p>
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0 relative z-10">
        <div className="flex items-center gap-1.5">
          <AuthorAvatar src={post.authorImage} name={post.authorName} size={5} />
          <span className="text-xs text-gray-300 whitespace-nowrap hidden sm:inline">
            {post.publishedAt ? formatDate(post.publishedAt) : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleBookmark}
            className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-amber-500 transition-colors border border-gray-100"
            title={isBookmarked ? "Remove bookmark" : "Bookmark post"}
          >
            <Bookmark className={cn("w-3.5 h-3.5", isBookmarked ? "fill-amber-400 text-amber-400" : "text-gray-400")} />
          </button>
          <ArrowRight className="w-4 h-4 text-gray-200 group-hover:text-[#8B7FE8] group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </div>
  );
}

// ── Newsletter CTA ────────────────────────────────────────────────────────────
function NewsletterCTA() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    // Simulate API call (wire to your email service)
    setTimeout(() => {
      setStatus("done");
      setEmail("");
    }, 1000);
  }

  return (
    <div className="my-10 rounded-2xl bg-gradient-to-br from-[#13003a] to-[#1e0060] p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-xl bg-[#8B7FE8]/20 flex items-center justify-center">
            <Mail className="w-4 h-4 text-[#8B7FE8]" />
          </div>
          <p className="font-bold text-white text-base">Get new posts to your inbox</p>
        </div>
        <p className="text-sm text-white/50">
          Guides, tips, and creator resources — delivered weekly. No spam.
        </p>
      </div>
      {status === "done" ? (
        <div className="shrink-0 px-5 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-semibold">
          ✓ You&apos;re subscribed!
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2 w-full sm:w-auto shrink-0">
          <input
            type="email"
            required
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 sm:w-52 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-[#8B7FE8]/60 focus:ring-2 focus:ring-[#8B7FE8]/20 transition-all"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="px-4 py-2.5 rounded-xl bg-[#8B7FE8] hover:bg-[#7a6fd6] text-white text-sm font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-60"
          >
            {status === "loading" ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Subscribe
          </button>
        </form>
      )}
    </div>
  );
}

// ── Main Client Component ─────────────────────────────────────────────────────
export function BlogClient({ allPosts, featured }: BlogClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read URL values directly — making URL search parameters the single source of truth
  const query = searchParams.get("q") || "";
  const activeCategory = searchParams.get("category") || null;
  const page = Number(searchParams.get("page") || "1");
  const showBookmarksOnly = searchParams.get("bookmarks") === "true";

  const [bookmarks, setBookmarks] = useState<string[]>([]);

  // Load bookmarks on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("eb_blog_bookmarks");
      if (saved) setBookmarks(JSON.parse(saved));
    } catch {}
  }, []);

  const toggleBookmark = (slug: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    let next: string[];
    if (bookmarks.includes(slug)) {
      next = bookmarks.filter((b) => b !== slug);
    } else {
      next = [...bookmarks, slug];
    }
    setBookmarks(next);
    try {
      localStorage.setItem("eb_blog_bookmarks", JSON.stringify(next));
    } catch {}
  };

  const categories = useMemo(() => {
    const set = new Set(allPosts.map((p) => p.category));
    return Array.from(set).sort();
  }, [allPosts]);

  const isFiltering = !!query.trim() || !!activeCategory || showBookmarksOnly;

  const filteredPosts = useMemo(() => {
    const q = query.trim().toLowerCase();
    let pool = allPosts;
    if (showBookmarksOnly) {
      pool = allPosts.filter((p) => bookmarks.includes(p.slug));
    } else if (!isFiltering) {
      pool = allPosts.slice(2); // exclude top 2 featured when idle
    }
    return pool.filter((p) => {
      const matchCat = !activeCategory || p.category === activeCategory;
      const matchQ = !q || p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [allPosts, query, activeCategory, showBookmarksOnly, bookmarks, isFiltering]);

  const totalPages = Math.ceil(filteredPosts.length / PER_PAGE);
  const visible = filteredPosts.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Helper to push URL updates
  const setParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null) {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  function selectCategory(cat: string) {
    const nextCat = activeCategory === cat ? null : cat;
    setParams({ category: nextCat, page: null });
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  function onSearch(val: string) {
    setParams({ q: val || null, page: null });
  }

  function toggleBookmarksOnly() {
    setParams({ bookmarks: showBookmarksOnly ? null : "true", page: null });
  }

  function setPageNum(p: number) {
    setParams({ page: p > 1 ? p.toString() : null });
  }

  return (
    <>
      {/* ── Featured hero + secondary card (only when not filtering) ────── */}
      {!isFiltering && featured.length > 0 && (
        <section className="mb-10 space-y-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Featured</p>
          {/* First post: large hero */}
          <HeroCard
            post={featured[0]}
            isBookmarked={bookmarks.includes(featured[0].slug)}
            onToggleBookmark={(e) => toggleBookmark(featured[0].slug, e)}
          />
          {/* Second post: smaller card — only if exists */}
          {featured[1] && (
            <div className="grid sm:grid-cols-2 gap-5">
              <FeaturedCard
                post={featured[1]}
                isBookmarked={bookmarks.includes(featured[1].slug)}
                onToggleBookmark={(e) => toggleBookmark(featured[1].slug, e)}
              />
              {/* Sticky author teaser box */}
              <div className="rounded-2xl border border-neutral-200/60 bg-white p-6 flex flex-col justify-between shadow-sm">
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3">Written by</p>
                  <div className="flex items-center gap-3 mb-4">
                    <AuthorAvatar src={featured[1].authorImage} name={featured[1].authorName} size={10} />
                    <div>
                      <p className="font-bold text-neutral-800 text-sm">{featured[1].authorName ?? "EditBridge Team"}</p>
                      <p className="text-xs text-neutral-450">Contributor · EditBridge</p>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Guides and resources to help creators and editors work better together.
                  </p>
                </div>
                <Link
                  href="/browse"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#7c6ff7] hover:text-[#6a5ef0] transition-colors"
                >
                  Browse editors <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Newsletter CTA ────────────────────────────────────────────────── */}
      {!isFiltering && <NewsletterCTA />}

      {/* ── Search + Category bar ─────────────────────────────────────────── */}
      <div className="mb-6 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search articles…"
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-10 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#8B7FE8]/50 focus:ring-2 focus:ring-[#8B7FE8]/10 transition-all"
          />
          {query && (
            <button onClick={() => onSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category pills — each links to /blog/category/[cat] AND also filters inline */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          {/* Bookmarks toggle */}
          <button
            onClick={toggleBookmarksOnly}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
              showBookmarksOnly
                ? "bg-amber-500 text-white shadow-sm shadow-amber-500/30"
                : "bg-white border border-gray-200 text-gray-600 hover:border-amber-500/40 hover:text-amber-500"
            }`}
          >
            <Bookmark className={cn("w-3.5 h-3.5", showBookmarksOnly ? "fill-white text-white" : "text-gray-400")} /> Bookmarks
          </button>

          <span className="shrink-0 w-px h-5 bg-gray-200 my-auto" />

          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => selectCategory(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                activeCategory === cat
                  ? "bg-[#8B7FE8] text-white shadow-sm shadow-[#8B7FE8]/30"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-[#8B7FE8]/40 hover:text-[#8B7FE8]"
              }`}
            >
              {cat}
            </button>
          ))}
          {(activeCategory || showBookmarksOnly) && (
            <button
              onClick={() => {
                setParams({ category: null, bookmarks: null, page: null });
              }}
              className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-50 text-red-500 border border-red-100 hover:bg-red-100 transition-colors"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Results header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          {isFiltering ? `${filteredPosts.length} result${filteredPosts.length !== 1 ? "s" : ""}` : "All posts"}
        </p>
        {totalPages > 1 && (
          <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
        )}
      </div>

      {/* ── Post list ─────────────────────────────────────────────────────── */}
      {visible.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Search className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="font-semibold text-gray-500 mb-1">No articles found</p>
          <p className="text-sm text-gray-400">Try a different keyword or category.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((post) => (
            <ListCard
              key={post.id}
              post={post}
              isBookmarked={bookmarks.includes(post.slug)}
              onToggleBookmark={(e) => toggleBookmark(post.slug, e)}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPageNum(page - 1)}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-[#8B7FE8]/40 hover:text-[#8B7FE8] transition-colors bg-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | "…")[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
                // eslint-disable-next-line react-hooks/exhaustive-deps
              }, [])
              .map((item, i) =>
                item === "…" ? (
                  <span key={`e-${i}`} className="w-9 h-9 flex items-center justify-center text-gray-400 text-sm">…</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setPageNum(item as number)}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-semibold transition-colors ${
                      item === page ? "bg-[#8B7FE8] text-white shadow-sm" : "text-gray-500 hover:bg-gray-100 bg-white border border-gray-100"
                    }`}
                  >
                    {item}
                  </button>
                )
              )}
          </div>
          <button
            disabled={page === totalPages}
            onClick={() => setPageNum(page + 1)}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-[#8B7FE8]/40 hover:text-[#8B7FE8] transition-colors bg-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}
    </>
  );
}

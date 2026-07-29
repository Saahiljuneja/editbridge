export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { showcaseItems, editors, users, portfolioItems } from "@/lib/db/schema";
import { eq, asc, desc, and } from "drizzle-orm";
import { parseVideoUrl } from "@/lib/video-embed";
import { displayNameFromFull } from "@/lib/utils";
import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, ArrowRight, Heart, Eye, Film } from "lucide-react";

export const metadata: Metadata = {
  title: "Showcase — Hand-picked editor work | EditBridge",
  description: "A curated selection of standout video edits from EditBridge's marketplace of verified editors.",
};

export default async function ShowcasePage() {
  const [rows, featuredPortfolio] = await Promise.all([
  db
    .select({
      id: showcaseItems.id,
      editorId: showcaseItems.editorId,
      videoUrl: showcaseItems.videoUrl,
      title: showcaseItems.title,
      description: showcaseItems.description,
      editorName: users.name,
      editorDisplayName: editors.displayName,
      editorTitle: editors.title,
      editorImage: users.image,
    })
    .from(showcaseItems)
    .innerJoin(editors, eq(editors.id, showcaseItems.editorId))
    .innerJoin(users, eq(users.id, editors.userId))
    .orderBy(asc(showcaseItems.sortOrder), asc(showcaseItems.createdAt)),
  db
    .select({
      id: portfolioItems.id,
      title: portfolioItems.title,
      type: portfolioItems.type,
      url: portfolioItems.url,
      category: portfolioItems.category,
      likesCount: portfolioItems.likesCount,
      viewsCount: portfolioItems.viewsCount,
      editorId: portfolioItems.editorId,
      editorDisplayName: editors.displayName,
      editorUserName: users.name,
      editorImage: users.image,
    })
    .from(portfolioItems)
    .innerJoin(editors, and(eq(editors.id, portfolioItems.editorId), eq(editors.kycStatus, "approved")))
    .innerJoin(users, eq(users.id, editors.userId))
    .orderBy(desc(portfolioItems.likesCount))
    .limit(6),
  ]);

  const items = rows
    .map((row) => ({ ...row, parsed: parseVideoUrl(row.videoUrl) }))
    .filter((row) => row.parsed !== null);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-white border-b border-gray-100">
        <div className="px-8 py-6 text-center">
          <p className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-[var(--brand-editor)] uppercase mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Showcase
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">
            Hand-picked work from our editors
          </h1>
          <p className="text-sm sm:text-base text-gray-500 px-8 py-6">
            A curated look at what EditBridge editors can do — real client projects,
            picked by our team.
          </p>
        </div>
      </div>

      <div className="px-8 py-6">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white border border-gray-200 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-gray-300" />
            </div>
            <p className="font-semibold text-gray-700">Nothing showcased yet</p>
            <p className="text-sm text-gray-400 mt-1 mb-5">Check back soon for hand-picked editor work.</p>
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "var(--brand-client)" }}
            >
              Browse editors <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => {
              const displayName = item.editorDisplayName || displayNameFromFull(item.editorName);
              const initials = displayName.slice(0, 2).toUpperCase();
              return (
                <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="aspect-video bg-black">
                    <iframe
                      src={item.parsed!.embedUrl}
                      title={item.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-bold text-gray-900 text-sm leading-snug mb-1">{item.title}</h3>
                    {item.description && (
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3 flex-1">{item.description}</p>
                    )}
                    <Link
                      href={`/editor/${item.editorId}`}
                      className="flex items-center gap-2.5 mt-auto pt-3 border-t border-gray-50 group"
                    >
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-gradient-to-br from-[var(--brand-client)] to-[#6c63d4] flex items-center justify-center shrink-0">
                        {item.editorImage ? (
                          <Image src={item.editorImage} alt={displayName} width={32} height={32} className="object-cover w-full h-full" />
                        ) : (
                          <span className="text-white font-bold text-[10px]">{initials}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-800 truncate group-hover:text-[var(--brand-client)] transition-colors">{displayName}</p>
                        {item.editorTitle && <p className="text-[10px] text-gray-400 truncate">{item.editorTitle}</p>}
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[var(--brand-client)] transition-colors shrink-0" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Featured portfolio items from the feed */}
      {featuredPortfolio.length > 0 && (
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs font-bold tracking-wider text-[var(--brand-client)] uppercase mb-1 flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5" /> From the Feed
              </p>
              <h2 className="text-xl font-black text-gray-900">Top portfolio picks</h2>
            </div>
            <Link href="/feed" className="text-sm font-semibold text-[var(--brand-client)] hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {featuredPortfolio.map(item => {
              const r2Base = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
              const proxyUrl = item.url
                ? item.url.startsWith("/api/file/") ? item.url
                  : r2Base && item.url.startsWith(r2Base) ? `/api/file/${item.url.slice(r2Base.length + 1)}`
                  : `/api/file/${item.url}`
                : null;
              const displayName = item.editorDisplayName || displayNameFromFull(item.editorUserName);
              return (
                <Link
                  key={item.id}
                  href={`/feed?item=${item.id}`}
                  className="group relative rounded-2xl overflow-hidden bg-gray-100 aspect-[9/16] border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                >
                  {proxyUrl && item.type === "image" ? (
                    <Image src={proxyUrl} alt={item.title ?? "Portfolio"} fill className="object-cover" sizes="(max-width:640px) 50vw, 17vw" unoptimized />
                  ) : (
                    <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                      <Film className="w-8 h-8 text-white/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-2 space-y-0.5">
                    {item.category && (
                      <span className="text-[8px] font-bold text-white/50 uppercase tracking-wide">{item.category}</span>
                    )}
                    <p className="text-white text-[10px] font-semibold leading-tight line-clamp-2">{item.title ?? "Untitled"}</p>
                    <p className="text-white/60 text-[9px] truncate">{displayName}</p>
                    <div className="flex items-center gap-2 text-white/40 text-[9px]">
                      <span className="flex items-center gap-0.5"><Eye className="w-2 h-2" />{item.viewsCount}</span>
                      <span className="flex items-center gap-0.5"><Heart className="w-2 h-2" />{item.likesCount}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
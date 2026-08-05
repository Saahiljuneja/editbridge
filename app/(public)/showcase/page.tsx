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
import { TopoBackground } from "@/components/common/topo-background";

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
    <div className="relative min-h-screen bg-[#ffffff] pb-12 overflow-hidden">
      {/* Topographic contour lines backdrop */}
      <TopoBackground background="#ffffff" strokeColor="#f3f4f6" opacity={0.65} />

      <div className="max-w-7xl mx-auto px-6 pt-8 space-y-8 relative z-10">
        {/* Curated Hero Card */}
        <div className="bg-[#ffffff] rounded-3xl border border-neutral-200/50 p-8 text-center shadow-sm relative z-10">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-extrabold tracking-wider text-[#7C3AED] uppercase mb-2 select-none">
            <Sparkles className="w-3.5 h-3.5 text-[#7C3AED]" /> Curated Showcase
          </p>
          <h1 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight leading-none mb-3">
            Hand-picked work from our editors
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 font-semibold max-w-xl mx-auto">
            A curated look at what EditBridge editors can do — real client projects, hand-picked by our team.
          </p>
        </div>

        {/* Curated Items Grid */}
        <div className="relative z-10">
          {items.length === 0 ? (
            <div className="bg-[#ffffff] rounded-3xl border border-neutral-200/50 p-16 text-center shadow-sm max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-[#f3f4f6] border border-neutral-200/30 flex items-center justify-center mb-4 mx-auto">
                <Sparkles className="w-6 h-6 text-neutral-300" />
              </div>
              <p className="font-bold text-neutral-700 text-sm">Nothing showcased yet</p>
              <p className="text-xs text-neutral-400 mt-1 mb-5">Check back soon for hand-picked editor work.</p>
              <Link
                href="/browse"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-90 active:scale-[0.99] transition-all"
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
                  <div key={item.id} className="bg-[#ffffff] rounded-3xl border border-neutral-200/40 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md hover:-translate-y-0.5 duration-200">
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
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="font-bold text-neutral-900 text-[14px] leading-snug mb-1.5">{item.title}</h3>
                      {item.description && (
                        <p className="text-xs text-neutral-400 leading-relaxed line-clamp-2 mb-4 flex-1">{item.description}</p>
                      )}
                      <Link
                        href={`/editor/${item.editorId}`}
                        className="flex items-center gap-2.5 mt-auto pt-3 border-t border-neutral-100 group"
                      >
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-gradient-to-br from-[var(--brand-client)] to-[#6c63d4] flex items-center justify-center shrink-0">
                          {item.editorImage ? (
                            <Image src={item.editorImage} alt={displayName} width={32} height={32} className="object-cover w-full h-full" />
                          ) : (
                            <span className="text-white font-bold text-[10px]">{initials}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-neutral-800 truncate group-hover:text-[var(--brand-client)] transition-colors">{displayName}</p>
                          {item.editorTitle && <p className="text-[10px] text-neutral-400 font-semibold truncate">{item.editorTitle}</p>}
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-neutral-300 group-hover:text-[var(--brand-client)] transition-colors shrink-0" />
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
          <div className="relative z-10 pt-4">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[11px] font-extrabold tracking-wider text-[var(--brand-client)] uppercase mb-1.5 flex items-center gap-1.5 select-none">
                  <Film className="w-3.5 h-3.5 text-[var(--brand-client)]" /> From the Feed
                </p>
                <h2 className="text-xl font-black text-neutral-900 tracking-tight">Top portfolio picks</h2>
              </div>
              <Link href="/browse" className="text-xs font-bold text-[var(--brand-client)] hover:underline flex items-center gap-1">
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
                    href={`/editor/${item.editorId}`}
                    className="group bg-[#ffffff] rounded-[22px] p-2 border border-neutral-200/50 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col"
                  >
                    {/* Rounded Thumbnail Container */}
                    <div className="relative aspect-[3/4] w-full rounded-[16px] overflow-hidden bg-neutral-50 shrink-0">
                      {proxyUrl && item.type === "image" ? (
                        <Image src={proxyUrl} alt={item.title ?? "Portfolio"} fill className="object-cover transition-transform group-hover:scale-105 duration-300" sizes="(max-width:640px) 50vw, 17vw" unoptimized />
                      ) : (
                        <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
                          <Film className="w-8 h-8 text-white/30" />
                        </div>
                      )}
                      {/* Overlay gradient & stats */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 text-white/90 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{item.viewsCount}</span>
                        <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" />{item.likesCount}</span>
                      </div>
                    </div>

                    {/* Polaroid Label Footer */}
                    <div className="pt-3 px-1 pb-1 flex-1 flex flex-col text-left">
                      {item.category && (
                        <span className="text-[8px] font-extrabold text-neutral-400 uppercase tracking-wider mb-0.5">{item.category}</span>
                      )}
                      <p className="text-neutral-800 text-[11px] font-bold leading-tight line-clamp-1 group-hover:text-black transition-colors">{item.title ?? "Untitled"}</p>
                      <p className="text-neutral-400 text-[9px] font-semibold mt-0.5 truncate">👤 {displayName}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
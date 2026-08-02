export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { portfolioSaves, portfolioItems, editors, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";
import { Bookmark, Eye, Heart, MessageCircle, Play, Film } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function EditorSavedPortfolioPage() {
  const session = await auth();
  if (!session || session.user.role !== "editor") redirect("/login");

  const userId = session.user.userId!;

  const r2Base = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
  const toProxy = (raw: string | null) => {
    if (!raw) return null;
    if (raw.startsWith("/api/file/")) return raw;
    if (r2Base && raw.startsWith(r2Base)) return `/api/file/${raw.slice(r2Base.length + 1)}`;
    return `/api/file/${raw}`;
  };

  const rows = await db
    .select({
      savedAt: portfolioSaves.createdAt,
      itemId: portfolioItems.id,
      itemType: portfolioItems.type,
      itemUrl: portfolioItems.url,
      itemTitle: portfolioItems.title,
      itemCategory: portfolioItems.category,
      itemLikes: portfolioItems.likesCount,
      itemComments: portfolioItems.commentsCount,
      itemViews: portfolioItems.viewsCount,
      editorId: editors.id,
      editorDisplayName: editors.displayName,
      editorUserName: users.name,
      editorUserImage: users.image,
    })
    .from(portfolioSaves)
    .innerJoin(portfolioItems, eq(portfolioSaves.portfolioItemId, portfolioItems.id))
    .innerJoin(editors, eq(portfolioItems.editorId, editors.id))
    .innerJoin(users, eq(editors.userId, users.id))
    .where(eq(portfolioSaves.userId, userId))
    .orderBy(desc(portfolioSaves.createdAt));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Saved Portfolio</h1>
            <p className="text-sm text-gray-400 mt-0.5">{rows.length} bookmarked item{rows.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[var(--brand-client)]/10 flex items-center justify-center">
            <Bookmark className="w-4 h-4 text-[var(--brand-client)]" />
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--brand-client)]/10 flex items-center justify-center mb-4">
              <Bookmark className="w-7 h-7 text-[var(--brand-client)]" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">No saved items yet</h3>
            <p className="text-sm text-gray-400 mb-5">Bookmark portfolio items from the feed to find them here.</p>
            <Link href="/feed" className="inline-flex items-center gap-2 bg-[var(--brand-client)] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[var(--brand-client-hover)] transition-colors">
              <Film className="w-4 h-4" /> Browse Feed
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {rows.map(row => {
              const proxyUrl = toProxy(row.itemUrl) ?? row.itemUrl;
              return (
                <Link
                  key={row.itemId}
                  href={`/feed?item=${row.itemId}`}
                  className="group relative rounded-2xl overflow-hidden bg-gray-100 border border-gray-100 shadow-sm hover:shadow-md transition-shadow aspect-[9/16]"
                >
                  {row.itemType === "video" ? (
                    <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                      <Play className="w-10 h-10 text-white/60" />
                      <video src={proxyUrl ?? undefined} className="absolute inset-0 w-full h-full object-cover opacity-60" muted preload="metadata" />
                    </div>
                  ) : (
                    <Image src={proxyUrl ?? ""} alt={row.itemTitle ?? "Portfolio"} fill className="object-cover" sizes="(max-width:640px) 50vw, 33vw" unoptimized />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1">
                    {row.itemCategory && (
                      <span className="text-[9px] font-bold text-white/60 uppercase tracking-wide">{row.itemCategory}</span>
                    )}
                    <p className="text-white text-xs font-semibold leading-tight line-clamp-2">{row.itemTitle ?? "Untitled"}</p>
                    <div className="flex items-center gap-1.5">
                      {row.editorUserImage ? (
                        <Image src={row.editorUserImage} alt={row.editorDisplayName ?? ""} width={16} height={16} className="rounded-full object-cover shrink-0" unoptimized />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-sky-500 flex items-center justify-center shrink-0">
                          <span className="text-white text-[8px] font-bold">{(row.editorDisplayName ?? row.editorUserName ?? "?").slice(0, 1).toUpperCase()}</span>
                        </div>
                      )}
                      <span className="text-white/70 text-[10px] truncate">{row.editorDisplayName ?? row.editorUserName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/50 text-[9px]">
                      <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />{row.itemViews}</span>
                      <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" />{row.itemLikes}</span>
                      <span className="flex items-center gap-0.5"><MessageCircle className="w-2.5 h-2.5" />{row.itemComments}</span>
                    </div>
                  </div>

                  <div className="absolute top-2 right-2 bg-black/50 text-white/70 text-[9px] px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                    {formatDate(row.savedAt)}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Browse Verified Video Editors — EditBridge",
  description: "Find and hire KYC-verified video editors for YouTube, Reels, Shorts, Podcasts and more. Compare packages, check portfolios, and book with escrow protection.",
};
import { SearchBar } from "@/components/common/search-bar";
import { EditorCard } from "@/components/editor/editor-card";
import { ComparePanel } from "@/components/browse/compare-panel";
import { TopFilterBar } from "@/components/browse/top-filter-bar";
import { Search, ShieldCheck, Star, Lock } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface BrowseSearchParams {
  q?: string;
  niche?: string;
  experience?: string;
  min_price?: string;
  max_price?: string;
  delivery?: string;
  min_rating?: string;
  rating?: string;
  sort?: string;
  page?: string;
  compare?: string;
  available?: string;
}

async function fetchEditors(params: BrowseSearchParams) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
  const url = new URL(`${baseUrl}/api/editors`);
  if (params.q) url.searchParams.set("q", params.q);
  if (params.niche) url.searchParams.set("niche", params.niche);
  if (params.experience) url.searchParams.set("experience", params.experience);
  if (params.min_price) url.searchParams.set("min_price", params.min_price);
  if (params.max_price) url.searchParams.set("max_price", params.max_price);
  if (params.delivery) url.searchParams.set("delivery_days", params.delivery);
  if (params.min_rating || params.rating) url.searchParams.set("min_rating", params.min_rating ?? params.rating ?? "");
  if (params.sort) url.searchParams.set("sort", params.sort);
  if (params.page) url.searchParams.set("page", params.page);
  if (params.available) url.searchParams.set("available", params.available);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch editors");
  return res.json() as Promise<{
    editors: Array<{
      id: string;
      name: string | null;
      displayName?: string | null;
      title?: string | null;
      image: string | null;
      bio: string | null;
      niche?: string | null;
      location?: string | null;
      skills: string[];
      minPrice: number | null;
      minDelivery?: number | null;
      avgRating: number | null;
      reviewCount: number;
      totalOrders: number;
      isAvailable?: boolean;
      onTimeRate?: number | null;
      verifiedPortfolioCount?: number;
      isFeatured?: boolean;
      thumbnailUrl?: string | null;
      videoUrl?: string | null;
    }>;
    total: number;
    page: number;
    totalPages: number;
  }>;
}

function EditorGridSkeleton() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-gray-100 bg-white p-5 space-y-3 animate-pulse">
          <div className="flex items-start gap-3.5">
            <div className="w-14 h-14 rounded-xl bg-gray-100 shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3.5 bg-gray-100 rounded-full w-28" />
              <div className="h-2.5 bg-gray-100 rounded-full w-20" />
              <div className="h-2.5 bg-gray-100 rounded-full w-24" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="h-2.5 bg-gray-100 rounded-full w-full" />
            <div className="h-2.5 bg-gray-100 rounded-full w-3/4" />
          </div>
          <div className="flex gap-1.5">
            <div className="h-5 w-16 bg-gray-100 rounded-full" />
            <div className="h-5 w-20 bg-gray-100 rounded-full" />
          </div>
          <div className="border-t border-gray-50 pt-3 flex justify-between items-center">
            <div className="h-4 bg-gray-100 rounded w-20" />
            <div className="h-8 w-24 bg-gray-100 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PaginationBar({ page, totalPages, searchParams }: { page: number; totalPages: number; searchParams: BrowseSearchParams }) {
  const maxPages = Math.min(totalPages, 7);
  return (
    <div className="flex items-center justify-center gap-2 mt-10">
      {page > 1 && (
        <Link
          href={{ query: { ...searchParams, page: page - 1 } }}
          className="px-4 py-2 rounded-full border border-neutral-200 text-xs font-bold uppercase tracking-wider text-neutral-600 hover:bg-neutral-50 transition-colors"
        >
          ← Previous
        </Link>
      )}
      <div className="flex items-center gap-1">
        {Array.from({ length: maxPages }).map((_, i) => {
          const p = i + 1;
          return (
            <Link
              key={p}
              href={{ query: { ...searchParams, page: p } }}
              className={cn(
                "w-9 h-9 flex items-center justify-center rounded-full text-xs font-bold transition-colors",
                p === page
                  ? "bg-black text-white shadow-sm"
                  : "text-neutral-500 hover:bg-neutral-50"
              )}
            >
              {p}
            </Link>
          );
        })}
      </div>
      {page < totalPages && (
        <Link
          href={{ query: { ...searchParams, page: page + 1 } }}
          className="px-4 py-2 rounded-full border border-neutral-200 text-xs font-bold uppercase tracking-wider text-neutral-600 hover:bg-neutral-50 transition-colors"
        >
          Next →
        </Link>
      )}
    </div>
  );
}

async function EditorGrid({ searchParams }: { searchParams: BrowseSearchParams }) {
  const data = await fetchEditors(searchParams);
  const page = Number(searchParams.page || "1");

  if (data.editors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <Search className="w-7 h-7 text-gray-400" />
        </div>
        <p className="font-semibold text-gray-700 text-sm">No editors found</p>
        <p className="text-xs text-gray-400 mt-1 mb-5">Try adjusting your filters or search query.</p>
        <Link href="/browse" className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          Clear all filters
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-gray-500">
          <span className="font-bold text-gray-900">{data.total.toLocaleString("en-IN")}</span>{" "}
          editor{data.total !== 1 ? "s" : ""} found
        </p>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
          <span className="text-xs text-gray-400 font-medium">KYC-verified</span>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {data.editors.map((editor) => (
          <EditorCard key={editor.id} {...editor} />
        ))}
      </div>
      {data.totalPages > 1 && (
        <PaginationBar page={page} totalPages={data.totalPages} searchParams={searchParams} />
      )}
    </div>
  );
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<BrowseSearchParams>;
}) {
  const params = await searchParams;

  return (
    <div className="min-h-screen bg-white pb-safe">
      {/* Premium Hero */}
      <div className="relative bg-white eb-contour-bg overflow-hidden border-b border-neutral-200/60 py-10">
        {/* Subtle dot-grid texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.02]"
          style={{ backgroundImage: "radial-gradient(circle, #000000 1px, transparent 1px)", backgroundSize: "28px 28px" }}
        />

        <div className="relative max-w-3xl mx-auto px-6 pt-6 pb-6 text-center">
          {/* Live badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-6 rounded-full border border-neutral-200/60 bg-neutral-50/50 text-[11px] text-neutral-500 font-bold uppercase tracking-wider max-w-[90vw]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="truncate">KYC-verified · Escrow-protected · ₹0 fraud, ever</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-black leading-[1.1] mb-3">
            Find your perfect{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-black to-neutral-500 font-semibold">
              video editor
            </span>
          </h1>
          <p className="text-sm md:text-base text-neutral-500 mb-8 font-medium">
            Browse 100+ hand-verified editors. Pay only when you approve the work.
          </p>

          {/* Hero search bar */}
          <div className="relative max-w-2xl mx-auto">
            <Suspense>
              <SearchBar
                placeholder="Search by name, skill, or niche…"
                inputClassName="py-4 pl-12 pr-4 text-sm rounded-full border border-neutral-200 bg-neutral-50/50 focus:bg-white focus:border-black focus:ring-0 placeholder:text-neutral-400 shadow-sm transition-all duration-300"
              />
            </Suspense>
          </div>

          {/* Trust chips */}
          <div className="grid grid-cols-3 sm:flex sm:items-center sm:justify-center sm:gap-6 mt-8 gap-2">
            <div className="flex items-center justify-center gap-1.5 text-[10px] sm:text-xs text-neutral-500 font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-neutral-800 shrink-0" />
              <span>KYC-verified</span>
            </div>
            <div className="hidden sm:block w-px h-3 bg-neutral-200 shrink-0 mx-auto" />
            <div className="flex items-center justify-center gap-1.5 text-[10px] sm:text-xs text-neutral-500 font-bold uppercase tracking-wider">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
              <span>4.9★ rating</span>
            </div>
            <div className="hidden sm:block w-px h-3 bg-neutral-200 shrink-0 mx-auto" />
            <div className="flex items-center justify-center gap-1.5 text-[10px] sm:text-xs text-neutral-500 font-bold uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5 text-neutral-800 shrink-0" />
              <span>Escrow-safe</span>
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal filter bar — sticky */}
      <Suspense>
        <TopFilterBar />
      </Suspense>

      {/* Editor grid */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <Suspense fallback={<EditorGridSkeleton />}>
          <EditorGrid searchParams={params} />
        </Suspense>
      </div>

      {/* Editor comparison panel */}
      <Suspense>
        <ComparePanel />
      </Suspense>
    </div>
  );
}

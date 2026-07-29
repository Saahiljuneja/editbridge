import { Suspense } from "react";
import { SearchBar } from "@/components/common/search-bar";
import { EditorCard } from "@/components/editor/editor-card";
import { ComparePanel } from "@/components/browse/compare-panel";
import { TopFilterBar } from "@/components/browse/top-filter-bar";
import { Search } from "lucide-react";
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
}

async function fetchEditors(params: BrowseSearchParams) {
  const url = new URL(`${process.env.NEXT_PUBLIC_APP_URL}/api/editors`);
  if (params.q) url.searchParams.set("q", params.q);
  if (params.niche) url.searchParams.set("niche", params.niche);
  if (params.experience) url.searchParams.set("experience", params.experience);
  if (params.min_price) url.searchParams.set("min_price", params.min_price);
  if (params.max_price) url.searchParams.set("max_price", params.max_price);
  if (params.delivery) url.searchParams.set("delivery_days", params.delivery);
  if (params.min_rating || params.rating) url.searchParams.set("min_rating", params.min_rating ?? params.rating ?? "");
  if (params.sort) url.searchParams.set("sort", params.sort);
  if (params.page) url.searchParams.set("page", params.page);

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
        <div key={i} className="rounded-xl border border-gray-100 bg-white overflow-hidden animate-pulse">
          {/* Thumbnail */}
          <div className="w-full aspect-[4/3] bg-gray-100" />
          {/* Body */}
          <div className="p-3 space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0" />
              <div className="h-3.5 bg-gray-100 rounded-full w-24" />
            </div>
            <div className="space-y-1.5">
              <div className="h-2.5 bg-gray-100 rounded-full w-full" />
              <div className="h-2.5 bg-gray-100 rounded-full w-3/4" />
            </div>
            <div className="h-3 bg-gray-100 rounded-full w-20" />
            <div className="border-t border-gray-50 pt-2 flex justify-between items-center">
              <div className="h-3.5 bg-gray-100 rounded w-20" />
              <div className="h-2.5 bg-gray-100 rounded w-16" />
            </div>
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
          className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
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
                "w-9 h-9 flex items-center justify-center rounded-xl text-sm font-medium transition-colors",
                p === page
                  ? "bg-[var(--brand-client)] text-white"
                  : "text-gray-500 hover:bg-gray-100"
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
          className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
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
    <div className="min-h-screen bg-gray-50 pb-safe">
      {/* Hero bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 pt-6 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                Browse KYC-verified editors
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">Find, compare and hire — payment held safely in escrow.</p>
            </div>
            <div className="flex items-center gap-3 shrink-0 text-xs text-gray-400 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                Editors online now
              </span>
              <span className="text-gray-200">|</span>
              <span>4.9★ avg rating</span>
              <span className="text-gray-200">|</span>
              <span>₹0 fraud, ever</span>
            </div>
          </div>
          <SearchBar placeholder="Search by name, skill, or niche…" />
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

import { Suspense } from "react";
import { FilterPanel } from "@/components/common/filter-panel";
import { SearchBar } from "@/components/common/search-bar";
import { EditorCard } from "@/components/editor/editor-card";
import { MobileFilterDrawer } from "@/components/browse/mobile-filter-drawer";
import { ComparePanel } from "@/components/browse/compare-panel";
import { Search, Users } from "lucide-react";
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
  // `compare` is UI-only — never pass it to the API
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
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 9 }).map((_, i) => (
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
  return (
    <div className="flex items-center justify-center gap-3 mt-10">
      {page > 1 && (
        <Link
          href={{ query: { ...searchParams, page: page - 1 } }}
          className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          ← Previous
        </Link>
      )}
      <div className="flex items-center gap-1">
        {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
          const p = i + 1;
          return (
            <Link
              key={p}
              href={{ query: { ...searchParams, page: p } }}
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors",
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
      <div className="flex flex-col items-center justify-center py-20 text-center">
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
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-700">
          <span className="text-gray-900 font-bold">{data.total.toLocaleString("en-IN")}</span> editor{data.total !== 1 ? "s" : ""} found
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
  const hasFilters = !!(params.q || params.niche || params.experience || params.min_price || params.max_price || params.delivery || params.min_rating || params.sort);
  const activeFilterCount = ["niche", "experience", "min_price", "max_price", "delivery", "min_rating", "sort"]
    .filter((k) => !!(params as Record<string, string | undefined>)[k]).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-safe">
      {/* Hero bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="px-8 py-6 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between mb-6">
            <div>
              <p className="text-xs font-bold text-[var(--brand-client)] uppercase tracking-widest mb-1">Marketplace</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                Find your perfect editor
              </h1>
              <p className="text-sm text-gray-400 mt-1">KYC-verified video editors and designers, ready to work.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-full border border-green-100">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-semibold text-green-700">Editors Available</span>
              </div>
            </div>
          </div>
          <SearchBar placeholder="Search by name, skill, or niche…" />
        </div>
      </div>

      <div className="px-8 py-6 sm:px-6 py-8">
        <div className="flex gap-8 items-start">
          {/* Filter sidebar */}
          <aside className="hidden lg:block w-56 shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 sticky top-6">
            <FilterPanel />
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Active filters + result count bar */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  <span className="text-sm text-gray-500 font-medium">
                    {hasFilters ? "Filtered results" : "KYC-verified editors"}
                  </span>
                </div>
                {hasFilters && (
                  <Link href="/browse" className="text-xs text-[var(--brand-client)] font-medium hover:underline">
                    Clear filters
                  </Link>
                )}
              </div>
              <MobileFilterDrawer activeCount={activeFilterCount} />
            </div>

            <Suspense fallback={<EditorGridSkeleton />}>
              <EditorGrid searchParams={params} />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Editor comparison panel — fixed to bottom, self-fetches data */}
      <Suspense>
        <ComparePanel />
      </Suspense>
    </div>
  );
}
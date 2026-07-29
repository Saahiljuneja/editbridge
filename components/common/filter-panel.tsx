"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Star, SlidersHorizontal, X } from "lucide-react";
import { useState, useEffect } from "react";

const NICHES = [
  { value: "", label: "All" },
  { value: "YouTube Long-form", label: "YouTube Long-form" },
  { value: "Instagram Reels", label: "Instagram Reels & Shorts" },
  { value: "Wedding", label: "Wedding & Event Films" },
  { value: "Corporate", label: "Corporate & Brand Videos" },
  { value: "Podcast", label: "Podcast Editing" },
  { value: "Documentary", label: "Documentary & Films" },
  { value: "Thumbnail", label: "Thumbnails & Graphics" },
  { value: "Motion Graphics", label: "Motion Graphics & VFX" },
  { value: "E-learning", label: "E-learning & Courses" },
  { value: "Gaming", label: "Gaming & Twitch" },
  { value: "Travel", label: "Travel & Lifestyle" },
  { value: "Real Estate", label: "Real Estate & Property" },
];

const EXPERIENCE_LEVELS = [
  { value: "", label: "Any level" },
  { value: "entry", label: "Entry" },
  { value: "intermediate", label: "Intermediate" },
  { value: "expert", label: "Expert" },
];

const DELIVERY_OPTIONS = [
  { value: "1",  label: "24h" },
  { value: "3",  label: "3 days" },
  { value: "7",  label: "7 days" },
  { value: "14", label: "2 weeks" },
];

const RATING_OPTIONS = [
  { value: "4.5", stars: 5, label: "4.5+" },
  { value: "4.0", stars: 4, label: "4.0+" },
  { value: "3.5", stars: 3, label: "3.5+" },
];

const SORT_OPTIONS = [
  { value: "rating",    label: "Top Rated" },
  { value: "price_asc", label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
  { value: "newest",    label: "Newest" },
];

export function FilterPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function get(key: string) {
    return searchParams.get(key) ?? "";
  }

  function clearAll() {
    router.push(pathname);
  }

  const activeCount = ["niche", "experience", "min_price", "max_price", "delivery", "min_rating", "sort"]
    .filter((k) => !!searchParams.get(k)).length;

  // Local state for budget inputs — commit to URL only on blur / Enter
  const [minPrice, setMinPrice] = useState(get("min_price"));
  const [maxPrice, setMaxPrice] = useState(get("max_price"));

  // Keep local state in sync if URL changes externally (e.g. Clear all)
  useEffect(() => { setMinPrice(get("min_price")); }, [searchParams]);
  useEffect(() => { setMaxPrice(get("max_price")); }, [searchParams]);

  function commitBudget() {
    const params = new URLSearchParams(searchParams.toString());
    if (minPrice) params.set("min_price", minPrice); else params.delete("min_price");
    if (maxPrice) params.set("max_price", maxPrice); else params.delete("max_price");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">Filters</span>
          {activeCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-[var(--brand-client)] text-white text-[10px] font-bold flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button onClick={clearAll} className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-500 transition-colors">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Sort */}
      <Section label="Sort by">
        <select
          value={get("sort")}
          onChange={(e) => update("sort", e.target.value)}
          className="w-full text-sm rounded-xl border border-gray-200 px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/20 focus:border-[var(--brand-client)]/50 text-gray-700"
        >
          <option value="">Most Popular</option>
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </Section>

      <Divider />

      {/* Niche */}
      <Section label="Niche">
        <div className="flex flex-wrap gap-1.5">
          {NICHES.map((n) => {
            const active = get("niche") === n.value;
            return (
              <button
                key={n.value}
                onClick={() => update("niche", n.value)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors",
                  active
                    ? "bg-[var(--brand-client)] text-white border-[var(--brand-client)]"
                    : "bg-white text-gray-600 border-gray-200 hover:border-[var(--brand-client)]/40 hover:text-[var(--brand-client)]"
                )}
              >
                {n.label}
              </button>
            );
          })}
        </div>
      </Section>

      <Divider />

      {/* Experience level */}
      <Section label="Experience level">
        <div className="flex flex-wrap gap-1.5">
          {EXPERIENCE_LEVELS.map((e) => {
            const active = get("experience") === e.value;
            return (
              <button
                key={e.value}
                onClick={() => update("experience", e.value)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors",
                  active
                    ? "bg-[var(--brand-client)] text-white border-[var(--brand-client)]"
                    : "bg-white text-gray-600 border-gray-200 hover:border-[var(--brand-client)]/40 hover:text-[var(--brand-client)]"
                )}
              >
                {e.label}
              </button>
            );
          })}
        </div>
      </Section>

      <Divider />

      {/* Budget */}
      <Section label="Budget (₹)">
        <div className="flex gap-2 items-center">
          <input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            onBlur={commitBudget}
            onKeyDown={(e) => e.key === "Enter" && commitBudget()}
            className="w-full text-sm rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/20 focus:border-[var(--brand-client)]/50 placeholder:text-gray-300"
          />
          <span className="text-gray-300 text-xs shrink-0">—</span>
          <input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            onBlur={commitBudget}
            onKeyDown={(e) => e.key === "Enter" && commitBudget()}
            className="w-full text-sm rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/20 focus:border-[var(--brand-client)]/50 placeholder:text-gray-300"
          />
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5">Press Enter or click away to apply</p>
      </Section>

      <Divider />

      {/* Delivery time */}
      <Section label="Delivery time">
        <div className="flex flex-wrap gap-1.5">
          {DELIVERY_OPTIONS.map((d) => {
            const active = get("delivery") === d.value;
            return (
              <button
                key={d.value}
                onClick={() => update("delivery", active ? "" : d.value)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors",
                  active
                    ? "bg-[var(--brand-client)] text-white border-[var(--brand-client)]"
                    : "bg-white text-gray-600 border-gray-200 hover:border-[var(--brand-client)]/40 hover:text-[var(--brand-client)]"
                )}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </Section>

      <Divider />

      {/* Rating */}
      <Section label="Min. rating">
        <div className="space-y-1.5">
          {RATING_OPTIONS.map((r) => {
            const active = get("min_rating") === r.value;
            return (
              <button
                key={r.value}
                onClick={() => update("min_rating", active ? "" : r.value)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-colors",
                  active
                    ? "bg-[var(--brand-client)]/8 border-[var(--brand-client)]/30 text-[var(--brand-client)]"
                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                )}
              >
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={cn("w-3 h-3", i < r.stars ? "fill-amber-400 text-amber-400" : "text-gray-200")} />
                  ))}
                </div>
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-4">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">{label}</p>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="border-t border-gray-100" />;
}

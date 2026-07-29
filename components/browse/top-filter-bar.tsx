"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronDown, X, Star } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const NICHES = [
  { value: "", label: "All" },
  { value: "YouTube Long-form", label: "YouTube" },
  { value: "Instagram Reels", label: "Reels & Shorts" },
  { value: "Wedding", label: "Wedding Films" },
  { value: "Corporate", label: "Corporate" },
  { value: "Podcast", label: "Podcast" },
  { value: "Documentary", label: "Documentary" },
  { value: "Thumbnail", label: "Thumbnails" },
  { value: "Motion Graphics", label: "Motion Graphics" },
  { value: "Gaming", label: "Gaming" },
  { value: "Travel", label: "Travel" },
  { value: "Real Estate", label: "Real Estate" },
];

const SORT_OPTIONS = [
  { value: "", label: "Most Popular" },
  { value: "rating", label: "Top Rated" },
  { value: "price_asc", label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
  { value: "newest", label: "Newest" },
];

const DELIVERY_OPTIONS = [
  { value: "1", label: "24 hours" },
  { value: "3", label: "Up to 3 days" },
  { value: "7", label: "Up to 7 days" },
  { value: "14", label: "Up to 2 weeks" },
];

const RATING_OPTIONS = [
  { value: "4.5", label: "4.5 & up" },
  { value: "4.0", label: "4.0 & up" },
  { value: "3.5", label: "3.5 & up" },
];

export function TopFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState(searchParams.get("min_price") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("max_price") ?? "");
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMinPrice(searchParams.get("min_price") ?? "");
    setMaxPrice(searchParams.get("max_price") ?? "");
  }, [searchParams]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpen(null);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
    setOpen(null);
  }

  function toggle(key: string, value: string) {
    update(key, get(key) === value ? "" : value);
  }

  function get(key: string) {
    return searchParams.get(key) ?? "";
  }

  function commitBudget() {
    const params = new URLSearchParams(searchParams.toString());
    if (minPrice) params.set("min_price", minPrice); else params.delete("min_price");
    if (maxPrice) params.set("max_price", maxPrice); else params.delete("max_price");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
    setOpen(null);
  }

  function clearAll() {
    setMinPrice("");
    setMaxPrice("");
    setOpen(null);
    router.push(pathname);
  }

  const activeCount = ["niche", "min_price", "max_price", "delivery", "min_rating", "sort"]
    .filter((k) => !!searchParams.get(k)).length;

  const sortLabel = SORT_OPTIONS.find(o => o.value === get("sort") && o.value)?.label;
  const deliveryLabel = DELIVERY_OPTIONS.find(o => o.value === get("delivery"))?.label;
  const ratingActive = get("min_rating");
  const budgetActive = !!(get("min_price") || get("max_price"));

  const nicheLabel = NICHES.find(n => n.value === get("niche") && n.value)?.label;

  return (
    <div ref={barRef} className="bg-white/95 backdrop-blur-md border-b border-gray-100 sticky top-0 z-20 shadow-sm">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-2 py-3">

          {/* Category dropdown */}
          <DropBtn
            id="niche"
            label={nicheLabel ?? "Category"}
            active={!!nicheLabel}
            open={open === "niche"}
            onToggle={() => setOpen(open === "niche" ? null : "niche")}
            panelWidth="w-56"
          >
            {NICHES.map((n) => (
              <DropItem key={n.value} selected={get("niche") === n.value} onClick={() => update("niche", n.value)}>
                {n.label || "All categories"}
              </DropItem>
            ))}
          </DropBtn>

          <div className="h-6 w-px bg-gray-200 shrink-0" />

          {/* Sort */}
          <DropBtn
            id="sort"
            label={sortLabel ?? "Sort"}
            active={!!sortLabel}
            open={open === "sort"}
            onToggle={() => setOpen(open === "sort" ? null : "sort")}
          >
            {SORT_OPTIONS.map((o) => (
              <DropItem key={o.value} selected={get("sort") === o.value} onClick={() => update("sort", o.value)}>
                {o.label}
              </DropItem>
            ))}
          </DropBtn>

          {/* Delivery */}
          <DropBtn
            id="delivery"
            label={deliveryLabel ?? "Delivery"}
            active={!!deliveryLabel}
            open={open === "delivery"}
            onToggle={() => setOpen(open === "delivery" ? null : "delivery")}
          >
            {DELIVERY_OPTIONS.map((d) => (
              <DropItem key={d.value} selected={get("delivery") === d.value} onClick={() => toggle("delivery", d.value)}>
                {d.label}
              </DropItem>
            ))}
          </DropBtn>

          {/* Rating */}
          <DropBtn
            id="rating"
            label={ratingActive ? `★ ${RATING_OPTIONS.find(r => r.value === ratingActive)?.label ?? ratingActive}` : "Rating"}
            active={!!ratingActive}
            open={open === "rating"}
            onToggle={() => setOpen(open === "rating" ? null : "rating")}
          >
            {RATING_OPTIONS.map((r) => (
              <DropItem key={r.value} selected={get("min_rating") === r.value} onClick={() => toggle("min_rating", r.value)}>
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                {r.label}
              </DropItem>
            ))}
          </DropBtn>

          {/* Budget */}
          <DropBtn
            id="budget"
            label={budgetActive
              ? `₹${get("min_price") || "0"} – ₹${get("max_price") || "∞"}`
              : "Budget"}
            active={budgetActive}
            open={open === "budget"}
            onToggle={() => setOpen(open === "budget" ? null : "budget")}
            panelWidth="w-64"
          >
            <div className="p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500">Budget range (₹)</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && commitBudget()}
                  className="w-full text-sm rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/20 focus:border-[var(--brand-client)]/50 placeholder:text-gray-300"
                />
                <span className="text-gray-300 shrink-0 text-xs">—</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && commitBudget()}
                  className="w-full text-sm rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/20 focus:border-[var(--brand-client)]/50 placeholder:text-gray-300"
                />
              </div>
              <button
                onClick={commitBudget}
                className="w-full bg-[var(--brand-client)] text-white text-sm font-semibold py-2 rounded-xl hover:bg-sky-600 transition-colors"
              >
                Apply
              </button>
            </div>
          </DropBtn>

          {/* Clear all */}
          {activeCount > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              Clear ({activeCount})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DropBtn({
  label, active, open, onToggle, children, panelWidth = "w-48",
}: {
  label: string; active: boolean; open: boolean; onToggle: () => void;
  children: React.ReactNode; panelWidth?: string;
}) {
  return (
    <div className="relative shrink-0">
      <button
        onClick={onToggle}
        className={cn(
          "flex items-center gap-1.5 h-9 px-4 rounded-full border text-[13px] font-semibold transition-all whitespace-nowrap",
          active
            ? "border-[var(--brand-client)] text-[var(--brand-client)] bg-[var(--brand-client)]/8 shadow-sm"
            : "border-gray-200 text-gray-600 bg-white hover:border-gray-300 hover:shadow-sm"
        )}
      >
        {label}
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform shrink-0 opacity-60", open && "rotate-180")} />
      </button>
      {open && (
        <div className={cn(
          "absolute left-0 top-full mt-2 bg-white rounded-2xl border border-gray-100 shadow-2xl shadow-black/8 z-30 overflow-hidden",
          panelWidth
        )}>
          {children}
        </div>
      )}
    </div>
  );
}

function DropItem({
  children, selected, onClick,
}: {
  children: React.ReactNode; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 text-left px-4 py-2.5 text-sm transition-colors",
        selected
          ? "bg-[var(--brand-client)]/8 text-[var(--brand-client)] font-semibold"
          : "text-gray-700 hover:bg-gray-50"
      )}
    >
      {children}
    </button>
  );
}

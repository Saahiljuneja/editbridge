"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  BookOpen,
  ArrowRight,
  LifeBuoy,
  FileText,
  IndianRupee,
  ShoppingBag,
  AlertTriangle,
  UserCheck,
  Copyright,
  Shield,
  HelpCircle,
} from "lucide-react";

// Mapping Lucide icons dynamically
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  IndianRupee,
  ShoppingBag,
  AlertTriangle,
  UserCheck,
  Copyright,
  Shield,
  HelpCircle,
};

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
}

interface PopularArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  readTime: string | null;
  categorySlug: string;
}

export function HelpCenterClient({
  categories,
  popularArticles,
}: {
  categories: Category[];
  popularArticles: PopularArticle[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/help/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();
        setSearchResults(data.articles || []);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Handle clicking outside to close search dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF9FC] text-gray-800 pb-20">
      {/* Hero Header Section */}
      <section className="relative bg-gradient-to-br from-[#1e40af]/10 via-[#FAF9FC] to-[#FAF9FC] border-b border-gray-150 py-20 px-6">
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(#e5e7eb 1.2px, transparent 1.2px)", backgroundSize: "28px 28px" }} />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-[#1e40af]/10 border border-[#1e40af]/20 text-[#1e40af] px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider mb-6"
          >
            <LifeBuoy className="w-3.5 h-3.5" /> Support Hub
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight mb-4"
          >
            How can we help you today?
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-gray-500 text-lg max-w-xl mx-auto mb-10"
          >
            Search our platform policies, guide articles, and billing documentation below.
          </motion.p>

          {/* Search container */}
          <div ref={dropdownRef} className="relative max-w-2xl mx-auto z-55">
            <div className="flex items-center bg-white border border-gray-250 rounded-2xl p-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.04)] hover:border-gray-300 transition-colors">
              <Search className="w-5.5 h-5.5 text-gray-400 ml-4 shrink-0" />
              <input
                type="text"
                placeholder="Search articles, payments, dispute rules..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                className="flex-1 text-base text-gray-800 placeholder-gray-400 outline-none bg-transparent py-3 px-3 min-w-0"
              />
            </div>

            {/* Live Search dropdown */}
            <AnimatePresence>
              {showDropdown && (searchQuery.trim() !== "") && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden text-left z-50 max-h-96 overflow-y-auto"
                >
                  {isLoading ? (
                    <div className="p-6 text-center text-sm text-gray-400 flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#1e40af] border-t-transparent rounded-full animate-spin" />
                      Searching...
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {searchResults.map((item) => (
                        <Link
                          key={item.id}
                          href={`/help/article/${item.slug}`}
                          className="block p-4 hover:bg-blue-50/50 transition-colors"
                        >
                          <p className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#1e40af]" />
                            {item.title}
                          </p>
                          {item.excerpt && (
                            <p className="text-xs text-gray-400 mt-1 line-clamp-1">{item.excerpt}</p>
                          )}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-sm text-gray-400">
                      No articles found matching &quot;{searchQuery}&quot;
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Main Grid Content */}
      <main className="max-w-6xl mx-auto px-6 mt-16 grid lg:grid-cols-3 gap-10">
        {/* Categories grid (Spans 2 columns) */}
        <section className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-gray-950 tracking-tight flex items-center gap-2 mb-2">
            Browse by Category
          </h2>
          <div className="grid md:grid-cols-2 gap-5">
            {categories.map((cat, ci) => {
              const IconComponent = cat.icon ? ICON_MAP[cat.icon] : HelpCircle;
              return (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + ci * 0.04, duration: 0.5 }}
                  whileHover={{ y: -3 }}
                  className="bg-white border border-gray-150/70 rounded-2xl p-6 transition-all duration-200 group flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-[#1e40af]/8 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                      {IconComponent && <IconComponent className="w-5 h-5 text-[#1e40af]" />}
                    </div>
                    <h3 className="font-bold text-gray-900 text-base mb-1.5">{cat.name}</h3>
                    <p className="text-gray-400 text-xs leading-relaxed">{cat.description}</p>
                  </div>
                  <div className="mt-5 pt-4 border-t border-gray-50 flex items-center justify-between">
                    <Link
                      href={`/help/${cat.slug}`}
                      className="text-xs font-semibold text-[#1e40af] hover:underline inline-flex items-center gap-1"
                    >
                      View Articles <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Popular Articles Sidebar */}
        <section className="space-y-6">
          <div className="bg-white border border-gray-150/70 rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-950 tracking-tight flex items-center gap-2 mb-4">
              <BookOpen className="w-4 h-4 text-[#1e40af]" /> Popular Policies
            </h2>
            <div className="divide-y divide-gray-100">
              {popularArticles.map((art, ai) => (
                <motion.div
                  key={art.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 + ai * 0.05 }}
                  className="py-3.5 first:pt-0 last:pb-0"
                >
                  <Link
                    href={`/help/article/${art.slug}`}
                    className="font-medium text-gray-700 hover:text-[#1e40af] hover:underline text-sm block leading-snug mb-1"
                  >
                    {art.title}
                  </Link>
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider bg-gray-50 px-2 py-0.5 rounded-md">
                    {art.categorySlug.replace("-", " ")}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Need help CTA */}
          <div className="bg-gradient-to-br from-[#1e40af] to-blue-800 rounded-2xl p-6 text-white shadow-sm flex flex-col justify-between h-52">
            <div>
              <p className="font-bold text-base mb-1">Still need assistance?</p>
              <p className="text-xs text-blue-100 leading-relaxed">
                If you cannot find answers in our policy center, our verification or dispute support agents are online.
              </p>
            </div>
            <Link
              href="/contact"
              className="bg-white hover:bg-blue-50 text-slate-900 text-xs font-bold text-center py-3 px-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              Contact Support Agent <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

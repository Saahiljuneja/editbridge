"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EditorCard } from "@/components/editor/editor-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, Sparkles, RotateCcw } from "lucide-react";

interface Match {
  id: string;
  name: string | null;
  displayName?: string | null;
  title?: string | null;
  image: string | null;
  bio: string | null;
  skills: string[];
  minPrice: number | null;
  minDelivery: number | null;
  avgRating: number | null;
  reviewCount: number;
  totalOrders: number;
  isAvailable?: boolean;
  onTimeRate: number | null;
  verifiedPortfolioCount?: number;
  matchScore: number;
  matchReason: string;
}

interface MatchResult {
  matches: Match[];
  categoryName: string;
  categorySlug: string;
  browseQuery: string;
}

export function FindEditorResultsClient() {
  const router = useRouter();
  const [result, setResult] = useState<MatchResult | null | undefined>(undefined);

  useEffect(() => {
    const raw = sessionStorage.getItem("find-editor-result");
    if (!raw) {
      router.replace("/find-editor");
      return;
    }
    try {
      setResult(JSON.parse(raw));
    } catch {
      router.replace("/find-editor");
    }
  }, [router]);

  if (result === undefined) {
    return <div className="min-h-screen bg-gray-50" />;
  }
  if (result === null) return null;

  const { matches, categoryName, categorySlug, browseQuery } = result;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="px-8 py-6">
        <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
          <div>
            <p className="text-xs font-bold text-[var(--brand-client)] uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Your matches
            </p>
            <h1 className="text-2xl font-bold text-gray-900">
              Top {categoryName.toLowerCase()} for you
            </h1>
          </div>
          <Link
            href="/find-editor"
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Retake quiz
          </Link>
        </div>

        {matches.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-dashed border-gray-200 bg-white">
            <p className="text-gray-500 mb-4">
              We couldn't find an editor in this category just yet.
            </p>
            <Link href="/browse" className={cn(buttonVariants(), "bg-[var(--brand-client)]")}>
              Browse all editors
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
            {matches.map((m) => (
              <div key={m.id} className="flex flex-col gap-2.5">
                <div className="rounded-xl bg-[var(--brand-client)]/6 border border-[var(--brand-client)]/15 px-3.5 py-2.5">
                  <p className="text-xs text-[var(--brand-client)] font-medium leading-relaxed">{m.matchReason}</p>
                </div>
                <EditorCard
                  id={m.id}
                  name={m.name}
                  displayName={m.displayName}
                  title={m.title}
                  image={m.image}
                  bio={m.bio}
                  skills={m.skills}
                  minPrice={m.minPrice}
                  minDelivery={m.minDelivery}
                  avgRating={m.avgRating}
                  reviewCount={m.reviewCount}
                  totalOrders={m.totalOrders}
                  isAvailable={m.isAvailable}
                  onTimeRate={m.onTimeRate}
                  verifiedPortfolioCount={m.verifiedPortfolioCount}
                />
                <Link
                  href={`/editor/${m.id}`}
                  className={cn(buttonVariants({ size: "sm" }), "bg-[#7c6ff7] hover:opacity-90 w-full justify-center")}
                >
                  Book now
                </Link>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6 border-t border-gray-200">
          <Link
            href={`/editors/${categorySlug}`}
            className="flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-client)] hover:underline"
          >
            See all {categoryName.toLowerCase()} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <span className="hidden sm:inline text-gray-300">·</span>
          <Link
            href={`/browse?${browseQuery}`}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Browse with full filters <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
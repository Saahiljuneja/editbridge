import Link from "next/link";
import { Star, Zap } from "lucide-react";
import { cn, displayNameFromFull, formatCurrency } from "@/lib/utils";
import { SaveEditorButton } from "@/components/client/save-editor-button";
import { CompareToggle } from "@/components/browse/compare-toggle";
import { PortfolioPreview } from "@/components/common/portfolio-preview";
import { FRAME_STYLES, type FrameKey } from "@/lib/xp-shop-config";

export interface EditorCardProps {
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
  activeFrame?: string | null;
  hasHighlight?: boolean;
}

const GRADIENTS = [
  ["#0EA5E9", "#6366F1"],
  ["#6366F1", "#8B5CF6"],
  ["#10B981", "#0EA5E9"],
  ["#F43F5E", "#EC4899"],
  ["#F97316", "#FBBF24"],
  ["#06B6D4", "#3B82F6"],
];

function cardGradient(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return GRADIENTS[Math.abs(h) % GRADIENTS.length];
}

function parseNiches(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p : [raw]; } catch { return [raw]; }
}

function formatReviewCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k+`;
  return `${n}`;
}

export function EditorCard({
  id, name, displayName, title, image, bio, niche, location,
  skills, minPrice, minDelivery, avgRating, reviewCount, totalOrders, isAvailable,
  isFeatured, thumbnailUrl, videoUrl, activeFrame, hasHighlight,
}: EditorCardProps) {
  const shownName = displayName || displayNameFromFull(name);
  const initials = shownName.slice(0, 2).toUpperCase();
  const [c1, c2] = cardGradient(id);
  const niches = parseNiches(niche);
  const cardTitle = title || niches[0] || skills[0] || "Video Editor";
  const hasMedia = !!(thumbnailUrl || videoUrl);

  return (
    <div className={cn(
      "group relative bg-white rounded-xl border flex flex-col overflow-hidden transition-all duration-200",
      "hover:shadow-xl hover:-translate-y-1",
      hasHighlight
        ? "border-sky-300 shadow-[0_0_18px_rgba(14,165,233,0.18)] ring-1 ring-sky-100"
        : "border-gray-200 shadow-sm"
    )}>

      {/* ── Thumbnail / media area ── */}
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-gray-50 shrink-0">
        {hasMedia ? (
          <PortfolioPreview
            videoUrl={videoUrl ?? null}
            thumbnailUrl={thumbnailUrl ?? null}
            altText={shownName}
          />
        ) : (
          /* Gradient placeholder with large initials */
          <div
            className="w-full h-full flex items-center justify-center relative"
            style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
          >
            <div className="absolute inset-0">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-white/10 translate-y-1/2 -translate-x-1/2" />
            </div>
            <span className="text-white/25 text-8xl font-black select-none relative z-10">{initials}</span>
          </div>
        )}

        {/* Overlays */}
        <div className="absolute top-2.5 left-2.5 z-10">
          <CompareToggle editorId={id} />
        </div>
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
          {isFeatured && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/90 text-white backdrop-blur-sm shadow-sm">
              <Star className="w-2.5 h-2.5 fill-white text-white" /> Featured
            </span>
          )}
          <SaveEditorButton
            editorId={id}
            editorName={shownName}
            editorImage={image}
            avgRating={avgRating}
            totalOrders={totalOrders}
          />
        </div>

        {/* Availability dot */}
        {isAvailable !== false && (
          <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-semibold text-white">Available</span>
          </div>
        )}
      </div>

      {/* ── Card body ── */}
      <Link href={`/editor/${id}`} className="flex flex-col flex-1 p-3 pt-2.5">
        {/* Seller row: avatar + name */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 border-2 border-white shadow-sm flex items-center justify-center text-white text-xs font-bold"
            style={{
              background: `linear-gradient(135deg, ${c1}, ${c2})`,
              ...(activeFrame && FRAME_STYLES[activeFrame as FrameKey]
                ? { boxShadow: FRAME_STYLES[activeFrame as FrameKey] }
                : {}),
            }}
          >
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt={shownName} className="w-full h-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <p className="text-sm font-semibold text-gray-900 truncate flex-1">{shownName}</p>
          {totalOrders >= 10 && (
            <span className="shrink-0 text-[10px] font-bold text-amber-500">★★</span>
          )}
        </div>

        {/* Gig title */}
        <p className="text-sm text-gray-700 leading-snug line-clamp-2 mb-3 flex-1">{cardTitle}</p>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-2.5">
          {avgRating !== null ? (
            <>
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="text-sm font-bold text-gray-900">{avgRating}</span>
              <span className="text-xs text-gray-400 font-medium">({formatReviewCount(reviewCount)})</span>
            </>
          ) : (
            <span className="flex items-center gap-1 text-xs text-[var(--brand-client)] font-medium">
              <Zap className="w-3 h-3" /> New
            </span>
          )}
        </div>

        {/* Price */}
        <div className="border-t border-gray-100 pt-2.5 flex items-center justify-between">
          {minPrice !== null ? (
            <p className="text-sm text-gray-900">
              From <span className="font-bold">{formatCurrency(minPrice)}</span>
            </p>
          ) : (
            <p className="text-sm font-semibold text-[var(--brand-client)]">Free consultation</p>
          )}
          {minDelivery != null && (
            <span className="text-[11px] text-gray-400">{minDelivery}d delivery</span>
          )}
        </div>
      </Link>
    </div>
  );
}

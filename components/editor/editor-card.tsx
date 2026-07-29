import Link from "next/link";
import { Star, Clock, MapPin, ShieldCheck, Zap } from "lucide-react";
import { cn, displayNameFromFull, formatCurrency } from "@/lib/utils";
import { SaveEditorButton } from "@/components/client/save-editor-button";
import { CompareToggle } from "@/components/browse/compare-toggle";
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

export function EditorCard({
  id, name, displayName, title, image, bio, niche, location,
  skills, minPrice, minDelivery, avgRating, reviewCount, totalOrders, isAvailable,
  onTimeRate, verifiedPortfolioCount, isFeatured, thumbnailUrl, videoUrl, activeFrame, hasHighlight,
}: EditorCardProps) {
  const shownName = displayName || displayNameFromFull(name);
  const initials = shownName.slice(0, 2).toUpperCase();
  const [c1, c2] = cardGradient(id);
  const niches = parseNiches(niche);
  const specialty = title || niches[0] || skills[0] || "Video Editor";
  const filledStars = avgRating !== null ? Math.round(avgRating) : 0;

  return (
    <Link
      href={`/editor/${id}`}
      className={cn(
        "group relative bg-white rounded-2xl border flex flex-col overflow-hidden transition-all duration-200",
        "hover:shadow-lg hover:-translate-y-0.5",
        hasHighlight
          ? "border-sky-300 shadow-[0_0_18px_rgba(14,165,233,0.18)] ring-1 ring-sky-100"
          : "border-gray-100 shadow-sm"
      )}
    >
      {/* ── Header: thumbnail if available, gradient banner if not ── */}
      {thumbnailUrl ? (
        <div className="relative w-full aspect-[16/9] overflow-hidden shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnailUrl}
            alt={shownName}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
          {/* dark gradient at bottom for legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          <div className="absolute top-2.5 left-2.5 z-10">
            <CompareToggle editorId={id} />
          </div>
          <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
            {isFeatured && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50/90 text-amber-600 border border-amber-200 backdrop-blur-sm">
                <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" /> Featured
              </span>
            )}
            <SaveEditorButton editorId={id} editorName={shownName} editorImage={image} avgRating={avgRating} totalOrders={totalOrders} />
          </div>
        </div>
      ) : (
        /* Gradient banner — no blank gray box */
        <div
          className="relative w-full h-24 shrink-0 flex items-end px-4 pb-0"
          style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
        >
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
          <div className="absolute top-1/2 left-1/3 w-10 h-10 rounded-full bg-white/8" />
          <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
            {isFeatured && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30 backdrop-blur-sm">
                <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" /> Featured
              </span>
            )}
            <SaveEditorButton editorId={id} editorName={shownName} editorImage={image} avgRating={avgRating} totalOrders={totalOrders} />
          </div>
          <div className="absolute top-2.5 left-2.5 z-10">
            <CompareToggle editorId={id} />
          </div>
        </div>
      )}

      {/* ── Body ── */}
      <div className="flex flex-col flex-1 p-4">
        {/* Avatar row — floats up over the header */}
        <div className="flex items-end gap-3 -mt-8 mb-3">
          <div className="relative shrink-0">
            <div
              className={cn(
                "w-14 h-14 rounded-xl border-2 border-white shadow-md overflow-hidden flex items-center justify-center text-white text-base font-bold"
              )}
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
            {isAvailable !== false && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
            )}
          </div>
          {/* Availability + trust */}
          <div className="pb-1 flex items-center gap-1.5 flex-wrap">
            {isAvailable !== false ? (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
                Available
              </span>
            ) : (
              <span className="text-[10px] font-medium text-gray-400 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">
                Busy
              </span>
            )}
            {(verifiedPortfolioCount ?? 0) > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-100 rounded-full px-1.5 py-0.5">
                <ShieldCheck className="w-2.5 h-2.5" /> Verified
              </span>
            )}
          </div>
        </div>

        {/* Name + specialty */}
        <p className="font-bold text-gray-900 text-base leading-snug truncate">{shownName}</p>
        <p className="text-xs text-gray-500 mt-0.5 truncate mb-2.5">{specialty}</p>

        {/* Rating */}
        <div className="flex items-center gap-1.5 mb-3">
          {avgRating !== null ? (
            <>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={cn("w-3 h-3", i < filledStars ? "fill-amber-400 text-amber-400" : "fill-gray-100 text-gray-200")} />
                ))}
              </div>
              <span className="text-xs font-bold text-gray-800">{avgRating}</span>
              <span className="text-[10px] text-gray-400">({reviewCount} reviews)</span>
            </>
          ) : totalOrders > 0 ? (
            <span className="text-xs text-gray-400">{totalOrders} orders completed</span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-[var(--brand-client)] font-medium">
              <Zap className="w-3 h-3" /> New editor
            </span>
          )}
        </div>

        {/* Skills */}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {skills.slice(0, 3).map((s) => (
              <span key={s} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
                {s}
              </span>
            ))}
            {skills.length > 3 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-400">
                +{skills.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Bio fallback */}
        {skills.length === 0 && bio && (
          <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 mb-3">{bio}</p>
        )}

        <div className="flex-1" />

        {/* Footer: price + CTA */}
        <div className="border-t border-gray-50 pt-3 mt-1 flex items-center justify-between gap-2">
          <div>
            {minPrice !== null ? (
              <>
                <p className="text-[10px] text-gray-400 leading-none mb-0.5">Starting from</p>
                <p className="text-base font-black text-gray-900">{formatCurrency(minPrice)}</p>
              </>
            ) : (
              <p className="text-sm font-semibold text-[var(--brand-client)]">Free consultation</p>
            )}
            {minDelivery != null && (
              <span className="flex items-center gap-0.5 text-[10px] text-gray-400 mt-0.5">
                <Clock className="w-2.5 h-2.5" /> {minDelivery}d delivery
              </span>
            )}
            {!minDelivery && location && (
              <span className="flex items-center gap-0.5 text-[10px] text-gray-400 mt-0.5">
                <MapPin className="w-2.5 h-2.5" /> {location}
              </span>
            )}
          </div>
          <span
            className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[var(--brand-client)] group-hover:bg-sky-600 transition-colors"
          >
            Hire Now
          </span>
        </div>
      </div>
    </Link>
  );
}

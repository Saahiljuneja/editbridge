import Link from "next/link";
import { Star, Clock, CheckCircle2, MapPin, Timer, ShieldCheck, Zap } from "lucide-react";
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

const AVATAR_GRADIENTS = [
  "from-sky-500 to-blue-600",
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-orange-500 to-amber-600",
  "from-cyan-500 to-blue-600",
];

function avatarGradient(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
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
  const gradient = avatarGradient(id);
  const niches = parseNiches(niche);
  const filledStars = avgRating !== null ? Math.round(avgRating) : 0;
  const hasMedia = !!(thumbnailUrl || videoUrl);

  return (
    <div className={cn(
      "group relative bg-white rounded-2xl border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden",
      hasHighlight
        ? "border-sky-300 ring-2 ring-sky-100/60 shadow-[0_0_18px_rgba(14,165,233,0.18)]"
        : "border-gray-100"
    )}>

      {/* Portfolio thumbnail — only when actual media exists */}
      {hasMedia && (
        <div className="relative aspect-video w-full bg-gray-50 border-b border-gray-100 overflow-hidden shrink-0">
          <PortfolioPreview videoUrl={videoUrl ?? null} thumbnailUrl={thumbnailUrl ?? null} altText={shownName} />
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
      )}

      {/* Card body */}
      <div className="p-4 flex-1 flex flex-col">

        {/* Header row: avatar + name + badges (no-media cards show compare/save here) */}
        <div className="flex items-start gap-3 mb-3">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div
              className={cn("w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm overflow-hidden", gradient)}
              style={activeFrame && FRAME_STYLES[activeFrame as FrameKey] ? { boxShadow: FRAME_STYLES[activeFrame as FrameKey] } : undefined}
            >
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt={shownName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-base font-bold">{initials}</span>
              )}
            </div>
            {isAvailable !== false && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-white" />
            )}
          </div>

          {/* Identity */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <p className="font-bold text-gray-900 text-sm leading-tight truncate">{shownName}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {title || niches[0] || skills[0] || "Video Editor"}
                </p>
              </div>
              {/* Show compare + save here when no thumbnail */}
              {!hasMedia && (
                <div className="flex items-center gap-1 shrink-0 ml-1">
                  {isFeatured && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
                      <Star className="w-2 h-2 fill-amber-500 text-amber-500" />
                    </span>
                  )}
                  <SaveEditorButton editorId={id} editorName={shownName} editorImage={image} avgRating={avgRating} totalOrders={totalOrders} />
                  <CompareToggle editorId={id} />
                </div>
              )}
            </div>

            {/* Rating */}
            <div className="flex items-center gap-1 mt-1.5">
              {avgRating !== null ? (
                <>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={cn("w-3 h-3", i < filledStars ? "fill-amber-400 text-amber-400" : "text-gray-200 fill-gray-100")} />
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-gray-700">{avgRating}</span>
                  <span className="text-[10px] text-gray-400">({reviewCount})</span>
                </>
              ) : totalOrders > 0 ? (
                <span className="text-[10px] text-emerald-600 font-medium">{totalOrders} orders completed</span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-[var(--brand-client)] font-medium">
                  <Zap className="w-2.5 h-2.5" /> New
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Trust badges */}
        {(onTimeRate != null || (verifiedPortfolioCount ?? 0) > 0) && (
          <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
            {onTimeRate != null && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-1.5 py-0.5">
                <Timer className="w-2.5 h-2.5" /> {onTimeRate}% on-time
              </span>
            )}
            {(verifiedPortfolioCount ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-100 rounded-full px-1.5 py-0.5">
                <ShieldCheck className="w-2.5 h-2.5" /> {verifiedPortfolioCount} verified works
              </span>
            )}
          </div>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {skills.slice(0, 3).map((skill) => (
              <span key={skill} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
                {skill}
              </span>
            ))}
            {skills.length > 3 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-400">
                +{skills.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Bio — only if skills are absent to avoid clutter */}
        {skills.length === 0 && bio && (
          <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 mb-3">{bio}</p>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer */}
        <div className="border-t border-gray-50 pt-3 mt-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            {minPrice !== null ? (
              <p className="text-xs text-gray-400 leading-tight">
                From <span className="text-sm font-bold text-gray-900">{formatCurrency(minPrice)}</span>
              </p>
            ) : (
              <p className="text-xs text-[var(--brand-client)] font-medium">Free consultation</p>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              {minDelivery != null && (
                <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                  <Clock className="w-3 h-3" /> {minDelivery}d delivery
                </span>
              )}
              {totalOrders > 0 && minDelivery == null && (
                <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                  <CheckCircle2 className="w-3 h-3 text-green-500" /> {totalOrders} orders
                </span>
              )}
              {location && !minDelivery && (
                <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                  <MapPin className="w-3 h-3" /> {location}
                </span>
              )}
            </div>
          </div>
          <Link
            href={`/editor/${id}`}
            className="shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[var(--brand-client)] hover:bg-sky-600 transition-colors"
          >
            View Profile
          </Link>
        </div>
      </div>
    </div>
  );
}

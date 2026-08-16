import Link from "next/link";
import { Star, Clock, CheckCircle2, MapPin, Timer, ShieldCheck } from "lucide-react";
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
  "from-blue-800 to-blue-600",
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

  return (
    <div className={cn(
      "group relative bg-[#ffffff] rounded-[24px] p-3 border border-neutral-200/50 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden",
      hasHighlight && "ring-2 ring-[#7C3AED]/20 border-[#7C3AED]/40 shadow-[0_0_20px_rgba(124,58,237,0.1)]"
    )}>
      {/* Visual Thumbnail Preview (16:9 ratio, rounded-2xl) */}
      <div className="relative aspect-video w-full bg-neutral-50 rounded-[18px] overflow-hidden flex items-center justify-center shrink-0">
        <PortfolioPreview videoUrl={videoUrl ?? null} thumbnailUrl={thumbnailUrl ?? null} altText={shownName} />

        {/* Compare checkbox overlay */}
        <div className="absolute top-2.5 left-2.5 z-10">
          <CompareToggle editorId={id} />
        </div>

        {/* Featured badge + save button overlay */}
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
          {isFeatured && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-extrabold bg-[#ffffff] text-amber-600 border border-neutral-200/30 shadow-sm">
              <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" /> Featured
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
      </div>

      {/* Details section */}
      <div className="pt-4 px-2 pb-0 flex-1 flex flex-col">
        <div className="flex items-start gap-3 mb-3">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div
              className={cn("w-12 h-12 rounded-[14px] bg-gradient-to-br flex items-center justify-center shadow-sm overflow-hidden", gradient)}
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
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
            )}
          </div>

          {/* Identity */}
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-neutral-900 text-[14px] leading-tight truncate">{shownName}</p>
            {title ? (
              <p className="text-[11px] text-neutral-400 font-semibold mt-0.5 truncate">{title}</p>
            ) : niches[0] ? (
              <p className="text-[11px] text-neutral-400 font-semibold mt-0.5 truncate">{niches[0]}</p>
            ) : skills[0] ? (
              <p className="text-[11px] text-neutral-400 font-semibold mt-0.5 truncate">{skills[0]}</p>
            ) : null}
            {/* Rating */}
            <div className="flex items-center gap-1 mt-1">
              {avgRating !== null ? (
                <>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={cn("w-2.5 h-2.5", i < filledStars ? "fill-amber-400 text-amber-400" : "text-neutral-200 fill-neutral-100")} />
                    ))}
                  </div>
                  <span className="text-[11px] font-bold text-neutral-700">{avgRating}</span>
                  <span className="text-[9px] text-neutral-400 font-semibold">({reviewCount})</span>
                </>
              ) : (
                <span className="text-[9px] text-neutral-400 font-semibold">New editor</span>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {bio ? (
          <p className="text-xs text-neutral-400 leading-relaxed line-clamp-2 mb-3.5 px-0.5">{bio}</p>
        ) : (
          <div className="mb-3.5" />
        )}

        {/* Niche & Skill chips */}
        <div className="flex flex-wrap gap-1 mb-3">
          {niches.slice(0, 1).map((n) => (
            <span key={n} className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-[#f3f4f6] text-neutral-500 border border-neutral-200/50">
              {n}
            </span>
          ))}
          {skills.slice(0, 2).map((skill) => (
            <span key={skill} className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#f3f4f6] text-neutral-500 border border-neutral-200/50">
              {skill}
            </span>
          ))}
          {skills.length + niches.length > 3 && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-neutral-50 text-neutral-400 border border-neutral-100">
              +{skills.length + niches.length - 3}
            </span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-neutral-100 mx-2" />

      {/* Footer */}
      <div className="p-3 pb-2 flex items-center justify-between gap-3 mt-auto">
        <div className="min-w-0">
          {minPrice !== null ? (
            <p className="text-[10px] text-neutral-400 font-semibold leading-tight">
              From <span className="text-xs font-black text-neutral-900">{formatCurrency(minPrice)}</span>
            </p>
          ) : (
            <p className="text-[10px] text-neutral-400 font-semibold">No packages yet</p>
          )}
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {minDelivery != null && (
              <span className="flex items-center gap-0.5 text-[9px] text-neutral-400 font-bold">
                <Clock className="w-2.5 h-2.5" /> {minDelivery}d
              </span>
            )}
            {totalOrders > 0 && (
              <span className="flex items-center gap-0.5 text-[9px] text-neutral-400 font-bold">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" /> {totalOrders} orders
              </span>
            )}
            {location && (
              <span className="flex items-center gap-0.5 text-[9px] text-neutral-400 font-bold">
                <MapPin className="w-2.5 h-2.5" /> {location}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <Link
            href={`/editor/${id}`}
            className="px-3.5 py-1.5 rounded-xl text-[11px] font-extrabold text-white bg-black hover:bg-neutral-900 transition-colors shadow-sm"
          >
            View Profile
          </Link>
        </div>
      </div>
    </div>
  );
}

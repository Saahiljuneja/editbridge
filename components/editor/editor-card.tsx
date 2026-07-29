import Link from "next/link";
import { Star, Clock, CheckCircle2, MapPin, Timer, ShieldCheck } from "lucide-react";
import { cn, displayNameFromFull, formatCurrency } from "@/lib/utils";
import { SaveEditorButton } from "@/components/client/save-editor-button";
import { CompareToggle } from "@/components/browse/compare-toggle";
import { PortfolioPreview } from "@/components/common/portfolio-preview";

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
  onTimeRate, verifiedPortfolioCount, isFeatured, thumbnailUrl, videoUrl,
}: EditorCardProps) {
  const shownName = displayName || displayNameFromFull(name);
  const initials = shownName.slice(0, 2).toUpperCase();
  const gradient = avatarGradient(id);
  const niches = parseNiches(niche);
  const filledStars = avgRating !== null ? Math.round(avgRating) : 0;

  return (
    <div className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden">
      {/* Visual Thumbnail Preview (16:9 ratio) */}
      <div className="relative aspect-video w-full bg-gray-50 border-b border-gray-100 overflow-hidden flex items-center justify-center shrink-0">
        <PortfolioPreview videoUrl={videoUrl ?? null} thumbnailUrl={thumbnailUrl ?? null} altText={shownName} />

        {/* Compare checkbox overlay */}
        <div className="absolute top-3 left-3 z-10">
          <CompareToggle editorId={id} />
        </div>

        {/* Featured badge + save button overlay */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          {isFeatured && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
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

      {/* Top section */}
      <div className="p-5 pb-0">
        <div className="flex items-start gap-3.5 mb-3">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className={cn("w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm overflow-hidden", gradient)}>
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt={shownName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-lg font-bold">{initials}</span>
              )}
            </div>
            {isAvailable !== false && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-white" />
            )}
          </div>

          {/* Identity */}
          <div className="min-w-0 flex-1 pr-6">
            <p className="font-bold text-gray-900 text-sm leading-tight truncate">{shownName}</p>
            {title ? (
              <p className="text-xs text-gray-500 mt-0.5 truncate">{title}</p>
            ) : niches[0] ? (
              <p className="text-xs text-gray-500 mt-0.5 truncate">{niches[0]}</p>
            ) : skills[0] ? (
              <p className="text-xs text-gray-400 mt-0.5 truncate">{skills[0]}</p>
            ) : null}
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
              ) : (
                <span className="text-[10px] text-gray-400">New editor</span>
              )}
            </div>
            {/* Trust badges — auto-calculated, never self-reported */}
            {(onTimeRate != null || (verifiedPortfolioCount ?? 0) > 0) && (
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {onTimeRate != null && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-1.5 py-0.5">
                    <Timer className="w-2.5 h-2.5" /> {onTimeRate}% on-time
                  </span>
                )}
                {(verifiedPortfolioCount ?? 0) > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-100 rounded-full px-1.5 py-0.5">
                    <ShieldCheck className="w-2.5 h-2.5" /> {verifiedPortfolioCount} verified
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        {bio ? (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">{bio}</p>
        ) : (
          <div className="mb-3" />
        )}

        {/* Niche chips */}
        {niches.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {niches.slice(0, 2).map((n) => (
              <span key={n} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--brand-client)]/8 text-[var(--brand-client)] border border-[var(--brand-client)]/15">
                {n}
              </span>
            ))}
            {niches.length > 2 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-400">+{niches.length - 2}</span>
            )}
          </div>
        )}

        {/* Skills */}
        <div className="flex flex-wrap gap-1 mb-3">
          {skills.slice(0, 3).map((skill) => (
            <span key={skill} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--brand-client)]/8 text-[var(--brand-client)] border border-[var(--brand-client)]/15">
              {skill}
            </span>
          ))}
          {skills.length > 3 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
              +{skills.length - 3}
            </span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-50 mx-5" />

      {/* Footer */}
      <div className="p-4 flex items-center justify-between gap-3 mt-auto">
        <div className="min-w-0">
          {minPrice !== null ? (
            <p className="text-xs text-gray-400 leading-tight">
              From <span className="text-sm font-bold text-gray-900">{formatCurrency(minPrice)}</span>
            </p>
          ) : (
            <p className="text-xs text-gray-400">No packages yet</p>
          )}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {minDelivery != null && (
              <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                <Clock className="w-3 h-3" /> {minDelivery}d
              </span>
            )}
            {totalOrders > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                <CheckCircle2 className="w-3 h-3 text-green-500" /> {totalOrders} orders
              </span>
            )}
            {location && (
              <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                <MapPin className="w-3 h-3" /> {location}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <Link
            href={`/editor/${id}`}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors"
            style={{ background: "var(--brand-client)" }}
          >
            View Profile
          </Link>
        </div>
      </div>
    </div>
  );
}

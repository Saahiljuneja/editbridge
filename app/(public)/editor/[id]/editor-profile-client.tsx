"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  MapPin, Star, CheckCircle2, Clock, TrendingUp, Zap,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Play,
  BadgeCheck, Globe, Briefcase, Award, X, ArrowLeftRight,
  Eye, Share2, Bookmark, Home, Heart,
} from "lucide-react";
import { displayNameFromFull, cn } from "@/lib/utils";
import { getThumbnailUrl, getVideoSource } from "@/lib/portfolio-media";
import { PortfolioVideoPlayer } from "@/components/public/portfolio-video-player";
import { RequestQuoteButton } from "@/components/client/request-quote-button";
import { PackageClickLink } from "@/components/editor/package-click-link";
import { FRAME_STYLES, EDITOR_LEVELS, type FrameKey } from "@/lib/xp-shop-config";
import { TopoBackground } from "@/components/common/topo-background";
import { toast } from "sonner";

interface Package {
  id: string;
  tier: string | null;
  title: string;
  description: string;
  price: number;
  deliveryDays: number;
  revisionCount: number;
  videoLengthLimit: string | null;
  addons: string[];
  softwareUsed: string[];
  includesSourceFiles: boolean;
  includesCommercialRights: boolean;
}

interface PortfolioItem {
  id: string;
  type: string;
  url: string;
  beforeUrl: string | null;
  thumbnailUrl: string | null;
  title: string | null;
  description: string | null;
  category: string | null;
  isFeatured: boolean;
  orderId: string | null;
  likesCount: number;
}

interface Review {
  id: string;
  rating: number;
  text: string | null;
  replyText: string | null;
  createdAt: string;
  reviewerName: string;
  reviewerImage: string | null;
}

interface EditorProfile {
  id: string;
  name: string;
  image: string | null;
  displayName: string | null;
  title: string | null;
  bio: string | null;
  location: string | null;
  experienceLevel: string | null;
  yearsOfExperience: number | null;
  niche: string | null;
  isFeatured: boolean;
  coverImage: string | null;
  featuredVideoUrl: string | null;
  featuredVideoUrls: string[] | null;
  languages: string | null;
  workStyleTags: string | null;
  previousClients: string | null;
  completionRate: number | null;
  totalOrders: number;
  avgResponseTime: number | null;
  kycStatus: string;
  isAvailable: boolean;
  createdAt: string;
  kycApprovedAt?: string | null;
  packages: any[];
  membershipTier: string;
  level: string;
  activeOrdersCount: number;


  skills: string[];
  tools: string[];
  portfolioItems: PortfolioItem[];
  reviews: any[];
  avgRating: number | null;
  reviewCount: number;
  activeFrame: string | null;
  viewCount?: number;
  isBookmarked?: boolean;
  ratingDistribution?: number[];
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-gray-250"}`}
        />
      ))}
    </div>
  );
}

function Avatar({ src, name, size = 80, activeFrame }: { src: string | null; name: string; size?: number; activeFrame?: string | null }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const shadow = activeFrame && FRAME_STYLES[activeFrame as FrameKey] ? FRAME_STYLES[activeFrame as FrameKey] : undefined;
  if (src) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} className="rounded-full object-cover"
      style={{ width: size, height: size, boxShadow: shadow }}
      onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
  );
  return (
    <div className="rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.35, boxShadow: shadow }}>
      {initials}
    </div>
  );
}

const ADDON_DISPLAY: Record<string, string> = {
  color_grading: "Color Grading", color_correction: "Color Correction",
  sound_design: "Sound Design", audio_cleanup: "Audio Cleanup",
  background_music: "Background Music", captions: "Captions / Subtitles",
  thumbnail: "Thumbnail Design", motion_graphics: "Motion Graphics",
  intro_outro: "Intro / Outro", lower_thirds: "Lower Thirds",
  social_media_cuts: "Social Media Cuts", speed_ramps: "Speed Ramps",
  green_screen: "Green Screen Removal",
};

function PackageCard({ pkg, editorId, isAvailable, isHighlighted }: { pkg: Package; editorId: string; isAvailable: boolean; isHighlighted?: boolean }) {
  const price = (pkg.price / 100).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
  const features = [
    ...pkg.addons.map(a => ADDON_DISPLAY[a] ?? a.replace(/_/g, " ")),
    ...(pkg.includesSourceFiles ? ["Source files included"] : []),
    ...(pkg.includesCommercialRights ? ["Commercial rights"] : []),
  ];

  return (
    <div className={cn(
      "relative rounded-3xl overflow-hidden border-2 bg-white flex flex-col justify-between transition-all duration-350 h-full hover:-translate-y-1",
      isHighlighted
        ? "border-neutral-900 shadow-2xl shadow-neutral-950/15 md:scale-[1.04] z-10"
        : "border-neutral-200/65 hover:border-neutral-300 hover:shadow-lg"
    )}>
      {/* Most Popular top bar */}
      {isHighlighted && (
        <div className="bg-neutral-900 px-4 py-2.5 flex items-center justify-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-white/90 fill-white/70" />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Most Popular</span>
        </div>
      )}

      {/* Card Header */}
      <div className="p-6 flex-1 flex flex-col">
        {pkg.tier && (
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 mb-1.5 block">{pkg.tier}</span>
        )}
        <h3 className="font-black text-neutral-900 text-base sm:text-lg leading-tight tracking-tight mb-2">{pkg.title}</h3>
        <p className="text-[11.5px] text-neutral-500 font-medium leading-relaxed mb-4 flex-1">{pkg.description}</p>
        <div className="flex items-baseline gap-1 mt-auto pt-3 border-t border-neutral-100/70">
          <span className="text-2xl sm:text-3xl font-black text-neutral-950 leading-none tracking-tight">{price}</span>
          <span className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider">/ project</span>
        </div>
      </div>

      {/* Card Stats / Features */}
      <div className={cn(
        "p-5 flex flex-col gap-3.5 border-t border-b border-neutral-100/80",
        isHighlighted ? "bg-neutral-950/[0.02]" : "bg-neutral-50/50"
      )}>
        {/* Core Stats */}
        <div className="grid grid-cols-2 gap-3 text-[11px] font-bold text-neutral-800">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <span>{pkg.deliveryDays} days</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <span>{pkg.revisionCount === -1 ? "Unlimited" : `${pkg.revisionCount} revs`}</span>
          </div>
        </div>

        {/* Features List */}
        {features.length > 0 && (
          <ul className="space-y-2 mt-2">
            {features.slice(0, 4).map(f => (
              <li key={f} className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                </span>
                <span className="text-[11px] font-semibold text-neutral-600 truncate leading-none">{f}</span>
              </li>
            ))}
            {features.length > 4 && (
              <li className="text-[9px] font-bold text-neutral-400 pl-6">+{features.length - 4} more included</li>
            )}
          </ul>
        )}
      </div>

      {/* Footer / CTA */}
      <div className="p-5">
        {isAvailable ? (
          <PackageClickLink
            href={`/checkout/${pkg.id}`}
            packageId={pkg.id}
            className={cn(
              "block w-full text-center text-xs font-black py-3 rounded-2xl transition-all active:scale-[0.98]",
              isHighlighted
                ? "bg-black hover:bg-neutral-900 text-white shadow-md shadow-neutral-950/20"
                : "bg-neutral-900 hover:bg-black text-white"
            )}
          >
            Hire for {price}
          </PackageClickLink>
        ) : (
          <button disabled className="block w-full text-center bg-neutral-100 text-neutral-400 text-xs font-black py-3 rounded-2xl cursor-not-allowed border border-neutral-200/60">
            Unavailable
          </button>
        )}
      </div>
    </div>  );
}

function ReviewCard({ review }: { review: Review }) {
  const [expanded, setExpanded] = useState(false);
  const long = (review.text?.length ?? 0) > 200;
  return (
    <div className="border border-neutral-100 rounded-3xl p-5 flex flex-col gap-3.5 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-md transition-all">
      <div className="flex items-center gap-3">
        <Avatar src={review.reviewerImage} name={review.reviewerName} size={36} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-neutral-900 truncate">{review.reviewerName}</p>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-0.5">{new Date(review.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</p>
        </div>
        <div className="shrink-0 bg-amber-50/75 border border-amber-100 rounded-xl px-2.5 py-1">
          <Stars rating={review.rating} />
        </div>
      </div>
      {review.text && (
        <div className="px-1">
          <p className={`text-sm text-neutral-600 leading-relaxed font-medium ${!expanded && long ? "line-clamp-3" : ""}`}>
            "{review.text}"
          </p>
          {long && (
            <button onClick={() => setExpanded(e => !e)} className="text-xs font-bold text-brand-primary mt-2 flex items-center gap-0.5">
              {expanded ? <><ChevronUp className="w-3.5 h-3.5" />Less</> : <><ChevronDown className="w-3.5 h-3.5" />Read more</>}
            </button>
          )}
        </div>
      )}
      {review.replyText && (
        <div className="bg-neutral-50/50 rounded-2xl p-4 text-xs text-neutral-600 border-l-4 border-brand-primary/40 font-semibold mt-1">
          <p className="font-extrabold text-neutral-900 mb-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" /> Editor replied:
          </p>
          "{review.replyText}"
        </div>
      )}
    </div>
  );
}

function PortfolioCard({ item, index, onOpen }: { item: PortfolioItem; index: number; onOpen: (index: number) => void }) {
  const [showBefore, setShowBefore] = useState(false);

  const thumb = item.type === "video"
    ? (item.thumbnailUrl || getThumbnailUrl(item.url))
    : null;
  const source = (item.type === "video" ? getVideoSource(item.url) : null) as any;
  const beforeThumb = item.beforeUrl
    ? (getThumbnailUrl(item.beforeUrl) || item.beforeUrl)
    : null;

  return (
    <div className="group bg-white rounded-[22px] border border-neutral-200/55 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col">
      {/* Thumbnail — click opens lightbox */}
      <button
        onClick={() => onOpen(index)}
        className="relative aspect-video w-full block overflow-hidden bg-neutral-50 shrink-0 cursor-pointer"
      >
        {showBefore && beforeThumb ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={beforeThumb} alt="Before" className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300" />
            <div className="absolute inset-0 bg-black/15 group-hover:bg-black/30 transition-colors" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-9 h-9 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
              </div>
            </div>
          </>
        ) : item.type === "video" ? (
          thumb ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb} alt={item.title ?? "Video"} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                <div className="w-9 h-9 rounded-full bg-black/60 flex items-center justify-center">
                  <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                </div>
              </div>
            </>
          ) : source === "direct" ? (
            <>
              <video src={`${item.url}#t=0.1`} preload="metadata" className="w-full h-full object-cover" muted playsInline />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                <div className="w-9 h-9 rounded-full bg-black/60 flex items-center justify-center">
                  <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900 gap-1">
              <Play className="w-7 h-7 text-white/70 group-hover:text-white transition-colors" />
              {source && source !== "direct" && (
                <span className={`text-[8px] font-bold uppercase tracking-wider text-white/50 px-1.5 py-0.5 rounded ${
                  source === "youtube" ? "bg-red-600/60" :
                  source === "vimeo"   ? "bg-brand-primary/60" :
                  "bg-green-600/60"
                }`}>
                  {source === "youtube" ? "YouTube" : source === "vimeo" ? "Vimeo" : "Drive"}
                </span>
              )}
            </div>
          )
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.url} alt={item.title ?? "Portfolio image"} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
        )}

        {/* Featured badge — top left */}
        {item.isFeatured && (
          <span className="absolute top-2 left-2 bg-[#1e40af] text-white rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider z-10 shadow-sm">
            Featured
          </span>
        )}

        {/* Verified badge — top left (only if not featured to avoid overlap) */}
        {item.orderId && !item.isFeatured && (
          <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded-full px-1.5 py-0.5 text-[8px] font-bold text-indigo-700 flex items-center gap-0.5 cursor-help group/vtooltip z-10 shadow-sm">
            <BadgeCheck className="w-2.5 h-2.5" />Verified
            <div className="absolute top-full left-0 mt-1 w-44 hidden group-hover/vtooltip:block bg-gray-900 text-white text-[9px] rounded p-2 leading-normal shadow-md z-30 font-medium normal-case">
              Verified Order: This video was created for an actual completed order on EditBridge.
            </div>
          </span>
        )}

        {/* Before/After toggle — top right */}
        {item.beforeUrl && (
          <button
            onClick={e => { e.stopPropagation(); setShowBefore(s => !s); }}
            className={cn(
              "absolute top-2 right-2 rounded-full px-2 py-0.5 text-[8px] font-bold flex items-center gap-0.5 z-10 shadow-sm transition-all",
              showBefore
                ? "bg-[#1e40af] text-white"
                : "bg-white/90 backdrop-blur-sm text-neutral-700 hover:bg-white"
            )}
          >
            <ArrowLeftRight className="w-2.5 h-2.5" />
            {showBefore ? "After" : "Before"}
          </button>
        )}
      </button>

      {/* Footer */}
      <div className="px-3 pt-2 pb-2.5 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-neutral-800 text-[11px] font-bold leading-tight line-clamp-1">{item.title ?? "Untitled"}</p>
          {item.category && (
            <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded-full">
              {item.category}
            </span>
          )}
        </div>
        {item.likesCount > 0 && (
          <div className="flex items-center gap-1 text-neutral-350 shrink-0 mt-0.5">
            <Heart className="w-3 h-3" />
            <span className="text-[10px] font-bold">{item.likesCount}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function PortfolioGrid({ items, onOpen }: { items: PortfolioItem[]; onOpen: (index: number) => void }) {
  const [showAll, setShowAll] = useState(false);
  const INITIAL = 4;
  if (items.length === 0) return null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {items.map((item, actualIndex) => {
          if (!showAll && actualIndex >= INITIAL) return null;
          return <PortfolioCard key={item.id} item={item} index={actualIndex} onOpen={onOpen} />;
        })}
      </div>
      {items.length > INITIAL && (
        <button
          onClick={() => setShowAll(s => !s)}
          className="w-full py-2.5 rounded-2xl border border-neutral-200 text-[11px] font-bold text-neutral-500 hover:text-black hover:border-neutral-400 transition-colors bg-white"
        >
          {showAll ? "Show less" : `Show all ${items.length} works`}
        </button>
      )}
    </div>
  );
}

function LightboxMedia({ item, editorName, editorVerified }: {
  item: PortfolioItem;
  editorName?: string | null;
  editorVerified?: boolean;
}) {
  const [sliderVal, setSliderVal] = useState(50);
  const hasBA = item.type === "image" && !!item.beforeUrl;
  const isVideo = item.type === "video";

  if (isVideo) {
    return (
      <PortfolioVideoPlayer
        url={item.url}
        thumbnailUrl={item.thumbnailUrl}
        title={item.title}
        editorName={editorName}
        editorVerified={editorVerified}
        aspectRatio="16/9"
        className="w-full"
      />
    );
  }

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ aspectRatio: "16/9" }}>
      {hasBA ? (
        <div className="relative w-full h-full overflow-hidden select-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.url} alt={item.title ?? "After"} className="absolute inset-0 w-full h-full object-contain" />
          <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderVal}%` }}>
            <div className="relative h-full" style={{ width: `${10000 / sliderVal}%` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.beforeUrl!} alt="Before" className="absolute inset-0 w-full h-full object-contain" />
            </div>
          </div>
          <div className="absolute inset-y-0 z-10 flex items-center justify-center" style={{ left: `${sliderVal}%`, transform: "translateX(-50%)" }}>
            <div className="w-0.5 h-full bg-white/80" />
            <div className="absolute w-9 h-9 rounded-full bg-white shadow-lg flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4 text-gray-600" />
            </div>
          </div>
          <span className="absolute bottom-3 left-3 text-[11px] font-bold text-white bg-black/50 px-2 py-0.5 rounded">BEFORE</span>
          <span className="absolute bottom-3 right-3 text-[11px] font-bold text-white bg-black/50 px-2 py-0.5 rounded">AFTER</span>
          <input type="range" min={0} max={100} value={sliderVal} onChange={e => setSliderVal(Number(e.target.value))}
            aria-label="Before/after comparison slider" className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20" />
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.url} alt={item.title ?? "Portfolio image"} className="w-full h-full object-contain" />
      )}
    </div>
  );
}

function PortfolioLightbox({ items, index, onClose, onNavigate, editorName, editorVerified }: {
  items: PortfolioItem[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  editorName?: string | null;
  editorVerified?: boolean;
}) {
  const item = items[index];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && index < items.length - 1) onNavigate(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onNavigate(index - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, items.length, onClose, onNavigate]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 sm:p-8" onClick={onClose}>
      <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 text-white/70 hover:text-white p-2 z-10">
        <X className="w-6 h-6" />
      </button>

      {index > 0 && (
        <button onClick={e => { e.stopPropagation(); onNavigate(index - 1); }} aria-label="Previous item"
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 bg-black/30 hover:bg-black/50 rounded-full transition-colors z-10">
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      {index < items.length - 1 && (
        <button onClick={e => { e.stopPropagation(); onNavigate(index + 1); }} aria-label="Next item"
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 bg-black/30 hover:bg-black/50 rounded-full transition-colors z-10">
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      <div className="max-w-4xl w-full max-h-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
        <LightboxMedia key={item.id} item={item} editorName={editorName} editorVerified={editorVerified} />

        {(item.title || item.description || item.category || item.orderId) && (
          <div className="w-full mt-4 text-white">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              {item.category && (
                <span className="text-xs font-semibold text-indigo-200 bg-indigo-500/20 rounded-full px-2.5 py-0.5">{item.category}</span>
              )}
              {item.orderId && (
                <span className="text-xs font-semibold text-white/90 bg-white/10 rounded-full px-2.5 py-0.5 flex items-center gap-1">
                  <BadgeCheck className="w-3 h-3" />Verified
                </span>
              )}
            </div>
            {item.title && <h3 className="text-base font-semibold">{item.title}</h3>}
            {item.description && <p className="text-sm text-white/70 mt-1 leading-relaxed">{item.description}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tool icon map: known software → abbr label + color theme ──
const TOOL_STYLES: Record<string, { abbr: string; bg: string; text: string; badge: string }> = {
  "premiere pro":       { abbr: "Pr", bg: "bg-indigo-50",  text: "text-indigo-700",  badge: "bg-indigo-600" },
  "after effects":      { abbr: "Ae", bg: "bg-violet-50",  text: "text-violet-700",  badge: "bg-violet-600" },
  "davinci resolve":    { abbr: "DV", bg: "bg-orange-50",  text: "text-orange-700",  badge: "bg-orange-500" },
  "final cut pro":      { abbr: "FC", bg: "bg-sky-50",     text: "text-sky-700",     badge: "bg-sky-500" },
  "capcut":             { abbr: "CC", bg: "bg-rose-50",    text: "text-rose-700",    badge: "bg-rose-500" },
  "avid media composer":{ abbr: "Av", bg: "bg-teal-50",    text: "text-teal-700",    badge: "bg-teal-600" },
  "sony vegas":         { abbr: "SV", bg: "bg-amber-50",   text: "text-amber-700",   badge: "bg-amber-500" },
  "kdenlive":           { abbr: "Kd", bg: "bg-green-50",   text: "text-green-700",   badge: "bg-green-600" },
  "blender":            { abbr: "Bl", bg: "bg-orange-50",  text: "text-orange-700",  badge: "bg-orange-400" },
  "motion":             { abbr: "Mo", bg: "bg-sky-50",     text: "text-sky-700",     badge: "bg-sky-400" },
  "resolve":            { abbr: "DV", bg: "bg-orange-50",  text: "text-orange-700",  badge: "bg-orange-500" },
};

function ToolChip({ tool }: { tool: string }) {
  const key = tool.toLowerCase().replace(/_/g, " ");
  const style = TOOL_STYLES[key];
  if (style) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs rounded-xl px-3 py-1.5 font-bold shadow-sm border border-transparent", style.bg, style.text)}>
        <span className={cn("w-[18px] h-[18px] rounded text-white text-[7px] font-black flex items-center justify-center shrink-0", style.badge)}>
          {style.abbr}
        </span>
        {tool.replace(/_/g, " ")}
      </span>
    );
  }
  return (
    <span className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl px-3.5 py-1.5 font-bold shadow-sm">
      {tool.replace(/_/g, " ")}
    </span>
  );
}

function SectionHeading({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn("text-sm font-black text-neutral-900 uppercase tracking-widest flex items-center gap-2.5", className)}>
      <span className="w-[3px] h-3.5 rounded-full bg-neutral-800 shrink-0" />
      {children}
    </h2>
  );
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMonths = Math.floor(diffMs / (30 * 24 * 60 * 60 * 1050));
    if (diffMonths <= 0) return "recently";
    if (diffMonths === 1) return "1 month ago";
    return `${diffMonths} months ago`;
  } catch {
    return "recently";
  }
}

export function EditorProfileClient({ editor, isLoggedIn }: { editor: EditorProfile; isLoggedIn: boolean }) {
  const [bioExpanded, setBioExpanded] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const thumbnailsRef = useRef<HTMLDivElement>(null);


  // Bookmarking wishlist states
  const [bookmarked, setBookmarked] = useState(editor.isBookmarked ?? false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  // Portfolio category filter states
  const categories = ["All", ...Array.from(new Set(editor.portfolioItems.map(item => item.category).filter(Boolean) as string[]))];
  const [selectedCategory, setSelectedCategory] = useState("All");




  const displayName = editor.displayName || displayNameFromFull(editor.name);
  const workStyleTags: string[] = editor.workStyleTags ? JSON.parse(editor.workStyleTags) : [];
  
  const parseNiches = (nicheStr: string | null): string[] => {
    if (!nicheStr) return [];
    try {
      const parsed = JSON.parse(nicheStr);
      return Array.isArray(parsed) ? parsed : [nicheStr];
    } catch {
      return [nicheStr];
    }
  };
  const niches = parseNiches(editor.niche);

  const languages: { language: string; level: string }[] = editor.languages ? JSON.parse(editor.languages) : [];
  const bioLong = (editor.bio?.length ?? 0) > 300;
  const expLabel = editor.experienceLevel === "entry" ? "Entry level" : editor.experienceLevel === "intermediate" ? "Intermediate" : editor.experienceLevel === "expert" ? "Expert" : null;

  async function handleBookmarkToggle() {
    if (bookmarkLoading) return;
    setBookmarkLoading(true);
    try {
      const res = await fetch("/api/saved-editors", {
        method: bookmarked ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editorId: editor.id }),
      });
      if (res.status === 401) {
        window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      if (res.ok) {
        const nextState = !bookmarked;
        setBookmarked(nextState);
        toast.success(nextState ? "Saved to wishlist!" : "Removed from wishlist");
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    } finally {
      setBookmarkLoading(false);
    }
  }

  const filteredPortfolio = selectedCategory === "All"
    ? editor.portfolioItems
    : editor.portfolioItems.filter(item => item.category === selectedCategory);

  return (
    <div className="relative min-h-screen bg-[#ffffff] pb-12 overflow-hidden">
      {/* Topographic backdrop */}
      <TopoBackground background="#ffffff" strokeColor="#f3f4f6" opacity={0.6} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 pt-8 sm:pt-12">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs sm:text-sm font-extrabold tracking-wide uppercase text-neutral-400 mb-6 select-none">
          <Link href="/" className="hover:text-neutral-900 transition-colors flex items-center">
            <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Link>
          <span className="text-neutral-300 select-none">/</span>
          <Link href="/editors" className="hover:text-neutral-900 transition-colors">
            Editors
          </Link>
          <span className="text-neutral-300 select-none">/</span>
          <span className="text-neutral-900 truncate max-w-[200px] normal-case tracking-normal">
            {displayName}
          </span>
        </nav>

        {/* Premium Profile Header Row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-neutral-200/50 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar & KYC Badge */}
            <div className="relative shrink-0 z-10">
              <div className="ring-4 ring-white rounded-full shadow-lg bg-white">
                <Avatar src={editor.image} name={displayName} size={96} activeFrame={editor.activeFrame} />
              </div>
              {editor.kycStatus === "approved" && (
                <div className="absolute bottom-1 right-1 group/tooltip z-10">
                  <BadgeCheck className="w-6 h-6 text-[#0F6E56] fill-white drop-shadow-sm cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 hidden group-hover/tooltip:block bg-gray-900 text-white text-[10px] rounded-lg p-2.5 text-center leading-relaxed shadow-md z-30 font-medium normal-case">
                    KYC Verified: Government ID and bank details of this editor are verified by EditBridge.
                  </div>
                </div>
              )}
            </div>

            {/* Profile Identity Details */}
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 leading-none tracking-tight">{displayName}</h1>
                {editor.membershipTier && editor.membershipTier !== "hobby" && (
                  <span className={cn(
                    "inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border",
                    editor.membershipTier === "pro" && "bg-neutral-950 text-white border-neutral-800",
                    editor.membershipTier === "agency" && "bg-indigo-600 text-white border-indigo-700",
                    editor.membershipTier === "starter" && "bg-neutral-100 text-neutral-800 border-neutral-200"
                  )}>
                    {editor.membershipTier}
                  </span>
                )}
                {editor.isAvailable ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200/50 rounded-full px-2.5 py-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Available
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-red-700 bg-red-50 border border-red-200/50 rounded-full px-2.5 py-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />Not Accepting Orders
                  </span>
                )}
              </div>
              {editor.title && <p className="text-sm text-neutral-500 font-bold leading-none">{editor.title}</p>}
              
              {/* Trust & Platform Metrics */}
              <div className="flex items-center gap-x-3 gap-y-1.5 flex-wrap text-xs text-neutral-450 font-bold pt-0.5">
                {/* Rating & Reviews */}
                {editor.avgRating ? (
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                    <span className="text-neutral-900 font-extrabold">{editor.avgRating}</span>
                    <span className="text-neutral-400 font-normal">({editor.reviewCount} review{editor.reviewCount !== 1 ? "s" : ""})</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-neutral-400">
                    <Star className="w-3.5 h-3.5 text-neutral-300 shrink-0" />
                    <span className="font-normal text-neutral-400">No reviews yet</span>
                  </div>
                )}
                <span className="text-neutral-200">•</span>

                {/* Level Badge */}
                {(() => {
                  const lvlInfo = EDITOR_LEVELS.find(l => l.name === editor.level);
                  const levelDotColors: Record<string, string> = {
                    level1: "bg-neutral-400",
                    level2: "bg-emerald-400",
                    level3: "bg-blue-500",
                    level4: "bg-amber-500",
                  };
                  const label = lvlInfo?.label ?? (editor.level.charAt(0).toUpperCase() + editor.level.slice(1));
                  const activeDotClass = lvlInfo ? (levelDotColors[editor.level] ?? "bg-neutral-400") : "bg-neutral-400";
                  const currentLevel = lvlInfo?.level ?? 0;
                  return (
                    <div className="flex items-center gap-1.5 text-neutral-700">
                      <span>{label} Level</span>
                      <div className="flex items-center gap-[3px]">
                        {EDITOR_LEVELS.map((l) => (
                          <span
                            key={l.name}
                            className={cn(
                              "w-1.5 h-1.5 rotate-45 transition-colors",
                              l.level <= currentLevel ? activeDotClass : "bg-neutral-200"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })()}
                <span className="text-neutral-200">•</span>

                {/* Active Orders in Queue */}
                <div className="flex items-center gap-1 text-neutral-600">
                  <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span>{editor.activeOrdersCount} order{editor.activeOrdersCount !== 1 ? "s" : ""} in queue</span>
                </div>
              </div>

              {/* Niche Badges */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {niches.map(n => (
                  <span key={n} className="inline-flex items-center gap-1 text-[10px] font-extrabold text-neutral-700 bg-neutral-50 border border-neutral-200/50 rounded-full px-2.5 py-0.5 capitalize">
                    {n}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Action buttons (Merged, Premium Black/Neutral design) */}
          <div className="flex items-center gap-2 self-start md:self-center">


            {/* Bookmark button */}
            <button
              onClick={handleBookmarkToggle}
              disabled={bookmarkLoading}
              className={`inline-flex items-center justify-center border p-2.5 rounded-xl transition-colors shadow-sm ${
                bookmarked
                  ? "bg-black border-black text-white hover:bg-neutral-900"
                  : "bg-white border-neutral-200 hover:bg-neutral-50 text-neutral-700"
              }`}
              title={bookmarked ? "Remove from wishlist" : "Save to wishlist"}
            >
              <Bookmark className={`w-4 h-4 ${bookmarked ? "fill-white text-white" : "text-neutral-450"}`} />
            </button>

            {/* Share button */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success("Profile link copied!");
              }}
              className="inline-flex items-center justify-center bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 p-2.5 rounded-xl transition-colors shadow-sm"
              title="Share profile"
            >
              <Share2 className="w-4 h-4 text-neutral-450" />
            </button>
          </div>
        </div>

        {/* ─── Hero Section: 2-Column Grid Layout ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start mb-8">
          
          {/* Left Column: Media & Core Bio (Borderless flow) */}
          <div className="min-w-0 divide-y divide-neutral-100">
            {/* 1. Featured Videos (Showreel) */}
            {(() => {
              const videos = (editor.featuredVideoUrls && editor.featuredVideoUrls.length > 0)
                ? editor.featuredVideoUrls
                : editor.featuredVideoUrl
                  ? [editor.featuredVideoUrl]
                  : [];
              if (videos.length === 0) return null;
              return (
                <section className="pb-8">
                  <div className="relative">
                    {/* Main Active Player Box Wrapper */}
                    <div className="relative group/player">
                      {/* Video box with clipping */}
                      <div className="relative rounded-2xl overflow-hidden aspect-video bg-neutral-950 shadow-lg border border-neutral-200/50">
                        <PortfolioVideoPlayer
                          url={videos[activeVideoIndex]}
                          title={null}
                          editorName={displayName}
                          editorVerified={editor.kycStatus === "approved"}
                          aspectRatio="16/9"
                          className="w-full h-full"
                          hideBranding={true}
                        />

                        {/* Client Review Translucent Overlay */}
                        {(() => {
                          const review = editor.reviews && editor.reviews.length > 0
                            ? editor.reviews[activeVideoIndex % editor.reviews.length]
                            : null;
                          if (!review) return null;
                          return (
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent p-5 pt-16 text-white pointer-events-none z-10">
                              <p className="text-xs sm:text-sm font-bold italic line-clamp-2 leading-relaxed text-white drop-shadow-sm">
                                “{review.text}”
                              </p>
                              <p className="text-[10px] sm:text-xs text-neutral-300 font-bold mt-2 flex items-center gap-1">
                                Reviewed by {review.reviewerName} {formatRelativeTime(review.createdAt)}
                              </p>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Navigation Arrows for Slider (Placed outside the video container on desktop) */}
                      {videos.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveVideoIndex((prev) => (prev === 0 ? videos.length - 1 : prev - 1));
                            }}
                            className="absolute left-2 sm:left-[-20px] lg:left-[-24px] top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white text-neutral-800 flex items-center justify-center shadow-lg border border-neutral-200/80 hover:bg-neutral-50 active:scale-95 transition-all hover:scale-105 duration-300 opacity-95 hover:opacity-100 cursor-pointer"
                          >
                            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-800" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveVideoIndex((prev) => (prev === videos.length - 1 ? 0 : prev + 1));
                            }}
                            className="absolute right-2 sm:right-[-20px] lg:right-[-24px] top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white text-neutral-800 flex items-center justify-center shadow-lg border border-neutral-200/80 hover:bg-neutral-50 active:scale-95 transition-all hover:scale-105 duration-300 opacity-95 hover:opacity-100 cursor-pointer"
                          >
                            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-800" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Bottom Thumbnail Strip */}
                    {videos.length > 1 && (
                      <div className="relative mt-4 flex items-center group/thumbnails px-1.5">
                        <div 
                          ref={thumbnailsRef}
                          className="flex-1 flex items-center gap-3.5 overflow-x-auto scrollbar-none py-1 scroll-smooth"
                        >
                          {videos.map((url, idx) => {
                            const thumb = getThumbnailUrl(url) || "/images/video-placeholder.png";
                            const isActive = activeVideoIndex === idx;
                            return (
                              <button
                                type="button"
                                key={idx}
                                onClick={() => setActiveVideoIndex(idx)}
                                className={cn(
                                  "relative aspect-video w-[90px] sm:w-[110px] rounded-lg overflow-hidden border-2 transition-all bg-neutral-900 shrink-0 select-none cursor-pointer focus:outline-none",
                                  isActive 
                                    ? "border-black ring-2 ring-black/10 scale-102" 
                                    : "border-neutral-200 hover:border-neutral-400 opacity-70 hover:opacity-100"
                                )}
                              >
                                <img 
                                  src={thumb} 
                                  alt={`Thumbnail ${idx + 1}`} 
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                                  <Play className="w-3.5 h-3.5 text-white drop-shadow-sm fill-white/20" />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              );
            })()}

            {/* 2. About me */}
            {editor.bio && (
              <section className="py-8">
                <SectionHeading className="mb-3">About me</SectionHeading>
                <p className={`text-sm text-neutral-500 leading-relaxed font-medium ${!bioExpanded && bioLong ? "line-clamp-6" : ""}`}>
                  {editor.bio}
                </p>
                {bioLong && (
                  <button onClick={() => setBioExpanded(e => !e)} className="text-xs font-bold text-brand-primary mt-2 hover:text-brand-primary/80 flex items-center gap-0.5">
                    {bioExpanded ? <><ChevronUp className="w-3.5 h-3.5" />Show less</> : <><ChevronDown className="w-3.5 h-3.5" />Read more</>}
                  </button>
                )}
              </section>
            )}
          </div>

          {/* Right Column: Sticky Action Card (Stays as a floating card) */}
          <aside className="space-y-5 lg:sticky lg:top-24">
            <div className="bg-white border border-neutral-200/60 rounded-3xl p-6 shadow-xl shadow-neutral-100/50 space-y-6">
              
              {/* Pricing section */}
              {editor.packages.length > 0 ? (
                <div className="space-y-2.5">
                  <p className="text-[10px] font-extrabold text-neutral-450 uppercase tracking-widest">Pricing</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-neutral-900">
                      {(Math.min(...editor.packages.map(p => p.price)) / 100).toLocaleString("en-IN", {
                        style: "currency", currency: "INR", maximumFractionDigits: 0
                      })}
                    </span>
                    <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider">starting price</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-[10px] font-extrabold text-neutral-455 uppercase tracking-widest">Pricing</p>
                  <p className="text-sm font-extrabold text-neutral-500">Custom quotes only</p>
                </div>
              )}

              {/* Major CTAs */}
              <div className="space-y-2.5">
                {editor.isAvailable ? (
                  <a
                    href="#packages"
                    className="block w-full bg-black hover:bg-neutral-900 text-white text-center text-xs font-black py-3.5 rounded-xl transition-all shadow-md shadow-neutral-950/15 active:scale-[0.98]"
                  >
                    Hire this editor
                  </a>
                ) : (
                  <button
                    disabled
                    className="block w-full bg-neutral-100 text-neutral-400 text-xs font-black py-3.5 rounded-xl cursor-not-allowed border border-neutral-200/50"
                  >
                    Unavailable
                  </button>
                )}

                <div className="relative flex items-center gap-2 py-0.5 select-none">
                  <div className="flex-1 h-px bg-neutral-100" />
                  <span className="text-[10px] text-neutral-400 font-extrabold uppercase tracking-wider">or</span>
                  <div className="flex-1 h-px bg-neutral-100" />
                </div>

                <RequestQuoteButton editorId={editor.id} />
              </div>

              <div className="border-t border-neutral-100/70" />

              {/* Trust Details */}
              <div className="space-y-3.5">
                <p className="text-[10px] font-extrabold text-neutral-455 uppercase tracking-widest">Trust & Details</p>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-neutral-500">
                    <BadgeCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Escrow-protected payment</span>
                  </div>
                  {editor.location && (
                    <div className="flex items-center gap-2 text-xs font-bold text-neutral-500">
                      <MapPin className="w-4 h-4 text-neutral-400 shrink-0" />
                      <span>Located in {editor.location}</span>
                    </div>
                  )}
                  {expLabel && (
                    <div className="flex items-center gap-2 text-xs font-bold text-neutral-500">
                      <Briefcase className="w-4 h-4 text-neutral-400 shrink-0" />
                      <span>{expLabel}{editor.yearsOfExperience ? ` · ${editor.yearsOfExperience} yrs exp` : ""}</span>
                    </div>
                  )}
                  {languages.length > 0 && (
                    <div className="flex items-start gap-2 text-xs font-bold text-neutral-500">
                      <Globe className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                      <span className="leading-snug">
                        Speaks {languages.map(l => l.language).join(", ")}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs font-bold text-neutral-500">
                    <Clock className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span>Member since {new Date(editor.kycApprovedAt || editor.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-neutral-100/70" />

              {/* Platform Metrics */}
              <div className="space-y-3">
                <p className="text-[10px] font-extrabold text-neutral-455 uppercase tracking-widest">Stats</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-neutral-50 rounded-2xl px-3.5 py-3 border border-neutral-100">
                    <p className="text-xl font-black text-neutral-900 leading-none">{editor.totalOrders}</p>
                    <p className="text-[10px] font-bold text-neutral-450 mt-1">Orders done</p>
                  </div>
                  {editor.avgRating ? (
                    <div className="bg-amber-50 rounded-2xl px-3.5 py-3 border border-amber-100">
                      <p className="text-xl font-black text-amber-600 leading-none">{editor.avgRating}</p>
                      <p className="text-[10px] font-bold text-amber-500 mt-1">Avg rating</p>
                    </div>
                  ) : (
                    <div className="bg-neutral-50 rounded-2xl px-3.5 py-3 border border-neutral-100">
                      <p className="text-xl font-black text-neutral-400 leading-none">—</p>
                      <p className="text-[10px] font-bold text-neutral-400 mt-1">Avg rating</p>
                    </div>
                  )}
                  {editor.completionRate !== null && (
                    <div className="bg-emerald-50 rounded-2xl px-3.5 py-3 border border-emerald-100">
                      <p className="text-xl font-black text-emerald-700 leading-none">{editor.completionRate}%</p>
                      <p className="text-[10px] font-bold text-emerald-600/80 mt-1">Completion</p>
                    </div>
                  )}
                  {editor.avgResponseTime !== null && (
                    <div className="bg-sky-50 rounded-2xl px-3.5 py-3 border border-sky-100">
                      <p className="text-xl font-black text-sky-700 leading-none">
                        {editor.avgResponseTime < 60 ? `${editor.avgResponseTime}m` : `${Math.round(editor.avgResponseTime / 60)}h`}
                      </p>
                      <p className="text-[10px] font-bold text-sky-600/80 mt-1">Response</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs font-bold pt-0.5">
                  <span className="text-neutral-450">Profile views</span>
                  <span className="flex items-center gap-1 text-neutral-700 font-extrabold">
                    <Eye className="w-3 h-3 text-neutral-400" />
                    {editor.viewCount?.toLocaleString() ?? 0}
                  </span>
                </div>
              </div>

            </div>
          </aside>
        </div>

        {/* ─── Bottom/Rest Sections: Continuous Borderless Flow ─── */}
        <div className="divide-y divide-neutral-100 pb-20">
          
          {/* Skills & Tools (Full-width, Borderless row) */}
          {(editor.skills.length > 0 || editor.tools.length > 0 || workStyleTags.length > 0) && (
            <section className="py-8">
              <SectionHeading className="mb-6">Skills &amp; Tools</SectionHeading>
              <div className="space-y-6">
                {/* Skills */}
                {editor.skills.length > 0 && (
                  <div>
                    <h3 className="text-xs font-extrabold text-neutral-400 uppercase tracking-wider mb-3">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {editor.skills.map(s => (
                        <span key={s} className="text-xs bg-[#f3f4f6] text-neutral-700 font-bold rounded-xl px-3.5 py-1.5 border border-neutral-200/30 shadow-sm">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Software */}
                {editor.tools.length > 0 && (
                  <div className="pt-5 border-t border-neutral-100/60">
                    <h3 className="text-xs font-extrabold text-neutral-450 uppercase tracking-wider mb-3">Software</h3>
                    <div className="flex flex-wrap gap-2">
                      {editor.tools.map(t => (
                        <ToolChip key={t} tool={t} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Work Style */}
                {workStyleTags.length > 0 && (
                  <div className="pt-5 border-t border-neutral-100/60">
                    <h3 className="text-xs font-extrabold text-neutral-450 uppercase tracking-wider mb-3">Work style</h3>
                    <div className="flex flex-wrap gap-2">
                      {workStyleTags.map(t => (
                        <span key={t} className="text-xs bg-violet-50 border border-violet-100 text-violet-700 rounded-xl px-3.5 py-1.5 font-bold shadow-sm">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 3. Notable Clients & Brands (Borderless marquee flow) */}
          {(() => {
            const clientsList = editor.previousClients
              ? editor.previousClients.split(",").map(c => c.trim()).filter(Boolean)
              : [];
            if (clientsList.length === 0) return null;
            return (
              <section className="py-8 overflow-hidden">
                <SectionHeading className="mb-4">Notable Clients &amp; Brands</SectionHeading>
                <div className="relative w-full overflow-hidden">
                  <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none z-10" />
                  <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />
                  
                  <div className="flex w-full overflow-hidden">
                    <div className="animate-marquee flex gap-4 py-1">
                      {clientsList.map((c, idx) => (
                        <div
                          key={`orig-${c}-${idx}`}
                          className="flex items-center gap-2 text-xs font-bold text-neutral-450 bg-neutral-50 border border-neutral-200/60 rounded-xl px-5 py-2.5 shadow-sm transition-all duration-300 select-none shrink-0"
                        >
                          <span className="text-indigo-500">⚡</span>
                          {c}
                        </div>
                      ))}
                      {clientsList.map((c, idx) => (
                        <div
                          key={`clone1-${c}-${idx}`}
                          className="flex items-center gap-2 text-xs font-bold text-neutral-450 bg-neutral-50 border border-neutral-200/60 rounded-xl px-5 py-2.5 shadow-sm transition-all duration-300 select-none shrink-0"
                        >
                          <span className="text-indigo-500">⚡</span>
                          {c}
                        </div>
                      ))}
                      {clientsList.map((c, idx) => (
                        <div
                          key={`clone2-${c}-${idx}`}
                          className="flex items-center gap-2 text-xs font-bold text-neutral-450 bg-neutral-50 border border-neutral-200/60 rounded-xl px-5 py-2.5 shadow-sm transition-all duration-300 select-none shrink-0"
                        >
                          <span className="text-indigo-500">⚡</span>
                          {c}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            );
          })()}

          {/* 4. Portfolio */}
          <section className="py-8">
            <div className="flex items-center justify-between mb-1">
              <SectionHeading>Portfolio</SectionHeading>
              {editor.portfolioItems.length > 0 && (
                <span className="text-[10px] font-bold text-neutral-400 bg-neutral-50 border border-neutral-200/60 px-2.5 py-1 rounded-full">
                  {editor.portfolioItems.length} work{editor.portfolioItems.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-450 font-semibold mt-1 mb-6">Past work samples and completed projects</p>
            {editor.portfolioItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 border border-dashed border-neutral-200 rounded-2xl text-center bg-neutral-50/30">
                <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
                  <Play className="w-7 h-7 text-neutral-400" />
                </div>
                <p className="font-extrabold text-neutral-600 text-sm">No portfolio yet</p>
                <p className="text-xs text-neutral-400 font-medium mt-1.5 max-w-xs leading-relaxed">
                  This editor hasn&apos;t uploaded work samples yet. You can still request a quote or message them directly.
                </p>
              </div>
            ) : (
              <>
                {categories.length > 1 && (
                  <div className="inline-flex items-center gap-1 bg-[#f3f4f6] rounded-[18px] border border-neutral-200/50 p-1 mb-6 overflow-x-auto scrollbar-none max-w-full">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`text-[11px] font-bold px-3.5 py-1.5 rounded-[14px] transition-all shrink-0 ${
                          selectedCategory === cat
                            ? "bg-[#000000] text-white shadow-sm"
                            : "text-neutral-500 hover:text-neutral-900"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
                <PortfolioGrid items={filteredPortfolio} onOpen={setLightboxIndex} />
              </>
            )}
          </section>

          {/* 5. Packages */}
          <section id="packages" className="py-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <SectionHeading>Packages &amp; Tiers</SectionHeading>
                <p className="text-xs text-neutral-450 font-semibold mt-1">Fixed-scope packages with clear deliverables</p>
              </div>
              {editor.packages.length > 0 && (
                <span className="text-[10px] font-bold text-neutral-400 bg-neutral-50 border border-neutral-200/60 px-2.5 py-1 rounded-full">
                  {editor.packages.length} tier{editor.packages.length !== 1 ? "s" : ""} available
                </span>
              )}
            </div>
            {editor.packages.length === 0 ? (
              <div className="border border-dashed border-neutral-200 rounded-2xl p-10 text-center text-neutral-450 font-semibold text-sm">
                No preset packages yet. Request a custom quote above.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Fiverr-like Matrix Comparison Table */}
                <div className="overflow-x-auto border border-neutral-200/70 rounded-2xl bg-white shadow-sm">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-neutral-50/50 border-b border-neutral-200/60">
                        <th className="p-5 font-black text-neutral-800 w-1/4 align-top">
                          <div className="flex flex-col gap-1.5 items-start">
                            {editor.packages[0]?.videoCategory && (
                              <span className="px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider bg-neutral-100 text-neutral-650 border border-neutral-200/60 leading-none">
                                {editor.packages[0].videoCategory.replace(/_/g, " ")}
                              </span>
                            )}
                            <span className="mt-1">Package Inclusions</span>
                          </div>
                        </th>
                        {editor.packages.map((p, idx) => {
                          const isHighlighted = editor.packages.length > 1 && idx === Math.floor(editor.packages.length / 2);
                          return (
                            <th 
                              key={p.id} 
                              className={cn(
                                "p-5 text-center w-1/4 align-top border-l border-neutral-100/70",
                                isHighlighted && "bg-neutral-950/[0.015]"
                              )}
                            >
                              <div className="flex flex-col gap-1.5">
                                {isHighlighted && (
                                  <div className="flex justify-center">
                                    <span className="px-2.5 py-1 rounded bg-neutral-900 text-white text-[8px] font-black uppercase tracking-widest leading-none shadow-sm">
                                      Most Popular
                                    </span>
                                  </div>
                                )}
                                <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 block mt-1">
                                  {p.tier || 'Tier'}
                                </span>
                                <div className="text-sm font-black text-neutral-900 leading-snug">{p.title}</div>
                                {p.description && (
                                  <p className="text-[10.5px] text-neutral-500 font-medium leading-relaxed mt-1.5 block max-w-[190px] mx-auto normal-case font-sans">
                                    {p.description}
                                  </p>
                                )}
                                <div className="text-lg font-black mt-3 text-neutral-950">
                                  {(p.price / 100).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
                                </div>
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-neutral-700">
                      {/* Delivery Days */}
                      <tr>
                        <td className="p-4 font-bold text-neutral-900 bg-neutral-50/20">Delivery Time</td>
                        {editor.packages.map((p, idx) => {
                          const isHighlighted = editor.packages.length > 1 && idx === Math.floor(editor.packages.length / 2);
                          return (
                            <td key={p.id} className={cn("p-4 font-semibold text-center border-l border-neutral-100/60", isHighlighted && "bg-neutral-950/[0.015]")}>
                              {p.deliveryDays} Days
                            </td>
                          );
                        })}
                      </tr>
                      {/* Revisions */}
                      <tr>
                        <td className="p-4 font-bold text-neutral-900 bg-neutral-50/20">Revisions</td>
                        {editor.packages.map((p, idx) => {
                          const isHighlighted = editor.packages.length > 1 && idx === Math.floor(editor.packages.length / 2);
                          return (
                            <td key={p.id} className={cn("p-4 font-semibold text-center border-l border-neutral-100/60", isHighlighted && "bg-neutral-950/[0.015]")}>
                              {p.revisionCount === -1 ? "Unlimited" : p.revisionCount}
                            </td>
                          );
                        })}
                      </tr>
                      {/* Video Length Limit */}
                      {editor.packages.some(p => p.videoLengthLimit) && (
                        <tr>
                          <td className="p-4 font-bold text-neutral-900 bg-neutral-50/20">Video Length</td>
                          {editor.packages.map((p, idx) => {
                            const isHighlighted = editor.packages.length > 1 && idx === Math.floor(editor.packages.length / 2);
                            return (
                              <td key={p.id} className={cn("p-4 font-semibold text-center border-l border-neutral-100/60", isHighlighted && "bg-neutral-950/[0.015]")}>
                                {p.videoLengthLimit || "—"}
                              </td>
                            );
                          })}
                        </tr>
                      )}
                      {/* Video Count */}
                      {editor.packages.some(p => p.videoCount) && (
                        <tr>
                          <td className="p-4 font-bold text-neutral-900 bg-neutral-50/20">Videos Included</td>
                          {editor.packages.map((p, idx) => {
                            const isHighlighted = editor.packages.length > 1 && idx === Math.floor(editor.packages.length / 2);
                            return (
                              <td key={p.id} className={cn("p-4 font-semibold text-center border-l border-neutral-100/60", isHighlighted && "bg-neutral-950/[0.015]")}>
                                {p.videoCount ? `${p.videoCount} video${p.videoCount !== 1 ? 's' : ''}` : "—"}
                              </td>
                            );
                          })}
                        </tr>
                      )}
                      {/* Resolution */}
                      {editor.packages.some(p => p.resolution) && (
                        <tr>
                          <td className="p-4 font-bold text-neutral-900 bg-neutral-50/20">Resolution</td>
                          {editor.packages.map((p, idx) => {
                            const isHighlighted = editor.packages.length > 1 && idx === Math.floor(editor.packages.length / 2);
                            return (
                              <td key={p.id} className={cn("p-4 font-semibold text-center border-l border-neutral-100/60", isHighlighted && "bg-neutral-950/[0.015]")}>
                                {p.resolution ? p.resolution.toUpperCase() : "—"}
                              </td>
                            );
                          })}
                        </tr>
                      )}
                      {/* Max Raw Footage */}
                      {editor.packages.some(p => p.maxRawFootage) && (
                        <tr>
                          <td className="p-4 font-bold text-neutral-900 bg-neutral-50/20">Max Raw Footage</td>
                          {editor.packages.map((p, idx) => {
                            const isHighlighted = editor.packages.length > 1 && idx === Math.floor(editor.packages.length / 2);
                            return (
                              <td key={p.id} className={cn("p-4 font-semibold text-center border-l border-neutral-100/60", isHighlighted && "bg-neutral-950/[0.015]")}>
                                {p.maxRawFootage || "—"}
                              </td>
                            );
                          })}
                        </tr>
                      )}
                      {/* Aspect Ratios */}
                      {editor.packages.some(p => p.aspectRatios && p.aspectRatios.length > 0) && (
                        <tr>
                          <td className="p-4 font-bold text-neutral-900 bg-neutral-50/20">Aspect Ratios</td>
                          {editor.packages.map((p, idx) => {
                            const isHighlighted = editor.packages.length > 1 && idx === Math.floor(editor.packages.length / 2);
                            const val = Array.isArray(p.aspectRatios) ? p.aspectRatios.join(", ") : "—";
                            return (
                              <td key={p.id} className={cn("p-4 font-semibold text-center border-l border-neutral-100/60 text-[10px]", isHighlighted && "bg-neutral-950/[0.015]")}>
                                {val || "—"}
                              </td>
                            );
                          })}
                        </tr>
                      )}
                      {/* Software Used */}
                      {editor.packages.some(p => p.softwareUsed && p.softwareUsed.length > 0) && (
                        <tr>
                          <td className="p-4 font-bold text-neutral-900 bg-neutral-50/20">Software Used</td>
                          {editor.packages.map((p, idx) => {
                            const isHighlighted = editor.packages.length > 1 && idx === Math.floor(editor.packages.length / 2);
                            const val = Array.isArray(p.softwareUsed) 
                              ? p.softwareUsed.map((s: string) => s.replace(/_/g, " ").toUpperCase()).join(", ") 
                              : "—";
                            return (
                              <td key={p.id} className={cn("p-4 font-semibold text-center border-l border-neutral-100/60 text-[10px]", isHighlighted && "bg-neutral-950/[0.015]")}>
                                {val || "—"}
                              </td>
                            );
                          })}
                        </tr>
                      )}
                      {/* Delivery Formats */}
                      {editor.packages.some(p => p.deliveryFormats && p.deliveryFormats.length > 0) && (
                        <tr>
                          <td className="p-4 font-bold text-neutral-900 bg-neutral-50/20">Delivery Formats</td>
                          {editor.packages.map((p, idx) => {
                            const isHighlighted = editor.packages.length > 1 && idx === Math.floor(editor.packages.length / 2);
                            const val = Array.isArray(p.deliveryFormats) 
                              ? p.deliveryFormats.map((s: string) => s.replace(/_/g, " ").toUpperCase()).join(", ") 
                              : "—";
                            return (
                              <td key={p.id} className={cn("p-4 font-semibold text-center border-l border-neutral-100/60 text-[10px]", isHighlighted && "bg-neutral-950/[0.015]")}>
                                {val || "—"}
                              </td>
                            );
                          })}
                        </tr>
                      )}
                      {/* Source Files */}
                      <tr>
                        <td className="p-4 font-bold text-neutral-900 bg-neutral-50/20">Source Files</td>
                        {editor.packages.map((p, idx) => {
                          const isHighlighted = editor.packages.length > 1 && idx === Math.floor(editor.packages.length / 2);
                          return (
                            <td key={p.id} className={cn("p-4 border-l border-neutral-100/60", isHighlighted && "bg-neutral-950/[0.015]")}>
                              <div className="flex justify-center">
                                {p.includesSourceFiles ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-50 shrink-0" />
                                ) : (
                                  <span className="text-neutral-300 font-bold">—</span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                      {/* Commercial Rights */}
                      <tr>
                        <td className="p-4 font-bold text-neutral-900 bg-neutral-50/20">Commercial Use</td>
                        {editor.packages.map((p, idx) => {
                          const isHighlighted = editor.packages.length > 1 && idx === Math.floor(editor.packages.length / 2);
                          return (
                            <td key={p.id} className={cn("p-4 border-l border-neutral-100/60", isHighlighted && "bg-neutral-950/[0.015]")}>
                              <div className="flex justify-center">
                                {p.includesCommercialRights ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-50 shrink-0" />
                                ) : (
                                  <span className="text-neutral-300 font-bold">—</span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                      {/* Addon Inclusions (Dynamic list of all platform addons) */}
                      {(() => {
                        const addonKeys = Object.keys(ADDON_DISPLAY);
                        return addonKeys.map((key) => {
                          const hasAddon = editor.packages.some(p => p.addons.includes(key));
                          if (!hasAddon) return null;
                          return (
                            <tr key={key}>
                              <td className="p-4 font-bold text-neutral-900 bg-neutral-50/20">{ADDON_DISPLAY[key]}</td>
                              {editor.packages.map((p, idx) => {
                                const isHighlighted = editor.packages.length > 1 && idx === Math.floor(editor.packages.length / 2);
                                return (
                                  <td key={p.id} className={cn("p-4 border-l border-neutral-100/60", isHighlighted && "bg-neutral-950/[0.015]")}>
                                    <div className="flex justify-center">
                                      {p.addons.includes(key) ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-50 shrink-0" />
                                      ) : (
                                        <span className="text-neutral-300 font-bold">—</span>
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        });
                      })()}
                      {/* Row CTAs */}
                      <tr className="bg-neutral-50/10">
                        <td className="p-4 font-bold text-neutral-900 bg-neutral-50/20">Select Order</td>
                        {editor.packages.map((p, idx) => {
                          const isHighlighted = editor.packages.length > 1 && idx === Math.floor(editor.packages.length / 2);
                          return (
                            <td key={p.id} className={cn("p-4 text-center border-l border-neutral-100/60", isHighlighted && "bg-neutral-950/[0.015]")}>
                              {editor.isAvailable ? (
                                <PackageClickLink
                                  href={`/checkout/${p.id}`}
                                  packageId={p.id}
                                  className={cn(
                                    "inline-flex items-center justify-center w-full text-center text-xs font-black py-2.5 rounded-xl transition-all shadow-sm active:scale-[0.98]",
                                    isHighlighted
                                      ? "bg-black hover:bg-neutral-900 text-white shadow-md shadow-neutral-950/20"
                                      : "bg-neutral-900 hover:bg-black text-white"
                                  )}
                                >
                                  Hire for {(p.price / 100).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
                                </PackageClickLink>
                              ) : (
                                <button disabled className="w-full text-center bg-neutral-100 text-neutral-400 text-xs font-extrabold py-2.5 rounded-xl cursor-not-allowed border border-neutral-200/50">
                                  Unavailable
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* 7. Reviews */}
          {editor.reviews.length > 0 && (
            <section className="py-8">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-100">
                <SectionHeading>Reviews ({editor.reviewCount})</SectionHeading>
              </div>

              {/* Rating Breakdown Graph */}
              {editor.reviewCount > 0 && editor.ratingDistribution && (
                <div className="bg-neutral-50/50 border border-neutral-200/50 rounded-2xl p-5 mb-6">
                  <div className="flex gap-6 items-center">
                    {/* Left: big score */}
                    <div className="shrink-0 flex flex-col items-center gap-1.5 min-w-[72px]">
                      <span className="text-5xl font-black text-neutral-900 leading-none tabular-nums">
                        {editor.avgRating?.toFixed(1) ?? "—"}
                      </span>
                      <Stars rating={editor.avgRating ?? 0} />
                      <span className="text-[10px] font-bold text-neutral-400 text-center leading-snug">
                        {editor.reviewCount} review{editor.reviewCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {/* Right: bars */}
                    <div className="flex-1 space-y-2">
                      {[5, 4, 3, 2, 1].map((stars, idx) => {
                        const pct = editor.ratingDistribution ? (editor.ratingDistribution[idx] ?? 0) : 0;
                        return (
                          <div key={stars} className="flex items-center gap-2.5 text-xs">
                            <span className="w-4 font-extrabold text-neutral-500 shrink-0 text-right">{stars}</span>
                            <div className="flex-1 h-2 bg-neutral-200/50 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="w-7 text-right font-bold text-neutral-400 shrink-0 text-[10px]">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {editor.reviews.slice(0, 6).map(r => <ReviewCard key={r.id} review={r} />)}
              </div>
              {editor.reviews.length > 6 && (
                <Link
                  href={`/editor/${editor.id}/reviews`}
                  className="mt-5 inline-flex items-center gap-1 text-xs font-extrabold text-brand-primary hover:text-brand-primary/80 transition-colors"
                >
                  View all {editor.reviewCount} reviews <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </section>
          )}
        </div>
      </div>

      {lightboxIndex !== null && (
        <PortfolioLightbox
          items={filteredPortfolio}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
          editorName={displayName}
          editorVerified={editor.kycStatus === "approved"}
        />
      )}


    </div>
  );
}

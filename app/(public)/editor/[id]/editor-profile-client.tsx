"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MapPin, Star, CheckCircle2, Clock, TrendingUp, Zap,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, MessageSquare, Play,
  BadgeCheck, Globe, Briefcase, Award, X, ArrowLeftRight,
  Eye, Share2, Bookmark
} from "lucide-react";
import { displayNameFromFull } from "@/lib/utils";
import { getThumbnailUrl, getVideoSource } from "@/lib/portfolio-media";
import { PortfolioVideoPlayer } from "@/components/public/portfolio-video-player";
import { RequestQuoteButton } from "@/components/client/request-quote-button";
import { PackageClickLink } from "@/components/editor/package-click-link";
import { FRAME_STYLES, type FrameKey } from "@/lib/xp-shop-config";
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
          className={`w-3.5 h-3.5 ${i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
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

function PackageCard({ pkg, editorId, isAvailable, isHighlighted }: { pkg: Package; editorId: string; isAvailable: boolean; isHighlighted?: boolean }) {
  const price = (pkg.price / 100).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
  return (
    <div className={`relative border rounded-[20px] p-5 flex flex-col gap-3 hover:shadow-md transition-all bg-[#ffffff] ${
      isHighlighted ? "border-indigo-500 ring-2 ring-indigo-500/10 shadow-sm" : "border-neutral-200/60 hover:border-neutral-300"
    }`}>
      {isHighlighted && (
        <span className="absolute -top-2.5 right-4 bg-indigo-600 text-white text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full shadow-sm">
          Most Popular
        </span>
      )}
      {pkg.tier && (
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600">{pkg.tier}</span>
      )}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-neutral-900 text-sm leading-snug">{pkg.title}</h3>
        <span className="text-base font-black text-neutral-900 shrink-0">{price}</span>
      </div>
      <p className="text-xs text-neutral-400 leading-relaxed line-clamp-3">{pkg.description}</p>
      <div className="flex flex-wrap gap-1.5">
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-500 bg-[#f3f4f6] border border-neutral-200/20 rounded-lg px-2 py-1">
          <Clock className="w-3 h-3 text-neutral-400" />{pkg.deliveryDays}d delivery
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-500 bg-[#f3f4f6] border border-neutral-200/20 rounded-lg px-2 py-1">
          <TrendingUp className="w-3 h-3 text-neutral-400" />{pkg.revisionCount} revision{pkg.revisionCount !== 1 ? "s" : ""}
        </span>
        {pkg.videoLengthLimit && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-500 bg-[#f3f4f6] border border-neutral-200/20 rounded-lg px-2 py-1">
            <Play className="w-3 h-3 text-neutral-400" />{pkg.videoLengthLimit}
          </span>
        )}
        {pkg.includesSourceFiles && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-500 bg-[#f3f4f6] border border-neutral-200/20 rounded-lg px-2 py-1">
            Source Files
          </span>
        )}
        {pkg.includesCommercialRights && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-500 bg-[#f3f4f6] border border-neutral-200/20 rounded-lg px-2 py-1">
            Commercial Use
          </span>
        )}
      </div>
      {pkg.addons.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {pkg.addons.slice(0, 4).map(a => (
            <span key={a} className="text-[10px] font-bold bg-indigo-50/70 text-indigo-700 rounded-md px-1.5 py-0.5 capitalize">
              {a.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}
      {isAvailable ? (
        <PackageClickLink
          href={`/client/orders/new?editorId=${editorId}&packageId=${pkg.id}`}
          packageId={pkg.id}
          className={`mt-auto block w-full text-center text-xs font-extrabold py-3 rounded-xl transition-all active:scale-[0.99] ${
            isHighlighted ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/10" : "bg-black hover:bg-neutral-900 text-white"
          }`}
        >
          Hire for {price}
        </PackageClickLink>
      ) : (
        <button
          disabled
          className="mt-auto block w-full text-center bg-neutral-100 text-neutral-400 text-xs font-extrabold py-3 rounded-xl cursor-not-allowed border border-neutral-200/60"
        >
          Unavailable
        </button>
      )}
    </div>
  );
}


function ReviewCard({ review }: { review: Review }) {
  const [expanded, setExpanded] = useState(false);
  const long = (review.text?.length ?? 0) > 200;
  return (
    <div className="border border-gray-100 rounded-2xl p-4 flex flex-col gap-2.5 bg-white">
      <div className="flex items-center gap-2.5">
        <Avatar src={review.reviewerImage} name={review.reviewerName} size={32} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 truncate">{review.reviewerName}</p>
          <p className="text-[11px] text-gray-400">{new Date(review.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</p>
        </div>
        <div className="shrink-0">
          <Stars rating={review.rating} />
        </div>
      </div>
      {review.text && (
        <div>
          <p className={`text-sm text-gray-600 leading-relaxed ${!expanded && long ? "line-clamp-3" : ""}`}>
            {review.text}
          </p>
          {long && (
            <button onClick={() => setExpanded(e => !e)} className="text-xs text-indigo-600 mt-1 flex items-center gap-0.5">
              {expanded ? <><ChevronUp className="w-3 h-3" />Less</> : <><ChevronDown className="w-3 h-3" />Read more</>}
            </button>
          )}
        </div>
      )}
      {review.replyText && (
        <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 border-l-2 border-indigo-200">
          <p className="font-semibold text-gray-800 mb-0.5">Editor replied:</p>
          {review.replyText}
        </div>
      )}
    </div>
  );
}

function PortfolioGrid({ items, onOpen }: { items: PortfolioItem[]; onOpen: (index: number) => void }) {
  if (items.length === 0) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {items.map((item, index) => {
        const thumb = item.type === "video"
          ? (item.thumbnailUrl || getThumbnailUrl(item.url))
          : null;
        const source = item.type === "video" ? getVideoSource(item.url) : null;
        return (
          <button
            key={item.id}
            onClick={() => onOpen(index)}
            className="group bg-[#ffffff] rounded-[22px] p-2 border border-neutral-200/55 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col text-left cursor-pointer"
          >
            {/* Rounded Preview Container */}
            <div className="relative aspect-video w-full rounded-[16px] overflow-hidden bg-neutral-50 shrink-0">
              {item.type === "video" ? (
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
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900 gap-1">
                    <Play className="w-7 h-7 text-white/70 group-hover:text-white transition-colors" />
                    {source && source !== "direct" && (
                      <span className={`text-[8px] font-bold uppercase tracking-wider text-white/50 px-1.5 py-0.5 rounded ${
                        source === "youtube" ? "bg-red-600/60" :
                        source === "vimeo"   ? "bg-sky-500/60" :
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

              {/* Badges Overlays */}
              {item.orderId && (
                <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded-full px-1.5 py-0.5 text-[8px] font-bold text-indigo-700 flex items-center gap-0.5 cursor-help group/vtooltip z-10 shadow-sm">
                  <BadgeCheck className="w-2.5 h-2.5" />Verified
                  <div className="absolute top-full left-0 mt-1 w-44 hidden group-hover/vtooltip:block bg-gray-900 text-white text-[9px] rounded p-2 leading-normal shadow-md z-30 font-medium normal-case">
                    Verified Order: This video was created for an actual completed order on EditBridge.
                  </div>
                </span>
              )}
              {item.beforeUrl && (
                <span className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full px-1.5 py-0.5 text-[8px] font-bold text-neutral-700 flex items-center gap-0.5 z-10 shadow-sm">
                  <ArrowLeftRight className="w-2.5 h-2.5" />Before/After
                </span>
              )}
            </div>

            {/* Label Footer */}
            <div className="pt-2.5 px-1 pb-0.5 flex-1 flex flex-col">
              <p className="text-neutral-800 text-[11px] font-bold leading-tight line-clamp-1 group-hover:text-black transition-colors">{item.title ?? "Untitled"}</p>
            </div>
          </button>
        );
      })}
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

export function EditorProfileClient({ editor, isLoggedIn }: { editor: EditorProfile; isLoggedIn: boolean }) {
  const [bioExpanded, setBioExpanded] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);


  // Bookmarking wishlist states
  const [bookmarked, setBookmarked] = useState(editor.isBookmarked ?? false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  // Portfolio category filter states
  const categories = ["All", ...Array.from(new Set(editor.portfolioItems.map(item => item.category).filter(Boolean) as string[]))];
  const [selectedCategory, setSelectedCategory] = useState("All");


  // Mobile Sticky Bar state
  const [showStickyBar, setShowStickyBar] = useState(false);

  useEffect(() => {
    function handleScroll() {
      if (window.scrollY > 300) {
        setShowStickyBar(true);
      } else {
        setShowStickyBar(false);
      }
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

      {/* Cover */}
      <div className="h-56 sm:h-64 w-full relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-800 border-b border-neutral-200/50 z-10">
        {editor.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={editor.coverImage} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 opacity-25 animate-pulse-slow"
            style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #4f46e5 0%, transparent 60%), radial-gradient(circle at 80% 20%, #6366f1 0%, transparent 50%)" }} />
        )}
        {editor.isFeatured && (
          <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-white">Featured Editor</span>
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Avatar row */}
        <div className="flex items-end justify-between pb-1 pt-4 sm:pt-6">
          <div className="relative shrink-0 -mt-16 sm:-mt-20 z-10">
            <div className="ring-4 ring-[#ffffff] rounded-full shadow-lg overflow-hidden bg-[#ffffff]">
              <Avatar src={editor.image} name={displayName} size={96} activeFrame={editor.activeFrame} />
            </div>

            {editor.kycStatus === "approved" && (
              <div className="absolute bottom-1 right-1 group/tooltip z-10">
                <BadgeCheck className="w-6 h-6 text-indigo-600 fill-white drop-shadow-sm cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 hidden group-hover/tooltip:block bg-gray-900 text-white text-[10px] rounded-lg p-2.5 text-center leading-relaxed shadow-md z-30 font-medium normal-case">
                  KYC Verified: Government ID and bank details of this editor are verified by EditBridge.
                </div>
              </div>
            )}
          </div>
          {/* Action buttons */}
          <div className="flex items-center gap-2 pb-1">
            {editor.isAvailable ? (
              <Link
                href={`/client/orders/new?editorId=${editor.id}`}
                className="inline-flex items-center gap-1.5 bg-black hover:bg-neutral-900 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl transition-all shadow-sm active:scale-[0.99]"
              >
                Hire me
              </Link>
            ) : (
              <button
                disabled
                className="inline-flex items-center gap-1.5 bg-neutral-100 text-neutral-400 text-xs font-extrabold px-5 py-2.5 rounded-xl cursor-not-allowed border border-neutral-200/50"
              >
                Unavailable
              </button>
            )}
            <Link
              href={`/client/messages?editorId=${editor.id}`}
              onClick={(e) => {
                if (!isLoggedIn) {
                  e.preventDefault();
                  window.location.href = `/login?callbackUrl=${encodeURIComponent(`/client/messages?editorId=${editor.id}`)}`;
                }
              }}
              className="inline-flex items-center gap-1.5 bg-[#ffffff] border border-neutral-200 hover:bg-neutral-50 text-neutral-800 text-xs font-extrabold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              <MessageSquare className="w-4 h-4 text-neutral-400" />Message
            </Link>

            {/* Bookmark button */}
            <button
              onClick={handleBookmarkToggle}
              disabled={bookmarkLoading}
              className={`inline-flex items-center justify-center border p-2.5 rounded-xl transition-colors shadow-sm ${
                bookmarked
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                  : "bg-[#ffffff] border-neutral-200 hover:bg-neutral-50 text-neutral-700"
              }`}
              title={bookmarked ? "Remove from wishlist" : "Save to wishlist"}
            >
              <Bookmark className={`w-4 h-4 ${bookmarked ? "fill-indigo-600 text-indigo-600" : "text-neutral-400"}`} />
            </button>

            {/* Share button */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success("Profile link copied!");
              }}
              className="inline-flex items-center justify-center bg-[#ffffff] border border-neutral-200 hover:bg-neutral-50 text-neutral-700 p-2.5 rounded-xl transition-colors shadow-sm"
              title="Share profile"
            >
              <Share2 className="w-4 h-4 text-neutral-400" />
            </button>
          </div>
        </div>

        {/* Name / title / niches */}
        <div className="mt-4 mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 leading-tight tracking-tight">{displayName}</h1>
          {editor.title && <p className="text-sm text-neutral-400 font-bold mt-1">{editor.title}</p>}
          
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {editor.isAvailable ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/50 rounded-full px-2.5 py-0.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Available
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 border border-red-200/50 rounded-full px-2.5 py-0.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />Not Accepting Orders
              </span>
            )}
            
            {editor.avgRating && (
              <span className="inline-flex items-center gap-1 text-xs text-neutral-700 font-bold bg-[#ffffff] border border-neutral-200/60 rounded-full px-2.5 py-0.5 shadow-sm">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {editor.avgRating}
                <span className="text-neutral-400 font-normal">({editor.reviewCount})</span>
              </span>
            )}

            {niches.map(n => (
              <span key={n} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100/50 rounded-full px-2.5 py-0.5 shadow-sm capitalize">
                {n}
              </span>
            ))}
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 pb-20">
          {/* Left column */}
          <div className="space-y-8 min-w-0">
            {/* Featured Video (Showreel) */}
            {editor.featuredVideoUrl && (
              <section className="bg-[#ffffff] rounded-3xl border border-neutral-200/50 p-6 shadow-sm">
                <h2 className="text-base font-black text-neutral-900 tracking-tight mb-4">Featured Video (Showreel)</h2>
                <div className="rounded-xl overflow-hidden aspect-video bg-black shadow-inner">
                  <PortfolioVideoPlayer
                     url={editor.featuredVideoUrl}
                     title="Featured Video"
                     editorName={displayName}
                     editorVerified={editor.kycStatus === "approved"}
                     aspectRatio="16/9"
                     className="w-full"
                  />
                </div>
              </section>
            )}

            {/* About */}
            {editor.bio && (
              <section className="bg-[#ffffff] rounded-3xl border border-neutral-200/50 p-6 shadow-sm">
                <h2 className="text-base font-black text-neutral-900 tracking-tight mb-3">About me</h2>
                <p className={`text-sm text-neutral-500 leading-relaxed ${!bioExpanded && bioLong ? "line-clamp-4" : ""}`}>
                  {editor.bio}
                </p>
                {bioLong && (
                  <button onClick={() => setBioExpanded(e => !e)} className="text-xs font-bold text-indigo-600 mt-2 hover:text-indigo-700 flex items-center gap-0.5">
                    {bioExpanded ? <><ChevronUp className="w-3.5 h-3.5" />Show less</> : <><ChevronDown className="w-3.5 h-3.5" />Read more</>}
                  </button>
                )}
              </section>
            )}

            {/* Notable Clients & Brands */}
            {(() => {
              const clientsList = editor.previousClients
                ? editor.previousClients.split(",").map(c => c.trim()).filter(Boolean)
                : [];
              if (clientsList.length === 0) return null;
              return (
                <section className="bg-[#ffffff] rounded-3xl border border-neutral-200/50 p-6 shadow-sm overflow-hidden">
                  <h2 className="text-base font-black text-neutral-900 tracking-tight mb-4">Notable Clients & Brands</h2>
                  <div className="relative w-full overflow-hidden">
                    {/* Fade gradients */}
                    <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none z-10" />
                    <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />
                    
                    <div className="flex w-full overflow-hidden">
                      <div className="animate-marquee flex gap-4 py-1">
                        {clientsList.map((c, idx) => (
                          <div
                            key={`orig-${c}-${idx}`}
                            className="flex items-center gap-2 text-xs font-bold text-neutral-400 bg-neutral-50 border border-neutral-200/60 rounded-xl px-5 py-2.5 shadow-sm transition-all duration-300 select-none shrink-0"
                          >
                            <span className="text-indigo-500">⚡</span>
                            {c}
                          </div>
                        ))}
                        {clientsList.map((c, idx) => (
                          <div
                            key={`clone1-${c}-${idx}`}
                            className="flex items-center gap-2 text-xs font-bold text-neutral-400 bg-neutral-50 border border-neutral-200/60 rounded-xl px-5 py-2.5 shadow-sm transition-all duration-300 select-none shrink-0"
                          >
                            <span className="text-indigo-500">⚡</span>
                            {c}
                          </div>
                        ))}
                        {clientsList.map((c, idx) => (
                          <div
                            key={`clone2-${c}-${idx}`}
                            className="flex items-center gap-2 text-xs font-bold text-neutral-400 bg-neutral-50 border border-neutral-200/60 rounded-xl px-5 py-2.5 shadow-sm transition-all duration-300 select-none shrink-0"
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

            {/* Skills & Tools */}
            {(editor.skills.length > 0 || editor.tools.length > 0 || workStyleTags.length > 0) && (
              <section className="bg-[#ffffff] rounded-3xl border border-neutral-200/50 p-6 shadow-sm">
                <h2 className="text-base font-black text-neutral-900 tracking-tight mb-4">Skills & Tools</h2>
                <div className="space-y-4">
                  {editor.skills.length > 0 && (
                    <div>
                      <p className="text-xs font-extrabold text-neutral-400 uppercase tracking-widest mb-2">Skills</p>
                      <div className="flex flex-wrap gap-1.5">
                        {editor.skills.map(s => (
                          <span key={s} className="text-xs bg-[#f3f4f6] border border-neutral-200/40 text-neutral-600 font-semibold rounded-lg px-2.5 py-1">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {editor.tools.length > 0 && (
                    <div>
                      <p className="text-xs font-extrabold text-neutral-400 uppercase tracking-widest mb-2">Software</p>
                      <div className="flex flex-wrap gap-1.5">
                        {editor.tools.map(t => (
                          <span key={t} className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg px-2.5 py-1 font-bold">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {workStyleTags.length > 0 && (
                    <div>
                      <p className="text-xs font-extrabold text-neutral-400 uppercase tracking-widest mb-2">Work style</p>
                      <div className="flex flex-wrap gap-1.5">
                        {workStyleTags.map(t => (
                          <span key={t} className="text-xs bg-violet-50 border border-violet-100 text-violet-700 rounded-lg px-2.5 py-1 font-bold">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Portfolio */}
            <section className="bg-[#ffffff] rounded-3xl border border-neutral-200/50 p-6 shadow-sm">
              <h2 className="text-base font-black text-neutral-900 tracking-tight mb-4">Portfolio</h2>
              {editor.portfolioItems.length === 0 ? (
                <div className="border border-dashed border-neutral-200 rounded-xl p-8 text-center text-neutral-400 font-semibold">
                  No portfolio items uploaded yet.
                </div>
              ) : (
                <>
                  {/* Category Filter tabs (capsule layout) */}
                  {categories.length > 2 && (
                    <div className="inline-flex items-center gap-1 bg-[#f3f4f6] rounded-[18px] border border-neutral-200/50 p-1 mb-4 overflow-x-auto scrollbar-none max-w-full">
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

            {/* Packages */}
            <section className="bg-[#ffffff] rounded-3xl border border-neutral-200/50 p-6 shadow-sm">
              <h2 className="text-base font-black text-neutral-900 tracking-tight mb-4">Packages</h2>
              {editor.packages.length === 0 ? (
                <div className="border border-dashed border-neutral-200 rounded-xl p-8 text-center text-neutral-400 font-semibold">
                  No preset packages configured yet. Request a custom quote below.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {editor.packages.map((pkg, index) => {
                    // Highlight the standard/middle tier in visual hierarchy
                    const isHighlighted = editor.packages.length > 1 && index === Math.floor(editor.packages.length / 2);
                    return (
                      <PackageCard
                        key={pkg.id}
                        pkg={pkg}
                        editorId={editor.id}
                        isAvailable={editor.isAvailable}
                        isHighlighted={isHighlighted}
                      />
                    );
                  })}
                </div>
              )}
            </section>

            {/* Reviews */}
            {editor.reviews.length > 0 && (
              <section className="bg-[#ffffff] rounded-3xl border border-neutral-200/50 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-100">
                  <h2 className="text-base font-black text-neutral-900 tracking-tight">
                    Reviews ({editor.reviewCount})
                  </h2>
                </div>

                {/* Rating Breakdown Graph */}
                {editor.reviewCount > 0 && editor.ratingDistribution && (
                  <div className="bg-neutral-50/50 border border-neutral-200/50 rounded-2xl p-5 mb-6 flex flex-col gap-2.5">
                    <p className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest">Rating Breakdown</p>
                    <div className="space-y-2">
                      {[5, 4, 3, 2, 1].map((stars, idx) => {
                        const pct = editor.ratingDistribution ? (editor.ratingDistribution[idx] ?? 0) : 0;
                        return (
                          <div key={stars} className="flex items-center gap-3 text-xs">
                            <span className="w-8 font-extrabold text-neutral-500 flex items-center gap-0.5 shrink-0">
                              {stars}★
                            </span>
                            <div className="flex-1 h-2.5 bg-neutral-200/40 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="w-8 text-right font-extrabold text-neutral-400 shrink-0">
                              {pct}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {editor.reviews.slice(0, 6).map(r => <ReviewCard key={r.id} review={r} />)}
                </div>
                {editor.reviews.length > 6 && (
                  <Link
                    href={`/editor/${editor.id}/reviews`}
                    className="mt-5 inline-flex items-center gap-1 text-xs font-extrabold text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    View all {editor.reviewCount} reviews <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
              </section>
            )}
          </div>

          {/* Right sidebar */}
          <aside className="space-y-5">
            {/* Stats */}
            <div className="bg-[#ffffff] border border-neutral-200/50 rounded-3xl p-5 shadow-sm space-y-3.5">
              <h3 className="text-xs font-extrabold text-neutral-400 uppercase tracking-widest">Stats</h3>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-500 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />Orders completed
                  </span>
                  <span className="text-sm font-bold text-neutral-900">{editor.totalOrders}</span>
                </div>
                {editor.completionRate !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-500 font-semibold flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-[#0EA5E9]" />Completion rate
                    </span>
                    <span className="text-sm font-bold text-neutral-900">{editor.completionRate}%</span>
                  </div>
                )}
                {editor.avgResponseTime !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-500 font-semibold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />Avg response
                    </span>
                    <span className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${
                        editor.avgResponseTime < 60 ? "bg-emerald-500" :
                        editor.avgResponseTime < 240 ? "bg-amber-400" :
                        "bg-red-500"
                      }`} />
                      {editor.avgResponseTime < 60
                        ? `${editor.avgResponseTime}m`
                        : `${Math.round(editor.avgResponseTime / 60)}h`}
                    </span>
                  </div>
                )}
                {/* Profile View Counter */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-500 font-semibold flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-sky-500" />Profile views
                  </span>
                  <span className="text-sm font-bold text-neutral-900">
                    {editor.viewCount?.toLocaleString() ?? 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="bg-[#ffffff] border border-neutral-200/50 rounded-3xl p-5 shadow-sm space-y-3.5">
              <h3 className="text-xs font-extrabold text-neutral-400 uppercase tracking-widest">Details</h3>
              <div className="space-y-2.5">
                {editor.location && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-neutral-400 mt-0.5 shrink-0" />
                    <span className="text-sm font-semibold text-neutral-600">{editor.location}</span>
                  </div>
                )}
                {expLabel && (
                  <div className="flex items-start gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-neutral-400 mt-0.5 shrink-0" />
                    <span className="text-sm font-semibold text-neutral-600">
                      {expLabel}{editor.yearsOfExperience ? ` · ${editor.yearsOfExperience} yr${editor.yearsOfExperience !== 1 ? "s" : ""}` : ""}
                    </span>
                  </div>
                )}
                {languages.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Globe className="w-3.5 h-3.5 text-neutral-400 mt-0.5 shrink-0" />
                    <span className="text-sm font-semibold text-neutral-600">
                      {languages.map(l => `${l.language} (${l.level})`).join(", ")}
                    </span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-neutral-400 mt-0.5 shrink-0" />
                  <span className="text-sm font-semibold text-neutral-600">
                    Member since {new Date(editor.kycApprovedAt || editor.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>
            </div>

            {/* CTA */}
            {editor.packages.length > 0 && (
              <div className="border border-neutral-200/50 bg-[#ffffff] rounded-3xl p-5 text-center space-y-3.5 shadow-sm">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Pricing</p>
                <p className="text-sm font-bold text-neutral-500 leading-tight">
                  Starting from{" "}
                  <span className="text-lg text-neutral-900 font-black">
                    {(Math.min(...editor.packages.map(p => p.price)) / 100).toLocaleString("en-IN", {
                      style: "currency", currency: "INR", maximumFractionDigits: 0
                    })}
                  </span>
                </p>
                {editor.isAvailable ? (
                  <Link
                    href={`/client/orders/new?editorId=${editor.id}`}
                    className="block w-full bg-black hover:bg-neutral-900 text-white text-xs font-bold py-3 rounded-xl transition-colors shadow-sm"
                  >
                    Get started
                  </Link>
                ) : (
                  <button
                    disabled
                    className="block w-full bg-neutral-100 text-neutral-400 text-xs font-bold py-3 rounded-xl cursor-not-allowed border border-neutral-200/50"
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
            )}
          </aside>
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

      {/* Mobile Sticky CTA Bar */}
      <div className={`fixed bottom-0 left-0 right-0 z-40 bg-[#ffffff] border-t border-neutral-200/60 px-4 py-3.5 shadow-2xl flex items-center justify-between gap-4 lg:hidden transition-all duration-300 transform ${
        showStickyBar ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
      }`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar src={editor.image} name={displayName} size={40} activeFrame={editor.activeFrame} />
          <div className="min-w-0">
            <p className="text-xs font-bold text-neutral-900 truncate">{displayName}</p>
            {editor.packages.length > 0 && (
              <p className="text-[10px] font-semibold text-neutral-400">
                Starting from {(Math.min(...editor.packages.map(p => p.price)) / 100).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
              </p>
            )}
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {editor.isAvailable ? (
            <Link
              href={`/client/orders/new?editorId=${editor.id}`}
              className="bg-black hover:bg-neutral-900 text-white text-xs font-extrabold px-4.5 py-2.5 rounded-xl transition-all shadow-sm"
            >
              Hire me
            </Link>
          ) : (
            <button
              disabled
              className="bg-neutral-100 text-neutral-400 text-xs font-extrabold px-4.5 py-2.5 rounded-xl cursor-not-allowed border border-neutral-200/50"
            >
              Unavailable
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

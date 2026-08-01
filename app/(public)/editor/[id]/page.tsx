"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  MapPin, Star, CheckCircle2, Clock, TrendingUp, Zap,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, MessageSquare, Play,
  BadgeCheck, Globe, Briefcase, Award, X, ArrowLeftRight
} from "lucide-react";
import { displayNameFromFull } from "@/lib/utils";
import { getThumbnailUrl, getEmbedUrl, isExternalVideo, getVideoSource } from "@/lib/portfolio-media";
import { PortfolioVideoPlayer } from "@/components/public/portfolio-video-player";
import { RequestQuoteButton } from "@/components/client/request-quote-button";
import { PackageClickLink } from "@/components/editor/package-click-link";
import { FRAME_STYLES, type FrameKey } from "@/lib/xp-shop-config";

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
  packages: Package[];
  skills: string[];
  tools: string[];
  portfolioItems: PortfolioItem[];
  reviews: Review[];
  avgRating: number | null;
  reviewCount: number;
  activeFrame: string | null;
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

function PackageCard({ pkg, editorId }: { pkg: Package; editorId: string }) {
  const price = (pkg.price / 100).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
  return (
    <div className="border border-gray-200 rounded-2xl p-5 flex flex-col gap-3 hover:shadow-md hover:border-gray-300 transition-all">
      {pkg.tier && (
        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">{pkg.tier}</span>
      )}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug">{pkg.title}</h3>
        <span className="text-base font-bold text-gray-900 shrink-0">{price}</span>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{pkg.description}</p>
      <div className="flex flex-wrap gap-1.5">
        <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1">
          <Clock className="w-3 h-3" />{pkg.deliveryDays}d delivery
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1">
          <TrendingUp className="w-3 h-3" />{pkg.revisionCount} revision{pkg.revisionCount !== 1 ? "s" : ""}
        </span>
        {pkg.videoLengthLimit && (
          <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1">
            <Play className="w-3 h-3" />{pkg.videoLengthLimit}
          </span>
        )}
      </div>
      {pkg.addons.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {pkg.addons.slice(0, 4).map(a => (
            <span key={a} className="text-[10px] bg-indigo-50 text-indigo-700 rounded-md px-1.5 py-0.5 capitalize">
              {a.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}
      <PackageClickLink
        href={`/client/orders/new?editorId=${editorId}&packageId=${pkg.id}`}
        packageId={pkg.id}
        className="mt-auto block w-full text-center bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
      >
        Hire for {price}
      </PackageClickLink>
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const [expanded, setExpanded] = useState(false);
  const long = (review.text?.length ?? 0) > 200;
  return (
    <div className="border border-gray-100 rounded-2xl p-4 flex flex-col gap-2.5">
      <div className="flex items-center gap-2.5">
        <Avatar src={review.reviewerImage} name={review.reviewerName} size={32} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{review.reviewerName}</p>
          <p className="text-[11px] text-gray-400">{new Date(review.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</p>
        </div>
        <div className="ml-auto">
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
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {items.map((item, index) => {
        const thumb = item.type === "video"
          ? (item.thumbnailUrl || getThumbnailUrl(item.url))
          : null;
        const source = item.type === "video" ? getVideoSource(item.url) : null;
        return (
          <button key={item.id} onClick={() => onOpen(index)}
            className="group relative aspect-video rounded-xl overflow-hidden bg-gray-100 border border-gray-200 text-left">
            {item.type === "video" ? (
              thumb ? (
                /* Real thumbnail — YouTube/Vimeo auto, or a custom uploaded one */
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumb} alt={item.title ?? "Video"} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-black/60 flex items-center justify-center">
                      <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                </>
              ) : (
                /* External video or direct video without thumbnail — gradient placeholder */
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 gap-1">
                  <Play className="w-8 h-8 text-white/70 group-hover:text-white transition-colors" />
                  {source && source !== "direct" && (
                    <span className={`text-[9px] font-bold uppercase tracking-wider text-white/50 px-1.5 py-0.5 rounded ${
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
              <img src={item.url} alt={item.title ?? "Portfolio image"} className="w-full h-full object-cover"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            )}
            {item.title && (
              <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2 text-[10px] text-white/90 truncate">
                {item.title}
              </span>
            )}
            {item.isFeatured && (
              <span className="absolute top-1.5 right-1.5 bg-amber-400 rounded-full w-2 h-2" />
            )}
            {item.orderId && (
              <span className="absolute top-1.5 left-1.5 bg-white/90 backdrop-blur-sm rounded-full px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 flex items-center gap-0.5">
                <BadgeCheck className="w-2.5 h-2.5" />Verified
              </span>
            )}
            {item.beforeUrl && (
              <span className="absolute top-1.5 right-1.5 bg-white/90 backdrop-blur-sm rounded-full px-1.5 py-0.5 text-[9px] font-bold text-gray-700 flex items-center gap-0.5">
                <ArrowLeftRight className="w-2.5 h-2.5" />Before/After
              </span>
            )}
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

export default function EditorPublicProfile() {
  const { id } = useParams<{ id: string }>();
  const [editor, setEditor] = useState<EditorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/editors/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setEditor)
      .catch(() => setEditor(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-white">
      <div className="h-48 bg-gray-100 animate-pulse" />
      <div className="max-w-5xl mx-auto px-4 pt-6 flex gap-6">
        <div className="w-24 h-24 rounded-full bg-gray-200 animate-pulse -mt-12" />
        <div className="flex-1 pt-4 space-y-2">
          <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-72 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );

  if (!editor) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <p className="text-2xl font-bold text-gray-900 mb-2">Editor not found</p>
        <p className="text-gray-500 text-sm mb-6">This profile may not be available yet.</p>
        <Link href="/editors" className="text-indigo-600 text-sm hover:underline">Browse editors →</Link>
      </div>
    </div>
  );

  const displayName = editor.displayName || displayNameFromFull(editor.name);
  const workStyleTags: string[] = editor.workStyleTags ? JSON.parse(editor.workStyleTags) : [];
  const languages: { language: string; level: string }[] = editor.languages ? JSON.parse(editor.languages) : [];
  const bioLong = (editor.bio?.length ?? 0) > 300;
  const expLabel = editor.experienceLevel === "entry" ? "Entry level" : editor.experienceLevel === "intermediate" ? "Intermediate" : editor.experienceLevel === "expert" ? "Expert" : null;

  return (
    <div className="min-h-screen bg-white">
      {/* Cover */}
      <div className="h-40 sm:h-48 w-full relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-800">
        {editor.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={editor.coverImage} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #6366f1 0%, transparent 60%), radial-gradient(circle at 80% 20%, #818cf8 0%, transparent 50%)" }} />
        )}
        {editor.isFeatured && (
          <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1.5">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-white">Featured Editor</span>
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Avatar row — only avatar overlaps the cover */}
        <div className="flex items-end justify-between -mt-10">
          <div className="relative shrink-0">
            <div className="ring-4 ring-white rounded-full shadow-sm">
              <Avatar src={editor.image} name={displayName} size={88} activeFrame={editor.activeFrame} />
            </div>
            {editor.kycStatus === "approved" && (
              <BadgeCheck className="absolute bottom-0.5 right-0.5 w-6 h-6 text-indigo-600 fill-white" />
            )}
          </div>
          {/* Action buttons — right side, baseline-aligned with avatar */}
          <div className="flex items-center gap-2 pb-1">
            <Link
              href={`/client/orders/new?editorId=${editor.id}`}
              className="inline-flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              Hire me
            </Link>
            <Link
              href={`/client/messages?editorId=${editor.id}`}
              className="inline-flex items-center gap-1.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              <MessageSquare className="w-4 h-4" />Message
            </Link>
          </div>
        </div>

        {/* Name / title / badges — fully below the cover */}
        <div className="mt-3 mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">{displayName}</h1>
          {editor.title && <p className="text-sm text-gray-500 mt-0.5">{editor.title}</p>}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {editor.isAvailable ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Available
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2.5 py-0.5">
                Unavailable
              </span>
            )}
            {editor.avgRating && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-700">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <strong>{editor.avgRating}</strong>
                <span className="text-gray-400">({editor.reviewCount})</span>
              </span>
            )}
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_288px] gap-8 pb-16">
          {/* Left col */}
          <div className="space-y-8 min-w-0">

            {/* About */}
            {editor.bio && (
              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-3">About me</h2>
                <p className={`text-sm text-gray-600 leading-relaxed ${!bioExpanded && bioLong ? "line-clamp-4" : ""}`}>
                  {editor.bio}
                </p>
                {bioLong && (
                  <button onClick={() => setBioExpanded(e => !e)} className="text-sm text-indigo-600 mt-1.5 hover:underline flex items-center gap-0.5">
                    {bioExpanded ? <><ChevronUp className="w-3.5 h-3.5" />Show less</> : <><ChevronDown className="w-3.5 h-3.5" />Read more</>}
                  </button>
                )}
              </section>
            )}

            {/* Skills & Tools */}
            {(editor.skills.length > 0 || editor.tools.length > 0) && (
              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-3">Skills & Tools</h2>
                <div className="space-y-3">
                  {editor.skills.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Skills</p>
                      <div className="flex flex-wrap gap-1.5">
                        {editor.skills.map(s => (
                          <span key={s} className="text-xs bg-gray-50 border border-gray-200 text-gray-700 rounded-lg px-2.5 py-1">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {editor.tools.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Software</p>
                      <div className="flex flex-wrap gap-1.5">
                        {editor.tools.map(t => (
                          <span key={t} className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg px-2.5 py-1">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {workStyleTags.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Work style</p>
                      <div className="flex flex-wrap gap-1.5">
                        {workStyleTags.map(t => (
                          <span key={t} className="text-xs bg-violet-50 border border-violet-100 text-violet-700 rounded-lg px-2.5 py-1">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Portfolio */}
            {editor.portfolioItems.length > 0 && (
              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-3">Portfolio</h2>
                <PortfolioGrid items={editor.portfolioItems} onOpen={setLightboxIndex} />
              </section>
            )}

            {/* Packages */}
            {editor.packages.length > 0 && (
              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-3">Packages</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {editor.packages.map(pkg => (
                    <PackageCard key={pkg.id} pkg={pkg} editorId={editor.id} />
                  ))}
                </div>
              </section>
            )}

            {/* Reviews */}
            {editor.reviews.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold text-gray-900">
                    Reviews
                    {editor.avgRating && (
                      <span className="ml-2 text-sm font-normal text-gray-500">
                        {editor.avgRating} · {editor.reviewCount} review{editor.reviewCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </h2>
                  {editor.avgRating && <Stars rating={editor.avgRating} />}
                </div>
                <div className="space-y-3">
                  {editor.reviews.slice(0, 6).map(r => <ReviewCard key={r.id} review={r} />)}
                </div>
              </section>
            )}
          </div>

          {/* Right sidebar */}
          <aside className="space-y-5">
            {/* Stats */}
            <div className="border border-gray-200 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Stats</h3>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />Orders completed
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{editor.totalOrders}</span>
                </div>
                {editor.completionRate !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />Completion rate
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{editor.completionRate}%</span>
                  </div>
                )}
                {editor.avgResponseTime !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />Avg response
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {editor.avgResponseTime < 60
                        ? `${editor.avgResponseTime}m`
                        : `${Math.round(editor.avgResponseTime / 60)}h`}
                    </span>
                  </div>
                )}
                {editor.avgRating && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-400" />Rating
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{editor.avgRating} / 5</span>
                  </div>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="border border-gray-200 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Details</h3>
              <div className="space-y-2.5">
                {editor.location && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <span className="text-sm text-gray-700">{editor.location}</span>
                  </div>
                )}
                {expLabel && (
                  <div className="flex items-start gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <span className="text-sm text-gray-700">
                      {expLabel}{editor.yearsOfExperience ? ` · ${editor.yearsOfExperience} yr${editor.yearsOfExperience !== 1 ? "s" : ""}` : ""}
                    </span>
                  </div>
                )}
                {editor.niche && (
                  <div className="flex items-start gap-2">
                    <Zap className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <span className="text-sm text-gray-700 capitalize">{editor.niche}</span>
                  </div>
                )}
                {languages.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Globe className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <span className="text-sm text-gray-700">
                      {languages.map(l => l.language).join(", ")}
                    </span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-gray-700">
                    Member since {new Date(editor.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>
            </div>

            {/* CTA */}
            {editor.packages.length > 0 && (
              <div className="border border-indigo-100 bg-indigo-50 rounded-2xl p-4 text-center space-y-2">
                <p className="text-sm font-semibold text-indigo-900">
                  Starting from{" "}
                  {(Math.min(...editor.packages.map(p => p.price)) / 100).toLocaleString("en-IN", {
                    style: "currency", currency: "INR", maximumFractionDigits: 0
                  })}
                </p>
                <Link
                  href={`/client/orders/new?editorId=${editor.id}`}
                  className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                >
                  Get started
                </Link>
                <div className="relative flex items-center gap-2 py-1">
                  <div className="flex-1 h-px bg-indigo-100" />
                  <span className="text-[10px] text-indigo-300 font-medium">or</span>
                  <div className="flex-1 h-px bg-indigo-100" />
                </div>
                <RequestQuoteButton editorId={editor.id} />
              </div>
            )}
          </aside>
        </div>
      </div>

      {lightboxIndex !== null && (
        <PortfolioLightbox
          items={editor.portfolioItems}
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

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Heart, MessageCircle, Share2, Eye, ArrowLeftRight,
  Send, ShieldCheck, ChevronDown, Loader2, Trash2, Flag,
  Volume2, VolumeX, Bookmark, BookmarkCheck, X, Reply,
  RefreshCw, Pause, Play, UserPlus, UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getThumbnailUrl, getEmbedUrl, isExternalVideo } from "@/lib/portfolio-media";

// ── Types ──────────────────────────────────────────────────────────────────────

interface FeedItem {
  id: string;
  type: "video" | "image";
  url: string;
  beforeUrl: string | null;
  thumbnailUrl: string | null;
  title: string | null;
  description: string | null;
  category: string | null;
  isFeatured: boolean;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  orderId: string | null;
  createdAt: string;
  editorId: string;
  editorUserId: string;
  editorDisplayName: string;
  editorUserName: string | null;
  editorUserImage: string | null;
  isLiked: boolean;
  isSaved: boolean;
  isFollowed?: boolean;
  videoDurationSecs?: number | null;
}

interface Comment {
  id: string;
  text: string;
  createdAt: string;
  userId: string;
  userName: string | null;
  userImage: string | null;
  parentId: string | null;
}

interface LikerUser {
  userId: string;
  userName: string | null;
  userImage: string | null;
}

interface Props {
  currentUserId: string | null;
  currentUserName: string | null;
  currentUserImage: string | null;
}

type FeedTab = "foryou" | "following";

const CATEGORIES = [
  "All", "YouTube Video", "Reels / Shorts", "Wedding Video",
  "Corporate Video", "Music Video", "Podcast", "Documentary",
  "Ad / Commercial", "Gaming Video", "VFX", "Color Grading",
  "Motion Graphics", "Thumbnail",
];

function fmtCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// A native <video> tag can't play a YouTube/Vimeo page URL, only direct file
// URLs — so external videos get an on-tap iframe embed instead, with muted
// autoplay + loop params so it behaves like the native player it replaces.
function externalAutoplayUrl(url: string): string | null {
  const base = getEmbedUrl(url);
  if (!base) return null;
  const sep = base.includes("?") ? "&" : "?";
  if (base.includes("youtube.com")) {
    const id = base.split("/embed/")[1];
    return `${base}${sep}autoplay=1&mute=1&playsinline=1&loop=1&playlist=${id}`;
  }
  if (base.includes("vimeo.com")) {
    return `${base}${sep}autoplay=1&muted=1&loop=1&byline=0&title=0&portrait=0`;
  }
  return `${base}${sep}autoplay=1`;
}

function fmtDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ── Skeleton loader ────────────────────────────────────────────────────────────

function FeedSkeleton() {
  return (
    <div className="h-full bg-[#0a0a0a] flex overflow-hidden">
      <div className="hidden md:flex flex-col w-44 h-full border-r border-white/5 py-5 px-3 gap-2 shrink-0">
        <div className="h-5 w-20 bg-white/10 rounded-lg animate-pulse mb-3" />
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-8 rounded-lg bg-white/5 animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
        ))}
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="hidden md:flex items-center gap-6">
          <div className="rounded-2xl bg-white/5 animate-pulse" style={{ height: "78vh", aspectRatio: "9/16" }} />
          <div className="flex flex-col gap-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-12 h-12 rounded-full bg-white/5 animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
        </div>
        <div className="md:hidden w-full h-screen bg-white/5 animate-pulse" />
      </div>
    </div>
  );
}

// ── Who Liked Modal ────────────────────────────────────────────────────────────

function WhoLikedModal({ itemId, onClose }: { itemId: string; onClose: () => void }) {
  const [likers, setLikers] = useState<LikerUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/portfolio/like?portfolioItemId=${itemId}`)
      .then(r => r.json())
      .then(d => setLikers(Array.isArray(d) ? d.map((u: { userId?: string; id?: string; name?: string; image?: string }) => ({
        userId: u.userId ?? u.id ?? "",
        userName: u.name ?? null,
        userImage: u.image ?? null,
      })) : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [itemId]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm bg-[#111] rounded-t-2xl sm:rounded-2xl max-h-[60vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <p className="text-white text-sm font-bold">Liked by</p>
          <button onClick={onClose} className="text-white/50 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-white/30 animate-spin" /></div>
          ) : likers.length === 0 ? (
            <p className="text-white/40 text-sm text-center py-8">No likes yet</p>
          ) : likers.map(u => (
            <div key={u.userId} className="flex items-center gap-3">
              {u.userImage ? (
                <Image src={u.userImage} alt={u.userName ?? ""} width={32} height={32}
                  className="rounded-full object-cover shrink-0" unoptimized />
              ) : (
                <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-bold">{(u.userName ?? "?").slice(0, 1).toUpperCase()}</span>
                </div>
              )}
              <span className="text-white text-sm font-medium">{u.userName ?? "User"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Report Modal ───────────────────────────────────────────────────────────────

function ReportModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (reason: string) => void }) {
  const REASONS = [
    "Spam or misleading",
    "Inappropriate content",
    "Not real work / AI-generated",
    "Copyright infringement",
    "Other",
  ];
  const [selected, setSelected] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm bg-[#111] rounded-t-2xl sm:rounded-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <p className="text-white text-sm font-bold">Report this item</p>
          <button onClick={onClose} className="text-white/50 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-4 py-3 space-y-1">
          {REASONS.map(r => (
            <button key={r} onClick={() => setSelected(r)}
              className={cn(
                "w-full text-left text-sm px-3 py-2.5 rounded-xl transition-all",
                selected === r ? "bg-red-500/20 text-red-400 font-semibold" : "text-white/70 hover:bg-white/5"
              )}>
              {r}
            </button>
          ))}
        </div>
        <div className="px-4 pb-4 pt-1">
          <button
            disabled={!selected}
            onClick={() => { onSubmit(selected); onClose(); }}
            className="w-full py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold disabled:opacity-30 hover:bg-red-600 transition-colors">
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ReelCard ──────────────────────────────────────────────────────────────────

function ReelCard({
  item,
  isActive,
  currentUserId,
  currentUserImage,
  onView,
  onDelete,
}: {
  item: FeedItem;
  isActive: boolean;
  currentUserId: string | null;
  currentUserImage: string | null;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [liked, setLiked] = useState(item.isLiked);
  const [likesCount, setLikesCount] = useState(item.likesCount);
  const [saved, setSaved] = useState(item.isSaved);
  const [followed, setFollowed] = useState(item.isFollowed ?? false);
  const [commentsCount, setCommentsCount] = useState(item.commentsCount);
  const [viewsCount, setViewsCount] = useState(item.viewsCount);
  const [showComments, setShowComments] = useState(false);
  const [showWhoLiked, setShowWhoLiked] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ id: string; userName: string } | null>(null);
  const [posting, setPosting] = useState(false);
  const [sliderVal, setSliderVal] = useState(50);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [showPauseIcon, setShowPauseIcon] = useState(false);
  const [doubleTapHeart, setDoubleTapHeart] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [playingEmbed, setPlayingEmbed] = useState(false);
  const viewedRef = useRef(false);
  const pauseIconTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef(0);

  const isOwnItem = currentUserId === item.editorUserId;
  const external = item.type === "video" && isExternalVideo(item.url);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    if (isActive && !paused) {
      v.play().catch(() => {});
      if (!viewedRef.current) {
        viewedRef.current = true;
        onView(item.id);
        setViewsCount(c => c + 1);
      }
    } else {
      v.pause();
      if (!isActive) v.currentTime = 0;
    }
  }, [isActive, item.id, onView, paused]);

  useEffect(() => {
    const v = videoRef.current;
    if (v) v.muted = muted;
  }, [muted]);

  // External (YouTube/Vimeo) videos can't be scrubbed/controlled like a native
  // <video>, so they get their own view-on-active tracking instead of the
  // native <video>'s onPlay-based tracking.
  useEffect(() => {
    if (!external || !isActive || viewedRef.current) return;
    viewedRef.current = true;
    onView(item.id);
    setViewsCount(c => c + 1);
  }, [isActive, external, item.id, onView]);

  // The embed only actually renders while the card is active (see mediaContent
  // below) — swiping away unmounts it instead of leaving it playing off-screen,
  // and swiping back naturally resumes it without a re-tap.
  const showEmbed = playingEmbed && isActive;

  // Progress + duration
  useEffect(() => {
    const v = videoRef.current;
    if (!v || item.type !== "video") return;
    function onTimeUpdate() {
      if (v && v.duration) setProgress(v.currentTime / v.duration);
    }
    function onLoaded() {
      if (v && v.duration && isFinite(v.duration)) setVideoDuration(v.duration);
    }
    v.addEventListener("timeupdate", onTimeUpdate);
    v.addEventListener("loadedmetadata", onLoaded);
    if (v.duration && isFinite(v.duration)) setVideoDuration(v.duration);
    return () => {
      v.removeEventListener("timeupdate", onTimeUpdate);
      v.removeEventListener("loadedmetadata", onLoaded);
    };
  }, [item.type]);

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const v = videoRef.current;
    if (v && v.duration) {
      v.currentTime = ratio * v.duration;
      setProgress(ratio);
    }
  }

  function handleMediaTap() {
    if (item.type !== "video") return;
    const now = Date.now();
    const delta = now - lastTapRef.current;
    lastTapRef.current = now;

    if (delta < 300) {
      if (!liked && currentUserId) {
        setLiked(true);
        setLikesCount(c => c + 1);
        fetch("/api/portfolio/like", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ portfolioItemId: item.id }),
        }).catch(() => { setLiked(false); setLikesCount(c => Math.max(0, c - 1)); });
      }
      setDoubleTapHeart(true);
      setTimeout(() => setDoubleTapHeart(false), 900);
      return;
    }

    if (external) {
      if (!playingEmbed) setPlayingEmbed(true);
      return;
    }

    const v = videoRef.current;
    if (!v) return;
    if (paused) {
      setPaused(false);
    } else {
      setPaused(true);
      if (pauseIconTimer.current) clearTimeout(pauseIconTimer.current);
      setShowPauseIcon(true);
      pauseIconTimer.current = setTimeout(() => setShowPauseIcon(false), 1200);
    }
  }

  async function toggleLike() {
    if (!currentUserId) { toast.error("Sign in to like"); return; }
    const next = !liked;
    setLiked(next);
    setLikesCount(c => next ? c + 1 : Math.max(0, c - 1));
    await fetch("/api/portfolio/like", {
      method: next ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ portfolioItemId: item.id }),
    }).catch(() => {
      setLiked(!next);
      setLikesCount(c => next ? Math.max(0, c - 1) : c + 1);
    });
  }

  async function toggleSave() {
    if (!currentUserId) { toast.error("Sign in to save"); return; }
    const next = !saved;
    setSaved(next);
    await fetch("/api/portfolio/save", {
      method: next ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ portfolioItemId: item.id }),
    }).catch(() => setSaved(!next));
    if (next) toast.success("Saved to bookmarks");
  }

  async function toggleFollow() {
    if (!currentUserId) { toast.error("Sign in to follow editors"); return; }
    const next = !followed;
    setFollowed(next);
    await fetch("/api/follow", {
      method: next ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ editorId: item.editorId }),
    }).catch(() => setFollowed(!next));
    if (next) toast.success(`Following ${item.editorDisplayName}`);
  }

  async function openComments() {
    setShowComments(true);
    if (!commentsLoaded) {
      const res = await fetch(`/api/portfolio/comment?portfolioItemId=${item.id}`);
      if (res.ok) setComments(await res.json());
      setCommentsLoaded(true);
    }
  }

  async function postComment() {
    if (!currentUserId) { toast.error("Sign in to comment"); return; }
    if (!commentText.trim()) return;
    setPosting(true);
    const body: Record<string, string> = { portfolioItemId: item.id, text: commentText.trim() };
    if (replyingTo) body.parentId = replyingTo.id;
    const res = await fetch("/api/portfolio/comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const c = await res.json();
      setComments(prev => [c, ...prev]);
      setCommentsCount(n => n + 1);
      setCommentText("");
      setReplyingTo(null);
    } else {
      toast.error("Failed to post comment");
    }
    setPosting(false);
  }

  async function deleteComment(commentId: string) {
    const res = await fetch("/api/portfolio/comment", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId }),
    });
    if (res.ok) {
      setComments(prev => prev.filter(c => c.id !== commentId));
      setCommentsCount(n => Math.max(0, n - 1));
    }
  }

  async function flagComment(commentId: string) {
    await fetch("/api/portfolio/flag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId }),
    });
    toast.success("Comment reported — our team will review it");
  }

  async function reportItem(reason: string) {
    await fetch("/api/portfolio/flag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ portfolioItemId: item.id, reason }),
    }).catch(() => {});
    toast.success("Reported — thanks for keeping the feed clean");
  }

  async function handleDeleteItem() {
    if (!confirm("Delete this portfolio item? This cannot be undone.")) return;
    setDeleting(true);
    const res = await fetch(`/api/portfolio/${item.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Portfolio item deleted");
      onDelete(item.id);
    } else {
      toast.error("Failed to delete");
      setDeleting(false);
    }
  }

  function handleShare() {
    const url = `${window.location.origin}/feed?item=${item.id}`;
    if (navigator.share) {
      navigator.share({
        title: item.title ?? `${item.editorDisplayName}'s work on EditBridge`,
        text: item.description ?? undefined,
        url,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url)
        .then(() => toast.success("Link copied!"))
        .catch(() => toast.info(url));
    }
  }

  function startReply(comment: Comment) {
    setReplyingTo({ id: comment.id, userName: comment.userName ?? "User" });
    setCommentText(`@${comment.userName ?? "User"} `);
  }

  const hasBeforeAfter = !!item.beforeUrl && item.type === "image";
  const posterUrl = item.thumbnailUrl || (item.type === "video" ? getThumbnailUrl(item.url) : null);

  // Seekable progress bar — native video only; an embedded iframe can't be
  // scrubbed without the provider's JS player API.
  const progressBar = item.type === "video" && !external ? (
    <div
      className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20 cursor-pointer group"
      onClick={handleSeek}
    >
      <div className="h-full bg-white/80 group-hover:h-full transition-none pointer-events-none" style={{ width: `${progress * 100}%` }} />
      {/* Thumb */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ left: `calc(${progress * 100}% - 6px)` }}
      />
    </div>
  ) : null;

  // Duration label (current / total)
  const durationLabel = item.type === "video" && !external && videoDuration > 0 ? (
    <div className="absolute bottom-3 right-3 z-20 pointer-events-none font-mono text-[10px] text-white/50 tabular-nums select-none">
      {fmtDuration(progress * videoDuration)} / {fmtDuration(videoDuration)}
    </div>
  ) : null;

  const mediaContent = (
    <>
      {item.type === "video" && external ? (
        showEmbed ? (
          <iframe
            key={item.id}
            src={externalAutoplayUrl(item.url) ?? undefined}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="relative w-full h-full bg-[#111] cursor-pointer" onClick={handleMediaTap}>
            {posterUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={posterUrl} alt={item.title ?? "Video"} className="w-full h-full object-contain" />
            )}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                <Play className="w-7 h-7 text-white fill-white ml-1" />
              </div>
            </div>
          </div>
        )
      ) : item.type === "video" ? (
        <video
          ref={videoRef}
          src={item.url}
          loop
          muted
          playsInline
          preload="metadata"
          className="w-full h-full object-contain"
          onClick={handleMediaTap}
          style={{ cursor: "pointer" }}
        />
      ) : hasBeforeAfter ? (
        <div className="relative w-full h-full overflow-hidden select-none">
          <Image src={item.url} alt="After" fill className="object-contain" sizes="100vw" unoptimized />
          <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderVal}%` }}>
            <div className="relative w-full h-full" style={{ width: `${10000 / sliderVal}%` }}>
              <Image src={item.beforeUrl!} alt="Before" fill className="object-contain" sizes="100vw" unoptimized />
            </div>
          </div>
          <div className="absolute inset-y-0 z-10 flex items-center justify-center" style={{ left: `${sliderVal}%`, transform: "translateX(-50%)" }}>
            <div className="w-0.5 h-full bg-white/60" />
            <div className="absolute w-7 h-7 rounded-full bg-white/90 shadow-lg flex items-center justify-center">
              <ArrowLeftRight className="w-3.5 h-3.5 text-gray-700" />
            </div>
          </div>
          <span className="absolute bottom-28 left-3 text-[10px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded z-20">BEFORE</span>
          <span className="absolute bottom-28 right-3 text-[10px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded z-20">AFTER</span>
          <input type="range" min={0} max={100} value={sliderVal}
            onChange={e => setSliderVal(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30" />
        </div>
      ) : (
        <div className="relative w-full h-full bg-[#111]">
          <Image src={item.url} alt={item.title ?? "Portfolio"} fill className="object-contain" sizes="100vw" unoptimized />
        </div>
      )}

      {item.type === "video" && showPauseIcon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center animate-[fadeOut_1.2s_ease-out_forwards]">
            {paused ? <Play className="w-7 h-7 text-white fill-white" /> : <Pause className="w-7 h-7 text-white fill-white" />}
          </div>
        </div>
      )}

      {doubleTapHeart && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <Heart className="w-24 h-24 fill-red-500 text-red-500 animate-[heartBurst_0.9s_ease-out_forwards]" />
        </div>
      )}

      {progressBar}
      {durationLabel}
    </>
  );

  function renderActionBar(desktop?: boolean) {
    const btnCls = desktop
      ? "w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all active:scale-90"
      : "w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center transition-all active:scale-90";
    const labelCls = desktop
      ? "text-white/80 text-[11px] font-semibold"
      : "text-white text-[11px] font-semibold drop-shadow";

    return (
      <>
        {/* Like */}
        <button onClick={toggleLike} className="flex flex-col items-center gap-1">
          <div className={cn(btnCls, liked && "bg-red-500/20")}>
            <Heart className={cn("w-6 h-6 transition-all", liked ? "fill-red-500 text-red-500 scale-110" : "text-white")} />
          </div>
          <span
            role="button"
            onClick={e => { e.stopPropagation(); setShowWhoLiked(true); }}
            className={cn(labelCls, "hover:underline cursor-pointer")}
          >
            {fmtCount(likesCount)}
          </span>
        </button>

        {/* Comment */}
        <button onClick={openComments} className="flex flex-col items-center gap-1">
          <div className={btnCls}>
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <span className={labelCls}>{fmtCount(commentsCount)}</span>
        </button>

        {/* Save */}
        <button onClick={toggleSave} className="flex flex-col items-center gap-1">
          <div className={cn(btnCls, saved && "bg-yellow-500/20")}>
            {saved ? <BookmarkCheck className="w-5 h-5 text-yellow-400" /> : <Bookmark className="w-5 h-5 text-white" />}
          </div>
          <span className={labelCls}>{saved ? "Saved" : "Save"}</span>
        </button>

        {/* Share */}
        <button onClick={handleShare} className="flex flex-col items-center gap-1">
          <div className={btnCls}>
            <Share2 className="w-5 h-5 text-white" />
          </div>
          <span className={labelCls}>Share</span>
        </button>

        {/* Views */}
        <div className="flex flex-col items-center gap-1">
          <div className={btnCls}>
            <Eye className="w-5 h-5 text-white/60" />
          </div>
          <span className={cn(labelCls, "text-white/50")}>{fmtCount(viewsCount)}</span>
        </div>

        {/* Report (only when not own item and signed in) */}
        {!isOwnItem && currentUserId && (
          <button onClick={() => setShowReport(true)} className="flex flex-col items-center gap-1">
            <div className={btnCls}>
              <Flag className="w-4 h-4 text-white/40" />
            </div>
            <span className={cn(labelCls, "text-white/40 text-[10px]")}>Report</span>
          </button>
        )}
      </>
    );
  }

  function renderBottomInfo(compact?: boolean) {
    return (
      <div className={cn("space-y-2", compact ? "space-y-1.5" : "space-y-2.5")}>
        {/* Editor identity row */}
        <div className="flex items-center gap-2.5">
          <Link href={`/editor/${item.editorId}`} className="flex items-center gap-2.5 group flex-1 min-w-0">
            {item.editorUserImage ? (
              <Image src={item.editorUserImage} alt={item.editorDisplayName} width={36} height={36}
                className="rounded-full border-2 border-white/80 object-cover shrink-0" unoptimized />
            ) : (
              <div className="w-9 h-9 rounded-full bg-brand-primary flex items-center justify-center border-2 border-white/80 shrink-0">
                <span className="text-white text-sm font-bold">{item.editorDisplayName.slice(0, 1).toUpperCase()}</span>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-white text-sm font-bold leading-tight group-hover:underline truncate">{item.editorDisplayName}</p>
              {item.category && <p className="text-white/60 text-[11px] truncate">{item.category}</p>}
            </div>
          </Link>
          {/* Follow button — only when not own item */}
          {!isOwnItem && (
            <button
              onClick={e => { e.preventDefault(); toggleFollow(); }}
              className={cn(
                "shrink-0 flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all",
                followed
                  ? "border-white/30 text-white/50 bg-white/10"
                  : "border-white/80 text-white hover:bg-white hover:text-black"
              )}
            >
              {followed
                ? <><UserCheck className="w-3 h-3" /> Following</>
                : <><UserPlus className="w-3 h-3" /> Follow</>}
            </button>
          )}
        </div>

        {item.title && (
          <p className="text-white text-sm font-semibold leading-snug drop-shadow">{item.title}</p>
        )}
        {item.description && (
          <div>
            <p className={cn("text-white/75 text-xs leading-relaxed", !captionExpanded && "line-clamp-2")}>
              {item.description}
            </p>
            {item.description.length > 80 && (
              <button
                onClick={e => { e.stopPropagation(); setCaptionExpanded(v => !v); }}
                className="text-white/40 text-xs mt-0.5 hover:text-white/70 transition-colors"
              >
                {captionExpanded ? "less" : "...more"}
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {item.orderId && (
            <span className="flex items-center gap-1 bg-brand-primary/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
              <ShieldCheck className="w-2.5 h-2.5" /> Verified
            </span>
          )}
          {hasBeforeAfter && (
            <span className="flex items-center gap-1 bg-white/20 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm">
              <ArrowLeftRight className="w-2.5 h-2.5" /> Before/After
            </span>
          )}
        </div>

        {!isOwnItem && (
          <Link
            href={`/editor/${item.editorId}`}
            className="inline-flex items-center gap-2 bg-[var(--brand-client)] hover:bg-[var(--brand-client-hover)] text-white text-xs font-bold px-4 py-2 rounded-full transition-colors shadow-lg"
          >
            Hire {item.editorDisplayName.split(" ")[0]} →
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-[#0a0a0a]">

      {/* ══════════════════════════════════════════
          MOBILE layout
      ══════════════════════════════════════════ */}
      <div className="md:hidden absolute inset-0">
        <div className="absolute inset-0">{mediaContent}</div>
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />

        {item.type === "video" && !(external && showEmbed) && (
          <button onClick={() => setMuted(m => !m)}
            className="absolute top-16 right-3 z-20 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
            {muted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
          </button>
        )}
        {isOwnItem && (
          <button onClick={handleDeleteItem} disabled={deleting}
            className="absolute top-16 left-3 z-20 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-red-500/40 transition-colors">
            {deleting ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Trash2 className="w-4 h-4 text-white/70" />}
          </button>
        )}

        <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-20">
          {renderActionBar()}
        </div>

        <div className="absolute left-0 right-16 bottom-8 px-4 z-20">
          {renderBottomInfo()}
        </div>

        {showWhoLiked && <WhoLikedModal itemId={item.id} onClose={() => setShowWhoLiked(false)} />}
        {showReport && <ReportModal onClose={() => setShowReport(false)} onSubmit={reportItem} />}
        {showComments && (
          <CommentsDrawer
            comments={comments} commentsLoaded={commentsLoaded}
            commentText={commentText} replyingTo={replyingTo} posting={posting}
            currentUserId={currentUserId} currentUserImage={currentUserImage}
            onTextChange={setCommentText} onPost={postComment}
            onClose={() => { setShowComments(false); setReplyingTo(null); setCommentText(""); }}
            onDeleteComment={deleteComment} onFlagComment={flagComment}
            onReply={startReply} onCancelReply={() => { setReplyingTo(null); setCommentText(""); }}
          />
        )}
      </div>

      {/* ══════════════════════════════════════════
          DESKTOP layout
      ══════════════════════════════════════════ */}
      <div className="hidden md:flex h-full items-center justify-center gap-5 px-6">

        <div className="relative flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl"
          style={{ height: "calc(100% - 56px)", aspectRatio: "9/16" }}>

          <div className="absolute inset-0 bg-black">{mediaContent}</div>
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />

          {item.type === "video" && !(external && showEmbed) && (
            <button onClick={() => setMuted(m => !m)}
              className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors">
              {muted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
            </button>
          )}
          {isOwnItem && (
            <button onClick={handleDeleteItem} disabled={deleting}
              className="absolute top-3 left-3 z-20 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-red-500/40 transition-colors">
              {deleting ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Trash2 className="w-4 h-4 text-white/70" />}
            </button>
          )}

          <div className="absolute left-0 right-0 bottom-5 px-4 z-20">
            {renderBottomInfo(true)}
          </div>

          {showComments && (
            <CommentsDrawer
              comments={comments} commentsLoaded={commentsLoaded}
              commentText={commentText} replyingTo={replyingTo} posting={posting}
              currentUserId={currentUserId} currentUserImage={currentUserImage}
              onTextChange={setCommentText} onPost={postComment}
              onClose={() => { setShowComments(false); setReplyingTo(null); setCommentText(""); }}
              onDeleteComment={deleteComment} onFlagComment={flagComment}
              onReply={startReply} onCancelReply={() => { setReplyingTo(null); setCommentText(""); }}
            />
          )}
        </div>

        <div className="flex flex-col items-center gap-5 self-end pb-10 shrink-0">
          {renderActionBar(true)}
        </div>

        {showWhoLiked && <WhoLikedModal itemId={item.id} onClose={() => setShowWhoLiked(false)} />}
        {showReport && <ReportModal onClose={() => setShowReport(false)} onSubmit={reportItem} />}
      </div>
    </div>
  );
}

// ── CommentsDrawer ─────────────────────────────────────────────────────────────

function CommentsDrawer({
  comments, commentsLoaded, commentText, replyingTo, posting,
  currentUserId, currentUserImage,
  onTextChange, onPost, onClose, onDeleteComment, onFlagComment, onReply, onCancelReply,
}: {
  comments: Comment[];
  commentsLoaded: boolean;
  commentText: string;
  replyingTo: { id: string; userName: string } | null;
  posting: boolean;
  currentUserId: string | null;
  currentUserImage: string | null;
  onTextChange: (t: string) => void;
  onPost: () => void;
  onClose: () => void;
  onDeleteComment: (id: string) => void;
  onFlagComment: (id: string) => void;
  onReply: (comment: Comment) => void;
  onCancelReply: () => void;
}) {
  return (
    <div
      className="absolute inset-x-0 bottom-0 z-40 flex flex-col bg-[#111] rounded-t-2xl max-h-[70%]"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <p className="text-white text-sm font-bold">{comments.length} comments</p>
        <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {!commentsLoaded ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-white/40 text-sm text-center py-8">No comments yet. Be the first!</p>
        ) : (() => {
          const topLevel = comments.filter(c => !c.parentId);
          const replies = comments.filter(c => !!c.parentId);
          const repliesByParent = replies.reduce<Record<string, Comment[]>>((acc, r) => {
            acc[r.parentId!] = acc[r.parentId!] ?? [];
            acc[r.parentId!].push(r);
            return acc;
          }, {});

          const CommentRow = ({ c, isReply }: { c: Comment; isReply?: boolean }) => (
            <div className={cn("flex gap-3", isReply && "ml-8 mt-2")}>
              {c.userImage ? (
                <Image src={c.userImage} alt={c.userName ?? ""} width={isReply ? 22 : 28} height={isReply ? 22 : 28}
                  className="rounded-full object-cover shrink-0 mt-0.5" unoptimized />
              ) : (
                <div className={cn("rounded-full bg-brand-primary flex items-center justify-center shrink-0 mt-0.5", isReply ? "w-[22px] h-[22px]" : "w-7 h-7")}>
                  <span className="text-white text-[10px] font-bold">{(c.userName ?? "?").slice(0, 1).toUpperCase()}</span>
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-xs font-semibold">{c.userName ?? "User"}</span>
                    <span className="text-white/30 text-[10px]">{timeAgo(c.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentUserId && !isReply && (
                      <button onClick={() => onReply(c)} className="text-white/30 hover:text-blue-400 transition-colors" title="Reply">
                        <Reply className="w-3 h-3" />
                      </button>
                    )}
                    {currentUserId === c.userId ? (
                      <button onClick={() => onDeleteComment(c.id)} className="text-white/20 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : currentUserId ? (
                      <button onClick={() => onFlagComment(c.id)} className="text-white/20 hover:text-orange-400 transition-colors" title="Report">
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
                <p className="text-white/80 text-sm mt-0.5 leading-relaxed">{c.text}</p>
              </div>
            </div>
          );

          return topLevel.map(c => (
            <div key={c.id} className="space-y-0">
              <CommentRow c={c} />
              {(repliesByParent[c.id] ?? []).map(r => (
                <CommentRow key={r.id} c={r} isReply />
              ))}
            </div>
          ));
        })()}
      </div>

      {replyingTo && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-white/5 border-t border-white/10">
          <span className="text-white/50 text-xs">Replying to <span className="text-blue-400">@{replyingTo.userName}</span></span>
          <button onClick={onCancelReply} className="text-white/30 hover:text-white transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 px-4 py-3 border-t border-white/10">
        {currentUserImage ? (
          <Image src={currentUserImage} alt="" width={28} height={28}
            className="rounded-full object-cover shrink-0" unoptimized />
        ) : (
          <div className="w-7 h-7 rounded-full bg-gray-600 flex items-center justify-center shrink-0">
            <span className="text-white text-[10px] font-bold">?</span>
          </div>
        )}
        <input
          value={commentText}
          onChange={e => onTextChange(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onPost(); } }}
          placeholder={currentUserId ? (replyingTo ? `Reply to @${replyingTo.userName}…` : "Add a comment…") : "Sign in to comment"}
          disabled={!currentUserId || posting}
          maxLength={500}
          className="flex-1 bg-white/10 text-white placeholder-white/30 text-sm px-3 py-2 rounded-full outline-none focus:bg-white/15 transition-colors disabled:opacity-40"
          autoFocus={!!replyingTo}
        />
        <button
          onClick={onPost}
          disabled={!commentText.trim() || posting || !currentUserId}
          className="shrink-0 text-blue-400 disabled:opacity-30 transition-opacity"
        >
          {posting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}

// ── FeedClient ─────────────────────────────────────────────────────────────────

export function FeedClient({ currentUserId, currentUserName: _currentUserName, currentUserImage }: Props) {
  const searchParams = useSearchParams();
  const deepLinkItemId = searchParams.get("item");

  const [items, setItems] = useState<FeedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState("All");
  const [feedTab, setFeedTab] = useState<FeedTab>("foryou");
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [newItemsAvailable, setNewItemsAvailable] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const viewedItems = useRef<Set<string>>(new Set());
  const topItemIdRef = useRef<string | null>(null);
  const deepLinkScrolledRef = useRef(false);

  // Swipe hint for first-time visitors (mobile only)
  useEffect(() => {
    try {
      if (!localStorage.getItem("eb_feed_visited")) {
        setShowSwipeHint(true);
        localStorage.setItem("eb_feed_visited", "1");
        const t = setTimeout(() => setShowSwipeHint(false), 3000);
        return () => clearTimeout(t);
      }
    } catch {}
  }, []);

  // Fetch category counts
  useEffect(() => {
    fetch("/api/feed/counts")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && typeof d === "object") setCategoryCounts(d); })
      .catch(() => {});
  }, []);

  const getViewedSet = useCallback((): Set<string> => {
    try {
      const raw = localStorage.getItem("eb_viewed_items");
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch { return new Set(); }
  }, []);

  const markViewed = useCallback((id: string) => {
    try {
      const s = getViewedSet();
      s.add(id);
      const arr = [...s].slice(-500);
      localStorage.setItem("eb_viewed_items", JSON.stringify(arr));
    } catch {}
  }, [getViewedSet]);

  const handleView = useCallback((id: string) => {
    if (viewedItems.current.has(id)) return;
    if (!currentUserId) {
      const anonViewed = getViewedSet();
      if (anonViewed.has(id)) return;
      markViewed(id);
    }
    viewedItems.current.add(id);
    fetch("/api/portfolio/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ portfolioItemId: id }),
    }).catch(() => {});
  }, [currentUserId, getViewedSet, markViewed]);

  async function loadFeed(cursor?: string, category?: string, tab?: FeedTab): Promise<{ feed: FeedItem[]; nextCursor: string | null }> {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    if (category && category !== "All") params.set("category", category);
    if (tab === "following") params.set("following", "true");
    const res = await fetch(`/api/feed?${params}`);
    if (!res.ok) return { feed: [], nextCursor: null };
    return res.json();
  }

  useEffect(() => {
    setLoading(true);
    setItems([]);
    setNextCursor(null);
    setActiveIndex(0);
    setNewItemsAvailable(false);
    deepLinkScrolledRef.current = false;
    viewedItems.current.clear();

    if (containerRef.current) containerRef.current.scrollTop = 0;

    loadFeed(undefined, activeCategory, feedTab).then(data => {
      setItems(data.feed);
      setNextCursor(data.nextCursor);
      topItemIdRef.current = data.feed[0]?.id ?? null;
    }).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, refreshKey, feedTab]);

  useEffect(() => {
    if (!deepLinkItemId || deepLinkScrolledRef.current || loading) return;

    const scrollToIdx = (list: FeedItem[]) => {
      const idx = list.findIndex(i => i.id === deepLinkItemId);
      if (idx === -1) return false;
      deepLinkScrolledRef.current = true;
      const container = containerRef.current;
      if (!container) return true;
      const card = container.querySelector(`[data-index="${idx}"]`) as HTMLElement | null;
      if (card) { card.scrollIntoView({ behavior: "instant" }); setActiveIndex(idx); }
      return true;
    };

    if (items.length === 0) return;
    if (scrollToIdx(items)) return;

    fetch(`/api/feed/item/${deepLinkItemId}`)
      .then(r => r.ok ? r.json() : null)
      .then(item => {
        if (!item) return;
        setItems(prev => {
          if (prev.find(i => i.id === item.id)) return prev;
          const next = [item, ...prev];
          setTimeout(() => scrollToIdx(next), 50);
          return next;
        });
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, deepLinkItemId, loading]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.index);
            setActiveIndex(idx);
          }
        });
      },
      { root: container, threshold: 0.6 }
    );

    return () => { observerRef.current?.disconnect(); };
  }, []);

  useEffect(() => {
    const observer = observerRef.current;
    const container = containerRef.current;
    if (!observer || !container) return;

    const cards = container.querySelectorAll("[data-index]");
    cards.forEach(card => observer.observe(card));
  }, [items]);

  useEffect(() => {
    if (activeIndex >= items.length - 3 && nextCursor && !loadingMore) {
      setLoadingMore(true);
      loadFeed(nextCursor, activeCategory, feedTab).then(data => {
        setItems(prev => [...prev, ...data.feed]);
        setNextCursor(data.nextCursor);
      }).finally(() => setLoadingMore(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, items.length, nextCursor, loadingMore, activeCategory, feedTab]);

  useEffect(() => {
    if (!topItemIdRef.current) return;
    const interval = setInterval(async () => {
      const data = await loadFeed(undefined, activeCategory, feedTab);
      if (data.feed.length > 0 && data.feed[0].id !== topItemIdRef.current) {
        setNewItemsAvailable(true);
      }
    }, 60_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, feedTab, topItemIdRef.current]);

  function handleShowNewItems() {
    setNewItemsAvailable(false);
    setRefreshKey(k => k + 1);
    if (containerRef.current) containerRef.current.scrollTop = 0;
  }

  function handleDeleteItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  if (loading) return <FeedSkeleton />;

  if (items.length === 0) {
    return (
      <div className="h-full bg-black flex flex-col items-center justify-center gap-4 text-center px-6">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
          <Eye className="w-8 h-8 text-white/20" />
        </div>
        <p className="text-white/60 text-sm">
          {feedTab === "following"
            ? "Follow some editors to see their work here."
            : activeCategory === "All"
              ? "No portfolio items yet. Editors will start posting their work soon."
              : `No items in "${activeCategory}" yet.`}
        </p>
        {feedTab === "following" && (
          <button onClick={() => setFeedTab("foryou")} className="text-blue-400 text-sm hover:underline">
            Browse all →
          </button>
        )}
        {feedTab !== "following" && activeCategory !== "All" && (
          <button onClick={() => setActiveCategory("All")} className="text-blue-400 text-sm hover:underline">
            Show all →
          </button>
        )}
        <Link href="/browse" className="text-blue-400 text-sm hover:underline">Browse editors →</Link>
      </div>
    );
  }

  // Preload next card's video
  const nextVideoItem = items[activeIndex + 1];
  const preloadVideo = nextVideoItem?.type === "video" ? (
    <video key={nextVideoItem.id} src={nextVideoItem.url} preload="auto" muted playsInline className="hidden" />
  ) : null;

  return (
    <div className="relative h-full bg-[#0a0a0a] overflow-hidden flex">
      {preloadVideo}

      {/* ── Desktop category sidebar ─────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-44 shrink-0 h-full border-r border-white/5 overflow-y-auto py-4 px-3" style={{ scrollbarWidth: "none" }}>
        <Link href="/" className="text-white font-bold text-base tracking-tight mb-1 px-2">EditBridge</Link>
        <p className="text-white/30 text-[10px] uppercase tracking-widest px-2 mb-3">Feed</p>

        {/* For You / Following tabs */}
        <div className="flex gap-1 mb-4 px-1">
          <button
            onClick={() => setFeedTab("foryou")}
            className={cn(
              "flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-all",
              feedTab === "foryou" ? "bg-white text-black" : "text-white/50 hover:text-white hover:bg-white/8"
            )}
          >
            For You
          </button>
          <button
            onClick={() => {
              if (!currentUserId) { toast.error("Sign in to see your following feed"); return; }
              setFeedTab("following");
            }}
            className={cn(
              "flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-all",
              feedTab === "following" ? "bg-white text-black" : "text-white/50 hover:text-white hover:bg-white/8"
            )}
          >
            Following
          </button>
        </div>

        {/* Categories */}
        <div className="space-y-0.5">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); setFeedTab("foryou"); }}
              className={cn(
                "w-full text-left flex items-center gap-1 text-[12.5px] font-medium px-3 py-2 rounded-lg transition-all",
                activeCategory === cat && feedTab === "foryou"
                  ? "bg-white text-black font-semibold"
                  : "text-white/50 hover:text-white hover:bg-white/8"
              )}
            >
              <span className="flex-1 truncate">{cat}</span>
              {categoryCounts[cat] && cat !== "All" && (
                <span className="text-[10px] text-white/25 tabular-nums shrink-0">
                  {fmtCount(categoryCounts[cat])}
                </span>
              )}
            </button>
          ))}
        </div>

        {!currentUserId && (
          <div className="mt-auto pt-4">
            <Link href="/login"
              className="block text-center text-xs bg-brand-primary text-white px-3 py-2 rounded-xl font-semibold hover:bg-[var(--brand-client-hover)] transition-colors">
              Sign in
            </Link>
          </div>
        )}
      </aside>

      {/* ── Feed column ──────────────────────────────────────────── */}
      <div className="relative flex-1 h-full overflow-hidden">

        {/* Mobile top bar */}
        <div className="md:hidden absolute top-0 inset-x-0 z-30 pointer-events-none">
          <div className="flex items-center justify-between px-4 pt-4 pb-1 pointer-events-auto">
            <Link href="/" className="text-white font-bold text-lg tracking-tight">EditBridge</Link>
            <div className="flex items-center gap-2">
              {/* For You / Following toggle */}
              <div className="flex gap-1 bg-white/10 rounded-full p-0.5">
                <button
                  onClick={() => setFeedTab("foryou")}
                  className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full transition-all",
                    feedTab === "foryou" ? "bg-white text-black" : "text-white/60")}
                >
                  For You
                </button>
                <button
                  onClick={() => {
                    if (!currentUserId) { toast.error("Sign in first"); return; }
                    setFeedTab("following");
                  }}
                  className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full transition-all",
                    feedTab === "following" ? "bg-white text-black" : "text-white/60")}
                >
                  Following
                </button>
              </div>
              {!currentUserId && (
                <Link href="/login" className="text-xs bg-brand-primary text-white px-3 py-1.5 rounded-full font-semibold hover:bg-[var(--brand-client-hover)] transition-colors">
                  Sign in
                </Link>
              )}
            </div>
          </div>
          {/* Mobile category pills */}
          <div className="pointer-events-auto overflow-x-auto px-4 pb-2 flex gap-2" style={{ scrollbarWidth: "none" }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setFeedTab("foryou"); }}
                className={cn(
                  "shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-all",
                  activeCategory === cat && feedTab === "foryou"
                    ? "bg-white text-black"
                    : "bg-white/10 text-white/70 hover:bg-white/20 backdrop-blur-sm"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* New items banner */}
        {newItemsAvailable && (
          <div className="absolute top-24 md:top-4 inset-x-0 z-30 flex justify-center pointer-events-none">
            <button
              onClick={handleShowNewItems}
              className="pointer-events-auto flex items-center gap-2 bg-brand-primary text-white text-xs font-bold px-4 py-2 rounded-full shadow-xl hover:bg-[var(--brand-client-hover)] transition-colors animate-bounce"
            >
              <RefreshCw className="w-3.5 h-3.5" /> New items available
            </button>
          </div>
        )}

        {/* Swipe-up hint (first-time mobile visitors) */}
        {showSwipeHint && (
          <div className="md:hidden absolute bottom-28 inset-x-0 z-40 flex flex-col items-center gap-2 pointer-events-none">
            <p className="text-white/50 text-xs font-medium tracking-wide">Swipe up for more</p>
            <div className="w-6 h-6 rounded-full border-2 border-white/40 flex items-center justify-center animate-bounce">
              <ChevronDown className="w-3.5 h-3.5 text-white/50" />
            </div>
          </div>
        )}

        {/* Scroll container */}
        <div
          ref={containerRef}
          className="h-full overflow-y-scroll snap-y snap-mandatory"
          style={{ scrollbarWidth: "none" }}
          onScroll={() => { if (showSwipeHint) setShowSwipeHint(false); }}
        >
          {items.map((item, idx) => {
            // DOM virtualization: only fully render cards within ±2 of active
            const isNear = Math.abs(idx - activeIndex) <= 2;
            return (
              <div key={item.id} data-index={idx} className="w-full h-full snap-start">
                {isNear ? (
                  <ReelCard
                    item={item}
                    isActive={activeIndex === idx}
                    currentUserId={currentUserId}
                    currentUserImage={currentUserImage}
                    onView={handleView}
                    onDelete={handleDeleteItem}
                  />
                ) : (
                  <div className="w-full h-full bg-[#0a0a0a]" />
                )}
              </div>
            );
          })}

          {loadingMore && (
            <div className="w-full h-24 flex items-center justify-center snap-start">
              <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
            </div>
          )}

          {!nextCursor && items.length > 0 && (
            <div className="w-full h-24 flex items-center justify-center snap-start">
              <p className="text-white/20 text-xs">You&apos;ve seen everything!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

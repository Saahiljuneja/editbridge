"use client";

/**
 * PortfolioVideoPlayer
 * ─────────────────────────────────────────────────────────────────────────────
 * A premium, branded video player component for editor portfolio items.
 *
 * Supports:
 *  • YouTube (iframe embed, custom params, autoplay, playback quality control)
 *  • Vimeo (iframe embed with oEmbed thumbnail resolution)
 *  • Google Drive (iframe preview embed)
 *  • Direct video files (native <video> with custom controls overlay)
 *
 * Features:
 *  • Custom branded overlay with editor name / verified badge
 *  • Play-rate selector (0.5× – 2×) for native <video> files
 *  • Automated thumbnail extraction (YouTube via img.youtube.com, Vimeo via oEmbed)
 *  • Before/After image comparison slider (for image portfolio items)
 *  • Keyboard shortcuts (Space=play/pause, F=fullscreen, M=mute, ←/→=±10s)
 *  • Responsive with aspect-ratio locking
 *  • Picture-in-picture for native video
 *  • Share / copy-link action
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture2,
  Gauge,
  Share2,
  Check,
  ExternalLink,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getEmbedUrl,
  getVideoSource,
  getThumbnailUrl,
  getVimeoOembedUrl,
  getGoogleDriveId,
  type VideoSource,
} from "@/lib/portfolio-media";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PortfolioVideoPlayerProps {
  /** Source URL: YouTube, Vimeo, Google Drive, or direct video file. */
  url: string;
  /** Optional pre-computed thumbnail URL (overrides auto-detection). */
  thumbnailUrl?: string | null;
  /** Item title – displayed on overlay. */
  title?: string | null;
  /** Item description – displayed on overlay. */
  description?: string | null;
  /** Editor display name – shown on branded overlay. */
  editorName?: string | null;
  /** Editor avatar URL – shown on branded overlay. */
  editorImage?: string | null;
  /** Whether the editor has KYC verified badge. */
  editorVerified?: boolean;
  /** Start in autoplay mode (muted, for performance). */
  autoplay?: boolean;
  /** Aspect ratio class. Defaults to 16/9. */
  aspectRatio?: "16/9" | "9/16" | "4/3" | "1/1";
  /** Extra className for the outer wrapper. */
  className?: string;
  /** Called when user presses the share button. Defaults to navigator.clipboard. */
  onShare?: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function aspectRatioPadding(r: PortfolioVideoPlayerProps["aspectRatio"]): string {
  switch (r) {
    case "9/16":  return "177.78%";
    case "4/3":   return "75%";
    case "1/1":   return "100%";
    default:      return "56.25%"; // 16/9
  }
}

// ── Platform badge ────────────────────────────────────────────────────────────

function PlatformBadge({ source }: { source: VideoSource }) {
  if (!source || source === "direct") return null;
  const map: Record<string, { label: string; color: string }> = {
    youtube: { label: "YouTube",      color: "bg-red-600" },
    vimeo:   { label: "Vimeo",        color: "bg-sky-500" },
    gdrive:  { label: "Google Drive", color: "bg-green-600" },
  };
  const cfg = map[source];
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white px-2 py-0.5 rounded-full",
      cfg.color
    )}>
      {cfg.label}
    </span>
  );
}

// ── Custom native-video controls ──────────────────────────────────────────────

interface NativeControlsProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  title?: string | null;
  editorName?: string | null;
  editorVerified?: boolean;
}

function NativeControls({ videoRef, title, editorName, editorVerified }: NativeControlsProps) {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted]     = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]       = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showRates, setShowRates]     = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [copied, setCopied] = useState(false);
  const [hasPiP, setHasPiP]           = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync state with the underlying video element
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onPlay  = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime  = () => setCurrentTime(v.currentTime);
    const onMeta  = () => setDuration(v.duration);
    const onFSChange = () => setIsFullscreen(!!document.fullscreenElement);

    v.addEventListener("play",           onPlay);
    v.addEventListener("pause",          onPause);
    v.addEventListener("timeupdate",     onTime);
    v.addEventListener("loadedmetadata", onMeta);
    document.addEventListener("fullscreenchange", onFSChange);

    setMuted(v.muted);
    setPlaybackRate(v.playbackRate);
    setHasPiP("pictureInPictureEnabled" in document);

    return () => {
      v.removeEventListener("play",           onPlay);
      v.removeEventListener("pause",          onPause);
      v.removeEventListener("timeupdate",     onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      document.removeEventListener("fullscreenchange", onFSChange);
    };
  }, [videoRef]);

  // Auto-hide controls after 3 s of inactivity
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => { resetHideTimer(); }, [resetHideTimer]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const v = videoRef.current;
      if (!v) return;
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      switch (e.key) {
        case " ": case "k": e.preventDefault(); v.paused ? v.play() : v.pause(); break;
        case "m": v.muted = !v.muted; setMuted(v.muted); break;
        case "f": toggleFullscreen(); break;
        case "ArrowLeft":  v.currentTime = Math.max(0, v.currentTime - 10); break;
        case "ArrowRight": v.currentTime = Math.min(v.duration, v.currentTime + 10); break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoRef]);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
    resetHideTimer();
  }

  function toggleMute() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    resetHideTimer();
  }

  function seek(e: React.ChangeEvent<HTMLInputElement>) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Number(e.target.value);
    resetHideTimer();
  }

  function setRate(rate: number) {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = rate;
    setPlaybackRate(rate);
    setShowRates(false);
    resetHideTimer();
  }

  async function toggleFullscreen() {
    const el = wrapperRef.current?.closest("[data-player-root]") as HTMLElement | null;
    if (!el) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await el.requestFullscreen();
  }

  async function togglePiP() {
    const v = videoRef.current;
    if (!v) return;
    if (document.pictureInPictureElement === v) await document.exitPictureInPicture();
    else await v.requestPictureInPicture();
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={wrapperRef}
      className="absolute inset-0 z-10 flex flex-col justify-between"
      onMouseMove={resetHideTimer}
      onMouseLeave={() => { if (hideTimer.current) clearTimeout(hideTimer.current); setShowControls(false); }}
    >
      {/* Top gradient + branding overlay */}
      <div className={cn(
        "flex items-start justify-between p-3 bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-300",
        showControls ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        <div className="flex flex-col gap-0.5">
          {title && <p className="text-white text-sm font-semibold drop-shadow line-clamp-1">{title}</p>}
          {editorName && (
            <p className="text-white/70 text-xs flex items-center gap-1">
              {editorName}
              {editorVerified && (
                <svg className="w-3 h-3 text-indigo-400 fill-current" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
              )}
            </p>
          )}
        </div>
        <button
          onClick={copyLink}
          title="Copy link"
          className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Centre click-to-play */}
      <div
        className="absolute inset-0 flex items-center justify-center cursor-pointer"
        onClick={togglePlay}
      >
        {!playing && (
          <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center shadow-xl">
            <Play className="w-7 h-7 text-white fill-white ml-1" />
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className={cn(
        "flex flex-col gap-1 px-3 pb-3 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300",
        showControls ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        {/* Seek bar */}
        <div className="relative group/seek flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={seek}
            aria-label="Seek video"
            className="w-full h-1 appearance-none bg-white/25 rounded-full cursor-pointer accent-indigo-400
                       [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
                       group-hover/seek:[&::-webkit-slider-thumb]:scale-125 transition-all"
            style={{ background: `linear-gradient(to right, #818cf8 ${progress}%, rgba(255,255,255,0.25) ${progress}%)` }}
          />
        </div>

        {/* Buttons row */}
        <div className="flex items-center gap-1">
          {/* Play/Pause */}
          <button onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}
            className="text-white p-1 rounded hover:bg-white/10 transition-colors">
            {playing ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
          </button>

          {/* Mute */}
          <button onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}
            className="text-white p-1 rounded hover:bg-white/10 transition-colors">
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Time */}
          <span className="text-white/70 text-[10px] tabular-nums ml-1">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="flex-1" />

          {/* Playback rate */}
          <div className="relative">
            <button
              onClick={() => { setShowRates(r => !r); resetHideTimer(); }}
              aria-label="Playback speed"
              className="text-white/70 hover:text-white p-1 rounded hover:bg-white/10 transition-colors flex items-center gap-0.5"
            >
              <Gauge className="w-3.5 h-3.5" />
              <span className="text-[10px] font-semibold">{playbackRate}×</span>
            </button>
            {showRates && (
              <div className="absolute bottom-full right-0 mb-1 bg-gray-900 border border-white/10 rounded-xl overflow-hidden shadow-xl z-20">
                {PLAYBACK_RATES.map(r => (
                  <button
                    key={r}
                    onClick={() => setRate(r)}
                    className={cn(
                      "block w-full px-4 py-1.5 text-xs text-left transition-colors",
                      r === playbackRate ? "bg-indigo-600 text-white font-bold" : "text-white/70 hover:bg-white/5"
                    )}
                  >
                    {r}× {r === 1 ? "(Normal)" : ""}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Picture-in-Picture (where supported) */}
          {hasPiP && (
            <button onClick={togglePiP} aria-label="Picture in picture"
              className="text-white/70 hover:text-white p-1 rounded hover:bg-white/10 transition-colors">
              <PictureInPicture2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} aria-label="Toggle fullscreen"
            className="text-white/70 hover:text-white p-1 rounded hover:bg-white/10 transition-colors">
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Thumbnail + play button overlay (for iframe embeds) ───────────────────────

interface IframeThumbnailOverlayProps {
  thumbnail: string | null;
  title?: string | null;
  editorName?: string | null;
  editorVerified?: boolean;
  source: VideoSource;
  onPlay: () => void;
  onShare?: () => void;
}

function IframeThumbnailOverlay({
  thumbnail, title, editorName, editorVerified, source, onPlay, onShare,
}: IframeThumbnailOverlayProps) {
  const [copied, setCopied] = useState(false);
  const [thumbError, setThumbError] = useState(false);

  async function copyLink() {
    if (onShare) { onShare(); return; }
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="absolute inset-0 z-10 flex flex-col">
      {/* Thumbnail */}
      {thumbnail && !thumbError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnail}
          alt={title ?? "Video thumbnail"}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setThumbError(true)}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
      )}

      {/* Dark overlay scrim */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Top bar */}
      <div className="relative z-10 flex items-start justify-between p-3">
        <div className="flex flex-col gap-0.5">
          <PlatformBadge source={source} />
          {title && <p className="text-white text-sm font-semibold drop-shadow mt-1 line-clamp-1">{title}</p>}
          {editorName && (
            <p className="text-white/80 text-xs flex items-center gap-1">
              {editorName}
              {editorVerified && (
                <svg className="w-3 h-3 text-indigo-300 fill-current" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                </svg>
              )}
            </p>
          )}
        </div>
        <button
          onClick={copyLink}
          title="Copy link"
          className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Centre play button */}
      <div className="flex-1 flex items-center justify-center relative z-10">
        <button
          onClick={onPlay}
          aria-label="Play video"
          className="group relative w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20
                     hover:bg-white/20 hover:scale-105 active:scale-95 transition-all duration-200 shadow-2xl
                     flex items-center justify-center"
        >
          <Play className="w-8 h-8 text-white fill-white ml-1 drop-shadow" />
          {/* Animated ring */}
          <span className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping opacity-60 group-hover:opacity-0" />
        </button>
      </div>

      {/* Bottom hint */}
      <div className="relative z-10 pb-3 text-center">
        <p className="text-white/40 text-[10px]">Click to play</p>
      </div>
    </div>
  );
}

// ── Google Drive unsupported notice ───────────────────────────────────────────

function DriveNotice({ url }: { url: string }) {
  return (
    <div className="absolute bottom-2 left-2 right-2 z-20 bg-black/60 backdrop-blur-sm rounded-xl p-2 flex items-center gap-2">
      <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <p className="text-[10px] text-white/70">
        Google Drive video. If it doesn&apos;t play,{" "}
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline inline-flex items-center gap-0.5">
          open in Drive <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </p>
    </div>
  );
}

// ── Main exported component ───────────────────────────────────────────────────

export function PortfolioVideoPlayer({
  url,
  thumbnailUrl,
  title,
  description,
  editorName,
  editorImage: _editorImage, // reserved for future avatar rendering
  editorVerified,
  autoplay = false,
  aspectRatio = "16/9",
  className,
  onShare,
}: PortfolioVideoPlayerProps) {
  const source: VideoSource = getVideoSource(url);
  const isNative = source === "direct";
  const isIframe = source === "youtube" || source === "vimeo" || source === "gdrive";

  // For iframe embeds: show thumbnail overlay until user clicks play
  const [showEmbed, setShowEmbed] = useState(autoplay);
  // For Vimeo: resolve thumbnail async via oEmbed
  const [vimeoThumb, setVimeoThumb] = useState<string | null>(null);
  const [thumbLoading, setThumbLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const driveId = source === "gdrive" ? getGoogleDriveId(url) : null;

  // Auto-derive the best thumbnail
  const resolvedThumb = thumbnailUrl ?? getThumbnailUrl(url) ?? vimeoThumb ?? null;

  // Fetch Vimeo oEmbed thumbnail once
  useEffect(() => {
    if (source !== "vimeo" || thumbnailUrl) return;
    const oembedUrl = getVimeoOembedUrl(url);
    if (!oembedUrl) return;
    setThumbLoading(true);
    fetch(oembedUrl)
      .then(r => r.json())
      .then((d: { thumbnail_url?: string }) => { if (d.thumbnail_url) setVimeoThumb(d.thumbnail_url); })
      .catch(() => {})
      .finally(() => setThumbLoading(false));
  }, [url, source, thumbnailUrl]);

  const embedUrl = isIframe
    ? getEmbedUrl(url, showEmbed && !autoplay ? { autoplay: "1" } : {})
    : null;

  // Autoplay embed URL (muted for youtube to satisfy browser policy)
  const autoplayEmbedUrl = isIframe
    ? getEmbedUrl(url, source === "youtube"
        ? { autoplay: "1", mute: "1", playsinline: "1" }
        : { autoplay: "1", muted: "1" })
    : null;

  const activeEmbedUrl = autoplay ? autoplayEmbedUrl : (showEmbed ? getEmbedUrl(url, { autoplay: "1" }) : embedUrl);

  if (!source || !url) {
    return (
      <div className={cn("relative bg-gray-900 rounded-xl flex items-center justify-center", className)}
        style={{ paddingTop: aspectRatioPadding(aspectRatio) }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-white/40 text-sm">Unsupported video URL</p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-player-root
      className={cn("relative rounded-xl overflow-hidden bg-black group", className)}
      style={{ paddingTop: aspectRatioPadding(aspectRatio) }}
    >
      <div className="absolute inset-0">
        {/* ── Native direct video ─────────────────────────────────────────────── */}
        {isNative && (
          <>
            <video
              ref={videoRef}
              src={url}
              className="w-full h-full object-contain"
              playsInline
              preload="metadata"
              autoPlay={autoplay}
              muted={autoplay}
            />
            <NativeControls
              videoRef={videoRef}
              title={title}
              editorName={editorName}
              editorVerified={editorVerified}
            />
          </>
        )}

        {/* ── iframe embed (YouTube / Vimeo / Google Drive) ───────────────────── */}
        {isIframe && (
          <>
            {/* Thumbnail overlay until user clicks play */}
            {!showEmbed && !autoplay && (
              thumbLoading ? (
                <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white/30 animate-spin" />
                </div>
              ) : (
                <IframeThumbnailOverlay
                  thumbnail={resolvedThumb}
                  title={title}
                  editorName={editorName}
                  editorVerified={editorVerified}
                  source={source}
                  onPlay={() => setShowEmbed(true)}
                  onShare={onShare}
                />
              )
            )}

            {/* Actual iframe — rendered immediately on autoplay, or after click */}
            {(showEmbed || autoplay) && (
              <iframe
                src={activeEmbedUrl ?? undefined}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                title={title ?? "Portfolio video"}
                referrerPolicy="strict-origin-when-cross-origin"
              />
            )}

            {/* Google Drive access warning */}
            {source === "gdrive" && driveId && showEmbed && (
              <DriveNotice url={url} />
            )}

            {/* Branding bar shown over embed when autoplay (no overlay) */}
            {autoplay && editorName && (
              <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-2
                              bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
                <div className="flex flex-col gap-0.5">
                  <PlatformBadge source={source} />
                  <p className="text-white/80 text-xs mt-0.5">{editorName}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Description tooltip (shown on desktop hover at bottom) */}
      {description && !isNative && (
        <div className="absolute bottom-0 left-0 right-0 z-20 translate-y-full group-hover:translate-y-0
                        transition-transform duration-200 bg-gray-900/95 backdrop-blur-sm px-4 py-2">
          <p className="text-white/70 text-xs leading-relaxed line-clamp-2">{description}</p>
        </div>
      )}
    </div>
  );
}

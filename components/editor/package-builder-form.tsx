"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn, formatCurrency } from "@/lib/utils";
import { Clock, RefreshCw, Video, ChevronDown, FileArchive, Briefcase } from "lucide-react";
import type { Package } from "@/types";

const ACCENT = "#000000";

const VIDEO_LENGTH_OPTIONS = [
  "Up to 1 min",
  "Up to 3 min",
  "Up to 5 min",
  "Up to 10 min",
  "Up to 15 min",
  "Up to 30 min",
  "Up to 60 min",
  "Unlimited",
];

const VIDEO_CATEGORIES = [
  { value: "wedding",     label: "Wedding & Events",       sub: "Wedding films, event highlights, receptions" },
  { value: "corporate",   label: "Corporate / Brand",      sub: "Brand promos, company videos, training" },
  { value: "product",     label: "Product / Commercial",   sub: "Product ads, unboxing, e-commerce videos" },
  { value: "education",   label: "Educational / Tutorial", sub: "Online courses, explainers, how-to videos" },
  { value: "vlog",        label: "Vlog / Personal",        sub: "Personal vlogs, day-in-life, lifestyle diaries" },
  { value: "music",       label: "Music Video",            sub: "Artist MVs, lyric videos, audio visualisers" },
  { value: "podcast",     label: "Podcast / Interview",    sub: "Podcast clips, interviews, talking-head" },
  { value: "travel",      label: "Travel",                 sub: "Travel films, destination & adventure content" },
  { value: "gaming",      label: "Gaming",                 sub: "Game highlights, streams, reviews, montages" },
  { value: "comedy",      label: "Comedy / Skits",         sub: "Funny videos, skits, meme edits, parody" },
  { value: "sports",      label: "Sports & Fitness",       sub: "Workout videos, sports highlights, reels" },
  { value: "scitech",     label: "Science & Technology",   sub: "Tech reviews, science explainers, gadget videos" },
  { value: "animation",   label: "Animation & Motion",     sub: "2D/3D animation, motion graphics, visual effects" },
  { value: "realestate",  label: "Real Estate",            sub: "Property tours, listing videos, agent promos" },
  { value: "documentary", label: "Documentary / Film",     sub: "Short films, mini-docs, narrative content" },
  { value: "fashion",     label: "Fashion & Lifestyle",    sub: "Lookbooks, hauls, lifestyle & beauty content" },
  { value: "pets",        label: "Pets & Animals",         sub: "Pet vlogs, animal content, rescue stories" },
  { value: "automotive",  label: "Cars & Automotive",      sub: "Car reviews, test drives, auto vlogs" },
  { value: "other",       label: "Other",                  sub: "Anything not listed above" },
];

const VIDEO_FORMATS = [
  { value: "short_form", label: "Short-form", sub: "Reels, Shorts, TikTok" },
  { value: "long_form",  label: "Long-form",  sub: "YouTube, Docs, Films" },
  { value: "both",       label: "Both",       sub: "Any length" },
];

const RESOLUTIONS = [
  { value: "1080p", label: "Full HD", sub: "1080p" },
  { value: "4k",    label: "4K UHD",  sub: "Ultra HD" },
  { value: "any",   label: "Any",     sub: "Client's choice" },
];

const ALL_ADDON_OPTIONS = [
  { value: "color_grading",    label: "Color Grading" },
  { value: "color_correction", label: "Color Correction" },
  { value: "sound_design",     label: "Sound Design" },
  { value: "audio_cleanup",    label: "Audio Cleanup" },
  { value: "background_music", label: "Background Music" },
  { value: "captions",         label: "Captions / Subtitles" },
  { value: "thumbnail",        label: "Thumbnail Design" },
  { value: "motion_graphics",  label: "Motion Graphics" },
  { value: "intro_outro",      label: "Intro / Outro" },
  { value: "lower_thirds",     label: "Lower Thirds" },
  { value: "social_media_cuts",label: "Social Media Cuts" },
  { value: "speed_ramps",      label: "Speed Ramps" },
  { value: "green_screen",     label: "Green Screen" },
];

const CATEGORY_ADDONS: Record<string, string[]> = {
  wedding:     ["color_grading", "color_correction", "sound_design", "background_music", "captions", "intro_outro", "lower_thirds", "social_media_cuts"],
  corporate:   ["color_grading", "color_correction", "sound_design", "audio_cleanup", "background_music", "captions", "motion_graphics", "intro_outro", "lower_thirds", "thumbnail", "green_screen"],
  product:     ["color_grading", "color_correction", "sound_design", "background_music", "motion_graphics", "speed_ramps", "green_screen", "captions"],
  education:   ["color_grading", "captions", "background_music", "motion_graphics", "lower_thirds", "thumbnail", "audio_cleanup"],
  vlog:        ["color_grading", "color_correction", "background_music", "captions", "thumbnail", "social_media_cuts", "speed_ramps", "audio_cleanup"],
  music:       ["color_grading", "color_correction", "sound_design", "motion_graphics", "speed_ramps", "green_screen", "captions"],
  podcast:     ["audio_cleanup", "sound_design", "captions", "lower_thirds", "thumbnail", "social_media_cuts", "background_music"],
  travel:      ["color_grading", "color_correction", "sound_design", "background_music", "captions", "social_media_cuts", "speed_ramps"],
  gaming:      ["color_grading", "sound_design", "background_music", "motion_graphics", "speed_ramps", "intro_outro", "thumbnail"],
  comedy:      ["color_grading", "sound_design", "background_music", "captions", "social_media_cuts", "speed_ramps", "thumbnail"],
  sports:      ["color_grading", "color_correction", "sound_design", "background_music", "speed_ramps", "motion_graphics", "social_media_cuts", "captions"],
  scitech:     ["color_grading", "captions", "motion_graphics", "lower_thirds", "background_music", "thumbnail", "audio_cleanup"],
  animation:   ["motion_graphics", "sound_design", "background_music", "captions", "color_grading"],
  realestate:  ["color_grading", "color_correction", "background_music", "lower_thirds", "captions"],
  documentary: ["color_grading", "color_correction", "sound_design", "audio_cleanup", "captions", "lower_thirds", "background_music"],
  fashion:     ["color_grading", "color_correction", "sound_design", "background_music", "speed_ramps", "social_media_cuts", "captions", "thumbnail"],
  pets:        ["color_grading", "background_music", "captions", "social_media_cuts", "thumbnail"],
  automotive:  ["color_grading", "color_correction", "sound_design", "background_music", "speed_ramps", "motion_graphics", "social_media_cuts"],
};

function getAddonsForCategory(category: string | null | undefined): typeof ALL_ADDON_OPTIONS {
  if (!category || category === "__none__") return ALL_ADDON_OPTIONS;
  const keys = CATEGORY_ADDONS[category];
  if (!keys) return ALL_ADDON_OPTIONS;
  return ALL_ADDON_OPTIONS.filter((a) => keys.includes(a.value));
}

const SOFTWARE_OPTIONS = [
  { value: "premiere_pro",    label: "Premiere Pro" },
  { value: "davinci_resolve", label: "DaVinci Resolve" },
  { value: "after_effects",   label: "After Effects" },
  { value: "final_cut_pro",   label: "Final Cut Pro" },
  { value: "capcut",          label: "CapCut" },
  { value: "vegas_pro",       label: "Vegas Pro" },
  { value: "filmora",         label: "Filmora" },
];

const MAX_RAW_FOOTAGE_OPTIONS = [
  "Up to 30 min",
  "Up to 1 hour",
  "Up to 2 hours",
  "Up to 5 hours",
  "Up to 10 hours",
  "Unlimited",
];

const DELIVERY_FORMAT_OPTIONS = [
  { value: "mp4_h264",    label: "MP4 (H.264)" },
  { value: "mp4_h265",    label: "MP4 (H.265)" },
  { value: "mov_prores",  label: "MOV (ProRes)" },
  { value: "mov_h264",    label: "MOV (H.264)" },
  { value: "webm",        label: "WebM" },
  { value: "avi",         label: "AVI" },
];

interface PackageBuilderFormProps {
  existing?: Package | null;
  lockedCategory?: string | null;
  lockedFormat?: string | null;
  onSaved: (pkg: Package) => void;
  onCancel: () => void;
}

export function PackageBuilderForm({ existing, lockedCategory, lockedFormat, onSaved, onCancel }: PackageBuilderFormProps) {
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [priceRupees, setPriceRupees] = useState(existing ? String(existing.price / 100) : "");
  const [deliveryDays, setDeliveryDays] = useState(existing ? String(existing.deliveryDays) : "");
  const [revisionCount, setRevisionCount] = useState(existing ? String(existing.revisionCount) : "");
  const [videoLengthLimit, setVideoLengthLimit] = useState(
    VIDEO_LENGTH_OPTIONS.includes(existing?.videoLengthLimit ?? "") || !existing?.videoLengthLimit
      ? (existing?.videoLengthLimit ?? "")
      : "__custom__"
  );
  const [videoLengthCustom, setVideoLengthCustom] = useState(
    existing?.videoLengthLimit && !VIDEO_LENGTH_OPTIONS.includes(existing.videoLengthLimit)
      ? existing.videoLengthLimit
      : ""
  );
  const [videoCount, setVideoCount] = useState(existing ? String(existing.videoCount) : "1");
  const [videoCategories, setVideoCategories] = useState<string[]>(
    lockedCategory !== undefined
      ? (lockedCategory ? [lockedCategory] : [])
      : (existing?.videoCategory ?? "").split(",").filter(Boolean)
  );
  const [videoFormat, setVideoFormat] = useState<string>(
    lockedFormat !== undefined ? (lockedFormat ?? "") : (existing?.videoFormat ?? "")
  );
  const [resolution, setResolution] = useState<string>(existing?.resolution ?? "");
  const [aspectRatios, setAspectRatios] = useState<string[]>(existing?.aspectRatios ?? []);
  const [addons, setAddons] = useState<string[]>(existing?.addons ?? []);
  const [softwareUsed, setSoftwareUsed] = useState<string[]>(existing?.softwareUsed ?? []);
  const [maxRawFootage, setMaxRawFootage] = useState(
    MAX_RAW_FOOTAGE_OPTIONS.includes(existing?.maxRawFootage ?? "") || !existing?.maxRawFootage
      ? (existing?.maxRawFootage ?? "")
      : "__custom__"
  );
  const [maxRawFootageCustom, setMaxRawFootageCustom] = useState(
    existing?.maxRawFootage && !MAX_RAW_FOOTAGE_OPTIONS.includes(existing.maxRawFootage)
      ? existing.maxRawFootage
      : ""
  );
  const [deliveryFormats, setDeliveryFormats] = useState<string[]>(existing?.deliveryFormats ?? []);
  const [includesSourceFiles, setIncludesSourceFiles] = useState(existing?.includesSourceFiles ?? false);
  const [includesCommercialRights, setIncludesCommercialRights] = useState(existing?.includesCommercialRights ?? false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setDescription(existing.description);
      setPriceRupees(String(existing.price / 100));
      setDeliveryDays(String(existing.deliveryDays));
      setRevisionCount(String(existing.revisionCount));
      const vll = existing.videoLengthLimit ?? "";
      if (vll && !VIDEO_LENGTH_OPTIONS.includes(vll)) {
        setVideoLengthLimit("__custom__");
        setVideoLengthCustom(vll);
      } else {
        setVideoLengthLimit(vll);
        setVideoLengthCustom("");
      }
      setVideoCount(String(existing.videoCount));
      setVideoCategories((existing.videoCategory ?? "").split(",").filter(Boolean));
      setVideoFormat(existing.videoFormat ?? "");
      setResolution(existing.resolution ?? "");
      setAspectRatios(existing.aspectRatios ?? []);
      setAddons(existing.addons ?? []);
      setSoftwareUsed(existing.softwareUsed ?? []);
      const mrf = existing.maxRawFootage ?? "";
      if (mrf && !MAX_RAW_FOOTAGE_OPTIONS.includes(mrf)) {
        setMaxRawFootage("__custom__");
        setMaxRawFootageCustom(mrf);
      } else {
        setMaxRawFootage(mrf);
        setMaxRawFootageCustom("");
      }
      setDeliveryFormats(existing.deliveryFormats ?? []);
      setIncludesSourceFiles(existing.includesSourceFiles);
      setIncludesCommercialRights(existing.includesCommercialRights);
    }
  }, [existing]);

  const previewPaise = Math.round(parseFloat(priceRupees || "0") * 100);
  const previewDays = parseInt(deliveryDays) || 0;
  const previewRevisions = parseInt(revisionCount);
  const previewVideoCount = parseInt(videoCount) || 1;

  const activeCategories = lockedCategory !== undefined ? (lockedCategory ? [lockedCategory] : []) : videoCategories;
  const visibleAddons = activeCategories.length === 0
    ? ALL_ADDON_OPTIONS
    : ALL_ADDON_OPTIONS.filter(a =>
        activeCategories.some(cat => {
          const keys = CATEGORY_ADDONS[cat as keyof typeof CATEGORY_ADDONS];
          return !keys || keys.includes(a.value);
        })
      );

  function toggleAddon(v: string) {
    setAddons((prev) => prev.includes(v) ? prev.filter((a) => a !== v) : [...prev, v]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const priceNum = Math.round(parseFloat(priceRupees) * 100);
    const deliveryNum = parseInt(deliveryDays);
    const revisionNum = parseInt(revisionCount);
    const videoCountNum = parseInt(videoCount);

    if (!title.trim() || !description.trim()) { toast.error("Title and description are required."); return; }
    if (isNaN(priceNum) || priceNum < 10000) { toast.error("Minimum price is ₹100."); return; }
    if (isNaN(deliveryNum) || deliveryNum < 1) { toast.error("Delivery must be at least 1 day."); return; }
    if (isNaN(revisionNum) || revisionNum < 0) { toast.error("Revision count cannot be negative."); return; }

    setSaving(true);
    try {
      const url = existing ? `/api/packages/${existing.id}` : "/api/packages";
      const method = existing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          price: priceNum,
          deliveryDays: deliveryNum,
          revisionCount: revisionNum,
          videoLengthLimit: (videoLengthLimit === "__custom__" ? videoLengthCustom.trim() : videoLengthLimit) || null,
          videoCount: isNaN(videoCountNum) ? 1 : videoCountNum,
          videoCategory: videoCategories.length > 0 ? videoCategories.join(",") : null,
          videoFormat: videoFormat || null,
          resolution: resolution || null,
          aspectRatios,
          addons,
          softwareUsed,
          maxRawFootage: (maxRawFootage === "__custom__" ? maxRawFootageCustom.trim() : maxRawFootage) || null,
          deliveryFormats,
          includesSourceFiles,
          includesCommercialRights,
          isActive: existing?.isActive ?? true,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to save package.");
        return;
      }

      const saved: Package = await res.json();
      toast.success(existing ? "Package updated!" : "Package created!");
      onSaved(saved);
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50/50 text-xs font-semibold tracking-wide outline-none focus:bg-white focus:border-black transition-all placeholder:text-neutral-400";

  function ChipButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-all cursor-pointer",
          selected
            ? "bg-black text-white border-black"
            : "border-neutral-200 text-neutral-500 hover:border-neutral-350 bg-white hover:text-black"
        )}
      >
        {children}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">

        {/* ── Left column ── */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Service title</Label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              required
              placeholder="e.g. Full YouTube Edit with Music Sync"
              className={inputClass}
              onFocus={(e) => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.boxShadow = `0 0 0 3px ${ACCENT}18`; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = ""; e.currentTarget.style.boxShadow = ""; }}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's included — raw cut, color grading, music sync, sound design, captions…"
              rows={4}
              maxLength={500}
              required
              className="resize-none text-sm"
            />
            <p className="text-xs text-gray-400 text-right">{description.length}/500</p>
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-4">
          {/* Price */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Price (₹)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium select-none">₹</span>
              <input
                type="number" min="100" step="1"
                value={priceRupees}
                onChange={(e) => setPriceRupees(e.target.value)}
                placeholder="e.g. 3500"
                required
                className={cn(inputClass, "pl-7")}
                onFocus={(e) => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.boxShadow = `0 0 0 3px ${ACCENT}18`; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = ""; e.currentTarget.style.boxShadow = ""; }}
              />
            </div>
            {priceRupees && !isNaN(previewPaise) && previewPaise >= 10000 && (
              <p className="text-xs font-semibold" style={{ color: ACCENT }}>{formatCurrency(previewPaise)}</p>
            )}
          </div>

          {/* Delivery + Revisions */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Delivery (days)</Label>
              <input
                type="number" min="1" max="90"
                value={deliveryDays}
                onChange={(e) => setDeliveryDays(e.target.value)}
                placeholder="e.g. 3"
                required
                className={inputClass}
                onFocus={(e) => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.boxShadow = `0 0 0 3px ${ACCENT}18`; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = ""; e.currentTarget.style.boxShadow = ""; }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Revisions</Label>
              <input
                type="number" min="0" max="100"
                value={revisionCount}
                onChange={(e) => setRevisionCount(e.target.value)}
                placeholder="e.g. 2"
                required
                className={inputClass}
                onFocus={(e) => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.boxShadow = `0 0 0 3px ${ACCENT}18`; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = ""; e.currentTarget.style.boxShadow = ""; }}
              />
            </div>
          </div>

          {/* Video count + length */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <Video className="w-3 h-3 inline mr-1 relative -top-px" />
                No. of videos
              </Label>
              <input
                type="number" min="1" max="100"
                value={videoCount}
                onChange={(e) => setVideoCount(e.target.value)}
                placeholder="1"
                className={inputClass}
                onFocus={(e) => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.boxShadow = `0 0 0 3px ${ACCENT}18`; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = ""; e.currentTarget.style.boxShadow = ""; }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Video length</Label>
              <div className="space-y-1.5">
                <div className="relative">
                  <select
                    value={videoLengthLimit}
                    onChange={(e) => setVideoLengthLimit(e.target.value)}
                    className={cn(inputClass, "appearance-none pr-7")}
                    onFocus={(e) => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.boxShadow = `0 0 0 3px ${ACCENT}18`; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = ""; e.currentTarget.style.boxShadow = ""; }}
                  >
                    <option value="">Not set</option>
                    {VIDEO_LENGTH_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    <option value="__custom__">Custom…</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {videoLengthLimit === "__custom__" && (
                  <input
                    autoFocus
                    value={videoLengthCustom}
                    onChange={(e) => setVideoLengthCustom(e.target.value)}
                    placeholder="e.g. Up to 45 min, 2–3 hours…"
                    className={cn(inputClass)}
                    style={{ borderColor: ACCENT, boxShadow: `0 0 0 3px ${ACCENT}18` }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Live preview */}
          {(title || previewPaise >= 10000) && (
            <div className="rounded-xl border p-3 bg-white space-y-2 mt-1" style={{ borderColor: `${ACCENT}30` }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Preview</p>
              {previewPaise >= 10000 && (
                <p className="text-xl font-bold" style={{ color: ACCENT }}>{formatCurrency(previewPaise)}</p>
              )}
              {title && <p className="text-sm font-semibold text-gray-800 leading-tight">{title}</p>}
              <div className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
                {previewDays > 0 && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" /> {previewDays}d
                  </span>
                )}
                {!isNaN(previewRevisions) && previewRevisions >= 0 && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <RefreshCw className="w-3 h-3" /> {previewRevisions} rev
                  </span>
                )}
                {previewVideoCount > 0 && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Video className="w-3 h-3" /> {previewVideoCount} video{previewVideoCount !== 1 ? "s" : ""}
                  </span>
                )}
                {videoLengthLimit && (
                  <span className="text-xs text-gray-500">{videoLengthLimit}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Full-width sections ── */}
      <div className="mt-6 space-y-5 border-t border-gray-100 pt-5">

        {/* Video category */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Video category
            {lockedCategory === undefined && (
              <span className="ml-1.5 text-[10px] font-medium text-gray-400 normal-case tracking-normal">— select all that apply</span>
            )}
          </Label>
          {lockedCategory !== undefined ? (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: ACCENT }}>
                {VIDEO_CATEGORIES.find((c) => c.value === lockedCategory)?.label ?? lockedCategory ?? "No category"}
              </span>
              <span className="text-xs text-gray-400">Set by category — cannot be changed here</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {VIDEO_CATEGORIES.map((c) => {
                const sel = videoCategories.includes(c.value);
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setVideoCategories(prev =>
                      sel ? prev.filter(v => v !== c.value) : [...prev, c.value]
                    )}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-all",
                      sel ? "border-transparent" : "border-gray-200 bg-white hover:border-gray-300"
                    )}
                    style={sel ? { background: `${ACCENT}12`, borderColor: ACCENT } : {}}
                  >
                    <p className="text-xs font-semibold leading-snug" style={sel ? { color: ACCENT } : { color: "#374151" }}>
                      {c.label}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{c.sub}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Video format */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Video format</Label>
          {lockedFormat !== undefined ? (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: ACCENT }}>
                {VIDEO_FORMATS.find((f) => f.value === lockedFormat)?.label ?? lockedFormat ?? "Any format"}
              </span>
              <span className="text-xs text-gray-400">Set by category — cannot be changed here</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {VIDEO_FORMATS.map((f) => {
                const sel = videoFormat === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setVideoFormat(videoFormat === f.value ? "" : f.value)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-all",
                      sel ? "border-transparent" : "border-gray-200 bg-white hover:border-gray-300"
                    )}
                    style={sel ? { background: `${ACCENT}12`, borderColor: ACCENT } : {}}
                  >
                    <p className="text-xs font-semibold" style={sel ? { color: ACCENT } : { color: "#374151" }}>{f.label}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{f.sub}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Resolution */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Output resolution</Label>
          <div className="grid grid-cols-3 gap-2">
            {RESOLUTIONS.map((r) => {
              const sel = resolution === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setResolution(resolution === r.value ? "" : r.value)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-all",
                    sel ? "border-transparent" : "border-gray-200 bg-white hover:border-gray-300"
                  )}
                  style={sel ? { background: `${ACCENT}12`, borderColor: ACCENT } : {}}
                >
                  <p className="text-xs font-semibold" style={sel ? { color: ACCENT } : { color: "#374151" }}>{r.label}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{r.sub}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Aspect ratio */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Aspect ratios delivered</Label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "16:9",  label: "16:9",  sub: "Landscape" },
              { value: "9:16",  label: "9:16",  sub: "Portrait" },
              { value: "1:1",   label: "1:1",   sub: "Square" },
              { value: "4:5",   label: "4:5",   sub: "Portrait feed" },
              { value: "21:9",  label: "21:9",  sub: "Cinematic" },
            ].map((r) => {
              const sel = aspectRatios.includes(r.value);
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setAspectRatios((prev) =>
                    prev.includes(r.value) ? prev.filter((x) => x !== r.value) : [...prev, r.value]
                  )}
                  className={cn(
                    "flex flex-col items-center px-4 py-2.5 rounded-xl border transition-all min-w-[70px] cursor-pointer",
                    sel ? "bg-black text-white border-black" : "border-neutral-200 bg-white hover:border-neutral-300 text-neutral-500 hover:text-black font-semibold"
                  )}
                >
                  <span className="text-[11px] font-bold">{r.label}</span>
                  <span className="text-[9px] opacity-75 mt-0.5">{r.sub}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-neutral-400 font-medium">Select all ratios you deliver for this package.</p>
        </div>

        {/* Add-ons */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">What&apos;s included</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {visibleAddons.map((a) => {
              const sel = addons.includes(a.value);
              return (
                <label
                  key={a.value}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer transition-all",
                    sel ? "border-black bg-neutral-50/50" : "border-neutral-200 bg-white hover:border-neutral-350"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={sel}
                    onChange={() => toggleAddon(a.value)}
                    className="w-3.5 h-3.5 shrink-0 accent-black cursor-pointer"
                  />
                  <span className={cn("text-xs font-bold", sel ? "text-black" : "text-neutral-600")}>
                    {a.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Software used */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Software used</Label>
          <div className="flex flex-wrap gap-2">
            {SOFTWARE_OPTIONS.map((s) => {
              const sel = softwareUsed.includes(s.value);
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSoftwareUsed((prev) => sel ? prev.filter((v) => v !== s.value) : [...prev, s.value])}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                    sel ? "text-white border-transparent" : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white"
                  )}
                  style={sel ? { background: ACCENT, borderColor: ACCENT } : {}}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Max raw footage + Delivery formats */}
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Max raw footage accepted</Label>
            <div className="relative">
              <select
                value={maxRawFootage}
                onChange={(e) => setMaxRawFootage(e.target.value)}
                className={cn(inputClass, "appearance-none pr-7")}
              >
                <option value="">Not specified</option>
                {MAX_RAW_FOOTAGE_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
                <option value="__custom__">Custom…</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {maxRawFootage === "__custom__" && (
              <input
                autoFocus
                value={maxRawFootageCustom}
                onChange={(e) => setMaxRawFootageCustom(e.target.value)}
                placeholder="e.g. Up to 4 hours, 20–30 min…"
                className={cn(inputClass)}
                style={{ borderColor: ACCENT, boxShadow: `0 0 0 3px ${ACCENT}18` }}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Delivery formats</Label>
            <div className="flex flex-wrap gap-2">
              {DELIVERY_FORMAT_OPTIONS.map((f) => {
                const sel = deliveryFormats.includes(f.value);
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setDeliveryFormats((prev) => sel ? prev.filter((v) => v !== f.value) : [...prev, f.value])}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      sel ? "text-white border-transparent" : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white"
                    )}
                    style={sel ? { background: ACCENT, borderColor: ACCENT } : {}}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Source files + commercial rights */}
        <div className="grid grid-cols-2 gap-3">
          <label
            className={cn(
              "flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition-all",
              includesSourceFiles ? "border-transparent" : "border-gray-200 bg-white hover:border-gray-300"
            )}
            style={includesSourceFiles ? { background: `${ACCENT}10`, borderColor: `${ACCENT}60` } : {}}
          >
            <input
              type="checkbox"
              checked={includesSourceFiles}
              onChange={(e) => setIncludesSourceFiles(e.target.checked)}
              className="mt-0.5 w-3.5 h-3.5 shrink-0 accent-[var(--brand-client)]"
            />
            <div>
              <p className="text-xs font-semibold" style={includesSourceFiles ? { color: ACCENT } : { color: "#374151" }}>
                <FileArchive className="w-3 h-3 inline mr-1 relative -top-px" />
                Source files
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">Raw project files included</p>
            </div>
          </label>

          <label
            className={cn(
              "flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition-all",
              includesCommercialRights ? "border-transparent" : "border-gray-200 bg-white hover:border-gray-300"
            )}
            style={includesCommercialRights ? { background: `${ACCENT}10`, borderColor: `${ACCENT}60` } : {}}
          >
            <input
              type="checkbox"
              checked={includesCommercialRights}
              onChange={(e) => setIncludesCommercialRights(e.target.checked)}
              className="mt-0.5 w-3.5 h-3.5 shrink-0 accent-[var(--brand-client)]"
            />
            <div>
              <p className="text-xs font-semibold" style={includesCommercialRights ? { color: ACCENT } : { color: "#374151" }}>
                <Briefcase className="w-3 h-3 inline mr-1 relative -top-px" />
                Commercial rights
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">Full commercial usage rights</p>
            </div>
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-5 mt-3 border-t border-neutral-100">
        <button
          type="submit"
          disabled={saving}
          className={cn("flex-1 py-3 rounded-full text-xs font-bold uppercase tracking-wider text-white bg-black hover:bg-neutral-900 transition-all cursor-pointer", saving && "opacity-60 cursor-not-allowed")}
        >
          {saving ? "Saving…" : existing ? "Save changes" : "Create service"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

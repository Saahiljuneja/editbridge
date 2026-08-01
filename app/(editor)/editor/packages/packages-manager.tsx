"use client";

import { useState } from "react";
import { PackageBuilderForm } from "@/components/editor/package-builder-form";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Plus, Pencil, Clock, RefreshCw,
  Video, FileArchive, Briefcase,
  ChevronDown, ChevronUp, Trash2, X, ArrowRight,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { Package } from "@/types";

const CATEGORY_META: Record<string, { label: string; sub: string; color: string }> = {
  wedding:     { label: "Wedding & Events",         sub: "Wedding films, event highlights, receptions",       color: "#ec4899" },
  corporate:   { label: "Corporate / Brand",        sub: "Brand promos, company videos, training",            color: "var(--brand-client)" },
  product:     { label: "Product / Commercial",     sub: "Product ads, unboxing, e-commerce videos",          color: "#f97316" },
  education:   { label: "Educational / Tutorial",   sub: "Online courses, explainers, how-to videos",         color: "#eab308" },
  vlog:        { label: "Vlog / Personal",          sub: "Personal vlogs, day-in-life, lifestyle diaries",    color: "#f43f5e" },
  music:       { label: "Music Video",              sub: "Artist MVs, lyric videos, audio visualisers",       color: "#a855f7" },
  podcast:     { label: "Podcast / Interview",      sub: "Podcast clips, interviews, talking-head",           color: "#14b8a6" },
  travel:      { label: "Travel",                   sub: "Travel films, destination & adventure content",     color: "#22c55e" },
  gaming:      { label: "Gaming",                   sub: "Game highlights, streams, reviews, montages",       color: "#8b5cf6" },
  comedy:      { label: "Comedy / Skits",           sub: "Funny videos, skits, meme edits, parody",          color: "#f59e0b" },
  sports:      { label: "Sports & Fitness",         sub: "Workout videos, sports highlights, reels",          color: "#ef4444" },
  scitech:     { label: "Science & Technology",     sub: "Tech reviews, science explainers, gadget videos",   color: "#3b82f6" },
  animation:   { label: "Animation & Motion",       sub: "2D/3D animation, motion graphics, visual effects",  color: "#6366f1" },
  realestate:  { label: "Real Estate",              sub: "Property tours, listing videos, agent promos",      color: "var(--brand-teal)" },
  documentary: { label: "Documentary / Film",       sub: "Short films, mini-docs, narrative content",         color: "#374151" },
  fashion:     { label: "Fashion & Lifestyle",      sub: "Lookbooks, hauls, lifestyle & beauty content",      color: "#db2777" },
  pets:        { label: "Pets & Animals",           sub: "Pet vlogs, animal content, rescue stories",         color: "#84cc16" },
  automotive:  { label: "Cars & Automotive",        sub: "Car reviews, test drives, auto vlogs",              color: "#64748b" },
  other:       { label: "Other",                    sub: "Anything not listed above",                         color: "#6b7280" },
  __none__:    { label: "No category",              sub: "General editing — no specific niche",               color: "#6b7280" },
};

const FORMAT_META: Record<string, { label: string; sub: string; badge: string }> = {
  short_form: { label: "Short-form", sub: "Reels, Shorts, TikTok", badge: "bg-blue-50 text-blue-600" },
  long_form:  { label: "Long-form",  sub: "YouTube, Films, Docs",  badge: "bg-blue-50 text-blue-600" },
  both:       { label: "Any length", sub: "Short & long",          badge: "bg-gray-100 text-gray-600" },
  __none__:   { label: "Any format", sub: "",                      badge: "bg-gray-100 text-gray-500" },
};

const ALL_CATEGORIES = Object.entries(CATEGORY_META)
  .filter(([k]) => k !== "__none__")
  .map(([value, { label, sub }]) => ({ value, label, sub }));

const ALL_FORMATS = [
  { value: "short_form", label: "Short-form", sub: "Reels, Shorts, TikTok" },
  { value: "long_form",  label: "Long-form",  sub: "YouTube, Films, Docs" },
  { value: "both",       label: "Both",       sub: "Short & long videos" },
];

const ADDON_LABELS: Record<string, string> = {
  color_grading: "Color Grading", color_correction: "Color Correction",
  sound_design: "Sound Design", audio_cleanup: "Audio Cleanup",
  background_music: "Background Music", captions: "Captions",
  thumbnail: "Thumbnail", motion_graphics: "Motion Graphics",
  intro_outro: "Intro / Outro", lower_thirds: "Lower Thirds",
  social_media_cuts: "Social Cuts", speed_ramps: "Speed Ramps",
  green_screen: "Green Screen",
};

const SOFTWARE_LABELS: Record<string, string> = {
  premiere_pro: "Premiere Pro", davinci_resolve: "DaVinci Resolve",
  after_effects: "After Effects", final_cut_pro: "Final Cut Pro",
  capcut: "CapCut", vegas_pro: "Vegas Pro", filmora: "Filmora",
};

const FORMAT_LABELS: Record<string, string> = {
  mp4_h264: "MP4 H.264", mp4_h265: "MP4 H.265",
  mov_prores: "MOV ProRes", mov_h264: "MOV H.264",
  webm: "WebM", avi: "AVI",
};

function makeSetKey(category: string, format: string) {
  return `${category}||${format}`;
}

function parseSetKey(key: string): { category: string; format: string } {
  const [category, format] = key.split("||");
  return { category: category ?? "__none__", format: format ?? "__none__" };
}

function groupPackages(pkgs: Package[]): Record<string, Package[]> {
  const out: Record<string, Package[]> = {};
  for (const pkg of pkgs) {
    const key = makeSetKey(pkg.videoCategory ?? "__none__", pkg.videoFormat ?? "__none__");
    if (!out[key]) out[key] = [];
    out[key].push(pkg);
  }
  for (const key of Object.keys(out)) {
    out[key].sort((a, b) => a.price - b.price);
  }
  return out;
}

function setLabel(key: string) {
  const { category, format } = parseSetKey(key);
  const catLabel = CATEGORY_META[category]?.label ?? category;
  const fmtMeta = FORMAT_META[format];
  if (!fmtMeta || format === "__none__") return catLabel;
  return `${catLabel} · ${fmtMeta.label}`;
}

export function PackagesManager({
  initialPackages,
  maxPackages = 3,
  level = "bronze",
}: {
  initialPackages: Package[];
  maxPackages?: number;
  level?: string;
}) {
  const [sets, setSets] = useState<Record<string, Package[]>>(() => groupPackages(initialPackages));
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  // editingKey: which set is open, editingPkg: null = new, Package = editing existing
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingPkg, setEditingPkg] = useState<Package | null | undefined>(undefined);

  const [showPicker, setShowPicker] = useState(false);
  const [pickerCat, setPickerCat] = useState("");
  const [pickerCatCustom, setPickerCatCustom] = useState("");
  const [pickerFmt, setPickerFmt] = useState("");

  const setKeys = Object.keys(sets);
  const usedKeys = new Set(setKeys);

  const totalCreated = Object.values(sets).flat().length;
  const canAdd = pickerCat !== "" || pickerFmt !== "";

  function openForm(key: string, pkg: Package | null) {
    if (editingKey === key && editingPkg === pkg) {
      setEditingKey(null);
      setEditingPkg(undefined);
    } else {
      setEditingKey(key);
      setEditingPkg(pkg);
    }
  }

  function closeForm() {
    setEditingKey(null);
    setEditingPkg(undefined);
  }

  function addSet() {
    const cat = pickerCat === "other" && pickerCatCustom.trim()
      ? pickerCatCustom.trim()
      : pickerCat || "__none__";
    const fmt = pickerFmt || "__none__";
    const key = makeSetKey(cat, fmt);
    if (usedKeys.has(key)) {
      toast.error("A set with this category and format already exists.");
      return;
    }
    setSets((prev) => ({ ...prev, [key]: [] }));
    setCollapsed((prev) => ({ ...prev, [key]: false }));
    setShowPicker(false);
    setPickerCat("");
    setPickerCatCustom("");
    setPickerFmt("");
  }

  function removeSet(key: string) {
    if ((sets[key] ?? []).length > 0) { toast.error("Delete all services in this set first."); return; }
    setSets((prev) => { const next = { ...prev }; delete next[key]; return next; });
  }

  function handleSaved(saved: Package) {
    const key = makeSetKey(saved.videoCategory ?? "__none__", saved.videoFormat ?? "__none__");
    setSets((prev) => {
      const existing = prev[key] ?? [];
      const idx = existing.findIndex((p) => p.id === saved.id);
      const updated = idx >= 0
        ? existing.map((p) => (p.id === saved.id ? saved : p))
        : [...existing, saved];
      return { ...prev, [key]: updated.sort((a, b) => a.price - b.price) };
    });
    closeForm();
  }

  async function toggleActive(pkg: Package) {
    const res = await fetch(`/api/packages/${pkg.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !pkg.isActive }),
    });
    if (res.ok) {
      const updated: Package = await res.json();
      const key = makeSetKey(updated.videoCategory ?? "__none__", updated.videoFormat ?? "__none__");
      setSets((prev) => ({
        ...prev,
        [key]: (prev[key] ?? []).map((p) => (p.id === updated.id ? updated : p)),
      }));
      toast.success(`"${updated.title}" ${updated.isActive ? "enabled" : "paused"}.`);
    } else {
      toast.error("Failed to update service.");
    }
  }

  async function deletePackage(pkg: Package) {
    const res = await fetch(`/api/packages/${pkg.id}`, { method: "DELETE" });
    if (res.ok) {
      const key = makeSetKey(pkg.videoCategory ?? "__none__", pkg.videoFormat ?? "__none__");
      setSets((prev) => ({ ...prev, [key]: (prev[key] ?? []).filter((p) => p.id !== pkg.id) }));
      toast.success("Service deleted.");
    } else {
      toast.error("Failed to delete service.");
    }
  }

  const activeCount = Object.values(sets).flat().filter((p) => p.isActive).length;

  return (
    <div className="space-y-5">
      {/* Stats bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-stretch divide-x divide-gray-100 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-col items-center px-7 py-4">
            <span className="text-3xl font-black text-gray-900 leading-none">{totalCreated}</span>
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mt-1.5">Services</span>
          </div>
          <div className="flex flex-col items-center px-7 py-4">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-3xl font-black text-emerald-600 leading-none">{activeCount}</span>
            </div>
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mt-1.5">Active</span>
          </div>
          <div className="flex flex-col items-center px-7 py-4">
            <span className="text-3xl font-black text-gray-900 leading-none">{setKeys.length}</span>
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mt-1.5">Sets</span>
          </div>
          <div className={cn("flex flex-col items-center px-7 py-4", totalCreated >= maxPackages ? "bg-red-50/50" : "")}>
            <span className="leading-none">
              <span className={cn(
                "text-3xl font-black",
                totalCreated >= maxPackages ? "text-red-600"
                  : totalCreated >= maxPackages - 1 ? "text-amber-500"
                  : "text-violet-600"
              )}>{totalCreated}</span>
              <span className="text-xl font-bold text-gray-300">/{maxPackages}</span>
            </span>
            <div className="flex items-center gap-1 mt-1.5">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Slots</span>
              {totalCreated >= maxPackages && (
                <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full capitalize ml-1">{level}</span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowPicker((v) => !v)}
          className="flex items-center gap-2 text-sm font-bold px-5 py-3.5 rounded-xl bg-[var(--brand-client)] text-white hover:bg-[var(--brand-client-hover)] transition-all active:scale-[0.98]"
          style={{ boxShadow: "0 4px 16px rgba(14,165,233,0.30)" }}
        >
          <Plus className="w-4 h-4" />
          New service set
        </button>
      </div>

      {/* Category picker */}
      {showPicker && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 animate-in slide-in-from-top-2 duration-200 space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">New service set</p>
            <button onClick={() => { setShowPicker(false); setPickerCat(""); setPickerCatCustom(""); setPickerFmt(""); }} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Video category</p>
            <div className="grid grid-cols-2 gap-2">
              {ALL_CATEGORIES.map((c) => {
                const sel = pickerCat === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setPickerCat(sel ? "" : c.value)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-all",
                      sel ? "bg-[var(--brand-client)]/10 border-[var(--brand-client)]" : "border-gray-200 bg-white hover:border-gray-300"
                    )}
                  >
                    <p className={cn("text-xs font-semibold leading-snug", sel ? "text-[var(--brand-client)]" : "text-gray-700")}>
                      {c.label}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{c.sub}</p>
                  </button>
                );
              })}
            </div>
            {pickerCat === "other" && (
              <input
                autoFocus
                value={pickerCatCustom}
                onChange={(e) => setPickerCatCustom(e.target.value)}
                placeholder="e.g. Food & Cooking, ASMR, Unboxing…"
                className="w-full px-3 py-2 rounded-xl border border-[var(--brand-client)] text-sm text-gray-800 outline-none focus:ring-2 focus:ring-[var(--brand-client)]/20"
              />
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Video format
              <span className="ml-1 font-normal normal-case text-gray-400">(optional — set separate prices for short vs long)</span>
            </p>
            <div className="grid grid-cols-3 gap-2">
              {ALL_FORMATS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setPickerFmt(pickerFmt === f.value ? "" : f.value)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-all",
                    pickerFmt === f.value
                      ? "bg-[var(--brand-client)]/10 border-[var(--brand-client)]"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  )}
                >
                  <p className={cn("text-xs font-semibold", pickerFmt === f.value ? "text-[var(--brand-client)]" : "text-gray-700")}>
                    {f.label}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{f.sub}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              {pickerCat && (pickerCat === "other" ? (pickerCatCustom.trim() || "Other") : CATEGORY_META[pickerCat]?.label)}
              {pickerCat && pickerFmt && <span className="text-gray-300 mx-1">·</span>}
              {pickerFmt && FORMAT_META[pickerFmt]?.label}
              {!pickerCat && !pickerFmt && <span className="text-gray-400">Select at least one option</span>}
            </p>
            <button
              onClick={addSet}
              disabled={!canAdd}
              className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-[var(--brand-client)] text-white hover:bg-[var(--brand-client-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Create set <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {setKeys.length === 0 && !showPicker && (
        <div className="rounded-2xl border border-gray-200 bg-gradient-to-b from-gray-50/70 to-white overflow-hidden">
          <div className="py-16 px-8 text-center">
            {/* Icon */}
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6"
              style={{
                background: "linear-gradient(135deg, rgba(14,165,233,0.15) 0%, rgba(14,165,233,0.05) 100%)",
                boxShadow: "0 12px 40px rgba(14,165,233,0.15), inset 0 1px 0 rgba(255,255,255,0.6)",
              }}
            >
              <Video className="w-12 h-12 text-[var(--brand-client)]" />
            </div>

            {/* Copy */}
            <h3 className="text-xl font-bold text-gray-900 mb-2">No services listed yet</h3>
            <p className="text-sm text-gray-400 max-w-sm mx-auto leading-relaxed mb-8">
              Create service sets so clients know exactly what you offer &mdash; with pricing, deliverables, and your turnaround time.
            </p>

            {/* Feature trio */}
            <div className="flex items-center justify-center gap-6 mb-10">
              {["Set your own price", "Show deliverables", "Attract more clients"].map((f) => (
                <div key={f} className="flex items-center gap-1.5">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black text-white"
                    style={{ background: "var(--brand-client)" }}
                  >
                    ✓
                  </span>
                  <span className="text-xs font-medium text-gray-500">{f}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={() => setShowPicker(true)}
              className="inline-flex items-center gap-2.5 text-sm font-bold px-7 py-3.5 rounded-xl text-white transition-all active:scale-[0.98]"
              style={{
                background: "var(--brand-client)",
                boxShadow: "0 6px 24px rgba(14,165,233,0.35)",
              }}
            >
              <Plus className="w-4 h-4" />
              Add your first service set
            </button>
          </div>

          {/* Bottom hint strip */}
          <div className="border-t border-gray-100 bg-white px-6 py-3 flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
            <p className="text-xs text-gray-400">
              You can create up to <span className="font-semibold text-gray-600">{maxPackages} services</span> on your current plan. <span className="text-violet-600 font-semibold">Upgrade</span> to unlock more slots.
            </p>
          </div>
        </div>
      )}

      {/* Sets */}
      {setKeys.map((key) => {
        const { category, format } = parseSetKey(key);
        const catMeta = CATEGORY_META[category] ?? { label: category, sub: "", color: "#6b7280" };
        const fmtMeta = format !== "__none__" ? FORMAT_META[format] : null;
        const pkgs = sets[key] ?? [];
        const isCollapsed = collapsed[key];
        const isEditingHere = editingKey === key;

        return (
          <div
            key={key}
            className="rounded-2xl border border-gray-200 overflow-hidden"
            style={{ borderLeftColor: catMeta.color, borderLeftWidth: 4 }}
          >
            {/* Set header */}
            <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${catMeta.color}15` }}>
                  <div className="w-3.5 h-3.5 rounded-full" style={{ background: catMeta.color }} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-gray-900">{catMeta.label}</span>
                    {fmtMeta && (
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", fmtMeta.badge)}>
                        {fmtMeta.label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{pkgs.length} service{pkgs.length !== 1 ? "s" : ""}</span>
                    {pkgs.length > 0 && (
                      <>
                        <span className="text-gray-200">·</span>
                        <span className="text-xs font-medium text-emerald-500">{pkgs.filter(p => p.isActive).length} active</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {pkgs.length === 0 && (
                  <button onClick={() => removeSet(key)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Services list */}
            {!isCollapsed && (
              <div className="p-4 space-y-3 bg-gray-50/50">

                {pkgs.map((pkg) => {
                  const isThisEditing = isEditingHere && editingPkg?.id === pkg.id;
                  return (
                    <div key={pkg.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                      {/* Main content */}
                      <div className="px-4 pt-4 pb-3">
                        {/* Title + Price */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-[15px] font-semibold text-gray-900 leading-snug">{pkg.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">{pkg.description}</p>
                          </div>
                          <p className="text-2xl font-black text-gray-900 shrink-0 leading-none">{formatCurrency(pkg.price)}</p>
                        </div>

                        {/* Spec chips */}
                        <div className="flex flex-wrap gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-100 px-2 py-1 rounded-lg">
                            <Clock className="w-3 h-3" /> {pkg.deliveryDays}d delivery
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-600 bg-gray-50 border border-gray-200 px-2 py-1 rounded-lg">
                            <RefreshCw className="w-3 h-3 text-gray-400" /> {pkg.revisionCount === -1 ? "Unlimited" : pkg.revisionCount} revision{pkg.revisionCount !== 1 ? "s" : ""}
                          </span>
                          {pkg.videoCount > 1 && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-gray-600 bg-gray-50 border border-gray-200 px-2 py-1 rounded-lg">
                              <Video className="w-3 h-3 text-gray-400" /> {pkg.videoCount} videos
                            </span>
                          )}
                          {pkg.videoLengthLimit && (
                            <span className="text-[11px] text-gray-600 bg-gray-50 border border-gray-200 px-2 py-1 rounded-lg">
                              {pkg.videoLengthLimit}
                            </span>
                          )}
                          {pkg.resolution && (
                            <span className="text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-100 px-2 py-1 rounded-lg uppercase tracking-wide">
                              {pkg.resolution}
                            </span>
                          )}
                          {pkg.maxRawFootage && (
                            <span className="text-[11px] text-gray-600 bg-gray-50 border border-gray-200 px-2 py-1 rounded-lg">
                              Raw: {pkg.maxRawFootage}
                            </span>
                          )}
                        </div>

                        {/* Add-on pills */}
                        {((pkg.addons?.length ?? 0) > 0 || pkg.includesSourceFiles || pkg.includesCommercialRights) && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {pkg.addons?.map((a) => (
                              <span key={a} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--brand-client)]/8 text-[var(--brand-client)] border border-[var(--brand-client)]/20">
                                {ADDON_LABELS[a] ?? a.replace(/_/g, " ")}
                              </span>
                            ))}
                            {pkg.includesSourceFiles && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                                <FileArchive className="w-2.5 h-2.5" /> Source files
                              </span>
                            )}
                            {pkg.includesCommercialRights && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                                <Briefcase className="w-2.5 h-2.5" /> Commercial rights
                              </span>
                            )}
                          </div>
                        )}

                        {/* Software + delivery format tags */}
                        {((pkg.softwareUsed?.length ?? 0) > 0 || (pkg.deliveryFormats?.length ?? 0) > 0) && (
                          <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-gray-100">
                            {pkg.softwareUsed?.map((s) => (
                              <span key={s} className="text-[10px] text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
                                {SOFTWARE_LABELS[s] ?? s}
                              </span>
                            ))}
                            {pkg.deliveryFormats?.map((f) => (
                              <span key={f} className="text-[10px] text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
                                {FORMAT_LABELS[f] ?? f}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Footer action bar */}
                      <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50/60">
                        <div className="flex items-center gap-2">
                          <Switch checked={pkg.isActive} onCheckedChange={() => toggleActive(pkg)} className="scale-[0.8]" />
                          <span className={cn(
                            "text-xs font-semibold",
                            pkg.isActive ? "text-emerald-600" : "text-amber-600"
                          )}>
                            {pkg.isActive ? "Active" : "Paused"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openForm(key, pkg)}
                            className={cn(
                              "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors",
                              isThisEditing
                                ? "border-[var(--brand-client)]/30 bg-[var(--brand-client)]/10 text-[var(--brand-client)]"
                                : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                            )}
                            title="Edit"
                          >
                            <Pencil className="w-3 h-3" /> Edit
                          </button>
                          <button
                            onClick={() => deletePackage(pkg)}
                            className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Inline edit form */}
                      {isThisEditing && (
                        <div className="border-t border-gray-100 p-5 bg-[var(--brand-client)]/[0.02]">
                          <PackageBuilderForm
                            existing={pkg}
                            lockedCategory={category === "__none__" ? null : category}
                            lockedFormat={format === "__none__" ? null : format}
                            onSaved={handleSaved}
                            onCancel={closeForm}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add service button / inline create form */}
                {isEditingHere && editingPkg === null ? (
                  <div className="rounded-xl border border-[var(--brand-client)]/25 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <p className="text-sm font-semibold text-gray-800">
                        New service — {setLabel(key)}
                      </p>
                      <button onClick={closeForm} className="ml-auto p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <PackageBuilderForm
                      lockedCategory={category === "__none__" ? null : category}
                      lockedFormat={format === "__none__" ? null : format}
                      onSaved={handleSaved}
                      onCancel={closeForm}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => openForm(key, null)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-3.5 text-sm font-semibold text-gray-400 hover:border-[var(--brand-client)]/50 hover:text-[var(--brand-client)] hover:bg-[var(--brand-client)]/[0.02] transition-all"
                  >
                    <Plus className="w-4 h-4" /> Add a service to this set
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

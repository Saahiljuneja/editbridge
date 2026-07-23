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
  corporate:   { label: "Corporate / Brand",        sub: "Brand promos, company videos, training",            color: "#0ea5e9" },
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
  realestate:  { label: "Real Estate",              sub: "Property tours, listing videos, agent promos",      color: "#0f6e56" },
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
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200">
            <span className="text-xs text-gray-500">Services</span>
            <span className="text-xs font-bold text-gray-800">{totalCreated}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-xs text-emerald-700 font-medium">{activeCount} active</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200">
            <span className="text-xs text-gray-500">Categories</span>
            <span className="text-xs font-bold text-gray-800">{setKeys.length}</span>
          </div>
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium",
            totalCreated >= maxPackages
              ? "bg-red-50 border-red-200 text-red-700"
              : totalCreated >= maxPackages - 1
              ? "bg-amber-50 border-amber-200 text-amber-700"
              : "bg-violet-50 border-violet-200 text-violet-700"
          )}>
            <span className="text-inherit opacity-70">Slots</span>
            <span className="font-bold">{totalCreated}/{maxPackages}</span>
            {totalCreated >= maxPackages && (
              <span className="text-[10px] font-semibold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full capitalize">{level} limit</span>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowPicker((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl bg-[#0EA5E9] text-white hover:bg-[#0284c7] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add category set
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
                      sel ? "bg-[#0EA5E9]/10 border-[#0EA5E9]" : "border-gray-200 bg-white hover:border-gray-300"
                    )}
                  >
                    <p className={cn("text-xs font-semibold leading-snug", sel ? "text-[#0EA5E9]" : "text-gray-700")}>
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
                className="w-full px-3 py-2 rounded-xl border border-[#0EA5E9] text-sm text-gray-800 outline-none focus:ring-2 focus:ring-[#0EA5E9]/20"
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
                      ? "bg-[#0EA5E9]/10 border-[#0EA5E9]"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  )}
                >
                  <p className={cn("text-xs font-semibold", pickerFmt === f.value ? "text-[#0EA5E9]" : "text-gray-700")}>
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
              className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-[#0EA5E9] text-white hover:bg-[#3b31a0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Create set <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {setKeys.length === 0 && !showPicker && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#0EA5E9]/10 flex items-center justify-center mx-auto mb-4">
            <Video className="w-7 h-7 text-[#0EA5E9]" />
          </div>
          <p className="text-base font-semibold text-gray-700 mb-1">No services yet</p>
          <p className="text-sm text-gray-400 mb-5">Start by adding a category set, then list your services inside it.</p>
          <button
            onClick={() => setShowPicker(true)}
            className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl bg-[#0EA5E9] text-white hover:bg-[#0284c7] transition-colors"
          >
            <Plus className="w-4 h-4" /> Add your first category set
          </button>
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
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${catMeta.color}18` }}>
                  <div className="w-3 h-3 rounded-full" style={{ background: catMeta.color }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{catMeta.label}</span>
                    {fmtMeta && (
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", fmtMeta.badge)}>
                        {fmtMeta.label}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{pkgs.length} service{pkgs.length !== 1 ? "s" : ""}</span>
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
                      <div className="px-4 pt-4 pb-3">
                        {/* Title row */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className={cn(
                                "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full",
                                pkg.isActive ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                              )}>
                                <span className={cn("w-1.5 h-1.5 rounded-full", pkg.isActive ? "bg-emerald-500" : "bg-amber-400")} />
                                {pkg.isActive ? "Active" : "Paused"}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-gray-900 leading-snug">{pkg.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">{pkg.description}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2.5 shrink-0">
                            <p className="text-xl font-bold text-gray-900">{formatCurrency(pkg.price)}</p>
                            <div className="flex items-center gap-1.5">
                              <Switch checked={pkg.isActive} onCheckedChange={() => toggleActive(pkg)} className="scale-75" />
                              <button
                                onClick={() => openForm(key, pkg)}
                                className={cn(
                                  "p-1.5 rounded-lg border transition-colors",
                                  isThisEditing
                                    ? "border-[#0EA5E9]/30 bg-[#0EA5E9]/10 text-[#0EA5E9]"
                                    : "border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600 hover:bg-gray-50"
                                )}
                                title="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deletePackage(pkg)}
                                className="p-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 hover:border-red-200 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Spec chips */}
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-600 bg-gray-50 border border-gray-200 px-2 py-1 rounded-lg">
                            <Clock className="w-3 h-3 text-gray-400" /> {pkg.deliveryDays}d delivery
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
                            <span className="inline-flex items-center gap-1 text-[11px] text-gray-600 bg-gray-50 border border-gray-200 px-2 py-1 rounded-lg">
                              {pkg.videoLengthLimit}
                            </span>
                          )}
                          {pkg.resolution && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-600 border border-blue-100 px-2 py-1 rounded-lg uppercase">
                              {pkg.resolution}
                            </span>
                          )}
                          {pkg.maxRawFootage && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-gray-600 bg-gray-50 border border-gray-200 px-2 py-1 rounded-lg">
                              Raw: {pkg.maxRawFootage}
                            </span>
                          )}
                        </div>

                        {/* Add-on pills */}
                        {((pkg.addons?.length ?? 0) > 0 || pkg.includesSourceFiles || pkg.includesCommercialRights) && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {pkg.addons?.map((a) => (
                              <span key={a} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#0EA5E9]/8 text-[#0EA5E9] border border-[#0EA5E9]/20">
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

                      {/* Inline edit form */}
                      {isThisEditing && (
                        <div className="border-t border-gray-100 p-5 bg-[#0EA5E9]/[0.02]">
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
                  <div className="rounded-xl border border-[#0EA5E9]/25 bg-white p-5 shadow-sm">
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
                    className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-3.5 text-sm font-semibold text-gray-400 hover:border-[#0EA5E9]/50 hover:text-[#0EA5E9] hover:bg-[#0EA5E9]/[0.02] transition-all"
                  >
                    <Plus className="w-4 h-4" /> Add service
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

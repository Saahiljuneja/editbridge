"use client";

import { useState } from "react";
import { PackageBuilderForm } from "@/components/editor/package-builder-form";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Plus, Pencil, Clock, RefreshCw,
  Video, FileArchive, Briefcase,
  ChevronDown, ChevronUp, Trash2, X, ArrowRight,
  Layers, Activity, Check, CheckCircle2, Shield, AlertTriangle
} from "lucide-react";
import { Label } from "@/components/ui/label";
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
  maxSets = 2,
  packagesPerSet = 3,
  membershipTier = "Hobby",
}: {
  initialPackages: Package[];
  maxSets?: number | null; // null = unlimited (Agency)
  packagesPerSet?: number;
  membershipTier?: string;
}) {
  const [sets, setSets] = useState<Record<string, Package[]>>(() => groupPackages(initialPackages));
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
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

  // Set limit reached (null = Agency = unlimited)
  const setsAtLimit = maxSets !== null && setKeys.length >= maxSets;

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
    if (setsAtLimit) {
      toast.error(`Your ${membershipTier} plan allows up to ${maxSets} service sets. Upgrade to add more.`);
      return;
    }
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full sm:w-auto">
          {/* Card 1: Total Services */}
          <div className="flex items-center gap-4 bg-white border border-gray-150 rounded-2xl px-6 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.015)] min-w-[170px] hover:scale-[1.01] transition-transform">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900 leading-none">{totalCreated}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Services</p>
            </div>
          </div>

          {/* Card 2: Active */}
          <div className="flex items-center gap-4 bg-white border border-gray-150 rounded-2xl px-6 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.015)] min-w-[170px] hover:scale-[1.01] transition-transform">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 relative">
              <Activity className="w-5 h-5 text-emerald-600" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
            </div>
            <div>
              <p className="text-2xl font-black text-emerald-600 leading-none">{activeCount}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Active</p>
            </div>
          </div>

          {/* Card 3: Sets Allocation */}
          <div className={cn(
            "flex items-center gap-4 bg-white border rounded-2xl px-6 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.015)] min-w-[190px] hover:scale-[1.01] transition-transform",
            setsAtLimit ? "border-red-200 bg-red-50/10" : "border-gray-150"
          )}>
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
              setsAtLimit ? "bg-red-50 border-red-100 text-red-600"
                : maxSets !== null && setKeys.length >= maxSets - 1 ? "bg-amber-50 border-amber-100 text-amber-500"
                : "bg-gray-50 border-gray-100 text-gray-600"
            )}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900 leading-none">
                {setKeys.length}
                {maxSets !== null && (
                  <span className="text-sm font-bold text-gray-300">/{maxSets}</span>
                )}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sets Allocation</p>
                {setsAtLimit && (
                  <span className="text-[8px] font-black bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full uppercase tracking-wider">{membershipTier}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => setsAtLimit ? toast.error(`Upgrade from ${membershipTier} to add more service sets.`) : setShowPicker((v) => !v)}
          className={cn(
            "flex items-center gap-2 text-sm font-black px-6 py-4 rounded-xl transition-all active:scale-[0.98] w-full sm:w-auto justify-center cursor-pointer select-none",
            setsAtLimit
              ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-250"
              : "bg-[#1e40af] text-white hover:bg-blue-800 shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/15"
          )}
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          New Service Set
        </button>
      </div>

      {/* Category picker */}
      {showPicker && (
        <div className="rounded-2xl border border-gray-155 bg-white shadow-md overflow-hidden animate-in slide-in-from-top-2 duration-200">
          <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-sky-400 to-[#1e40af]" />
          
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-gray-900 uppercase tracking-wider">Configure New Service Set</p>
              <button onClick={() => { setShowPicker(false); setPickerCat(""); setPickerCatCustom(""); setPickerFmt(""); }} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-black text-gray-500 uppercase tracking-wider">Video Category</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {ALL_CATEGORIES.map((c) => {
                  const sel = pickerCat === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setPickerCat(sel ? "" : c.value)}
                      className={cn(
                        "rounded-xl border p-3.5 text-left transition-all hover:scale-[1.01] cursor-pointer relative",
                        sel
                          ? "bg-blue-500/5 border-blue-500 shadow-sm ring-1 ring-blue-500/20"
                          : "border-gray-150 bg-white hover:border-gray-250"
                      )}
                    >
                      <p className={cn("text-xs font-black leading-snug", sel ? "text-blue-600" : "text-gray-800")}>
                        {c.label}
                      </p>
                      <p className="text-[10px] font-semibold text-gray-400 mt-1 leading-snug">{c.sub}</p>
                      
                      {sel && (
                        <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-blue-650 flex items-center justify-center border border-white">
                          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {pickerCat === "other" && (
                <div className="pt-2 animate-in fade-in slide-in-from-top-1 duration-150">
                  <input
                    autoFocus
                    value={pickerCatCustom}
                    onChange={(e) => setPickerCatCustom(e.target.value)}
                    placeholder="e.g. Food & Cooking, ASMR, Unboxing…"
                    className="w-full px-4 py-3 rounded-xl border border-blue-400 text-xs font-semibold text-gray-855 outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-gray-400 bg-white"
                  />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-black text-gray-500 uppercase tracking-wider">
                Video Format
                <span className="ml-1 font-normal normal-case text-gray-400 font-semibold">(Optional — set separate prices for short vs long)</span>
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {ALL_FORMATS.map((f) => {
                  const sel = pickerFmt === f.value;
                  return (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setPickerFmt(sel ? "" : f.value)}
                      className={cn(
                        "rounded-xl border p-3.5 text-left transition-all hover:scale-[1.01] cursor-pointer relative",
                        sel
                          ? "bg-blue-500/5 border-blue-500 shadow-sm ring-1 ring-blue-500/20"
                          : "border-gray-150 bg-white hover:border-gray-250"
                      )}
                    >
                      <p className={cn("text-xs font-black", sel ? "text-blue-600" : "text-gray-800")}>
                        {f.label}
                      </p>
                      <p className="text-[10px] font-semibold text-gray-400 mt-1 leading-snug">{f.sub}</p>
                      
                      {sel && (
                        <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-blue-650 flex items-center justify-center border border-white">
                          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  {!pickerCat && !pickerFmt ? (
                    <span className="text-gray-400">Configure options above to preview</span>
                  ) : (
                    <>
                      {pickerCat && (pickerCat === "other" ? (pickerCatCustom.trim() || "Other") : CATEGORY_META[pickerCat]?.label)}
                      {pickerCat && pickerFmt && <span className="text-gray-300 mx-2">·</span>}
                      {pickerFmt && FORMAT_META[pickerFmt]?.label}
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={addSet}
                disabled={!canAdd}
                className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider px-5 py-3 rounded-xl bg-[#1e40af] text-white hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer select-none"
              >
                Create Set <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
      {setKeys.length === 0 && !showPicker && (
        <div className="rounded-2xl border border-gray-150 bg-gradient-to-b from-gray-50/40 to-white overflow-hidden shadow-sm">
          <div className="py-16 px-8 text-center">
            {/* Icon */}
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
              style={{
                background: "linear-gradient(135deg, rgba(30,64,175,0.12) 0%, rgba(30,64,175,0.04) 100%)",
                boxShadow: "0 8px 30px rgba(30,64,175,0.08), inset 0 1px 0 rgba(255,255,255,0.6)",
              }}
            >
              <Video className="w-10 h-10 text-[#1e40af]" />
            </div>

            {/* Copy */}
            <h3 className="text-lg font-black text-gray-900 mb-2">No services listed yet</h3>
            <p className="text-xs font-semibold text-gray-400 max-w-xs mx-auto leading-relaxed mb-8">
              Create service sets so clients know exactly what you offer &mdash; with pricing, deliverables, and your turnaround time.
            </p>

            {/* Feature trio */}
            <div className="flex items-center justify-center gap-6 mb-10 flex-wrap">
              {["Set your own price", "Show deliverables", "Attract more clients"].map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <span className="w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 text-[9px] font-black text-white bg-blue-600">
                    ✓
                  </span>
                  <span className="text-xs font-bold text-gray-500">{f}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={() => setShowPicker(true)}
              className="inline-flex items-center gap-2.5 text-xs font-black uppercase tracking-wider px-6 py-3.5 rounded-xl text-white transition-all active:scale-[0.98] bg-[#1e40af] hover:bg-blue-800 cursor-pointer shadow-md shadow-blue-500/10 hover:shadow-lg"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              Add your first service set
            </button>
          </div>

          {/* Bottom hint strip */}
          <div className="border-t border-gray-100 bg-gray-50/50 px-6 py-3.5 flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1e40af] shrink-0" />
            <p className="text-xs font-semibold text-gray-400">
              {maxSets !== null ? <>Up to <span className="font-bold text-gray-600">{maxSets} sets</span>, {packagesPerSet} packages each on {membershipTier}.</> : <>{packagesPerSet} packages per set — unlimited sets on {membershipTier}.</>} <a href="/editor/membership" className="text-[#1e40af] font-bold hover:underline">Upgrade</a> to unlock more.
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
            className="rounded-2xl border border-gray-150 bg-white overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.015)] transition-all duration-200"
            style={{ borderLeftColor: catMeta.color, borderLeftWidth: 4 }}
          >
            {/* Set header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white hover:bg-gray-50/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${catMeta.color}12` }}>
                  <div className="w-3 h-3 rounded-full" style={{ background: catMeta.color }} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-sm font-black text-gray-900">{catMeta.label}</span>
                    {fmtMeta && (
                      <span className={cn("text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border", 
                        fmtMeta.badge === "bg-gray-100 text-gray-600" 
                          ? "bg-gray-50 text-gray-500 border-gray-200" 
                          : "bg-blue-50 text-blue-600 border-blue-100"
                      )}>
                        {fmtMeta.label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400">{pkgs.length} service{pkgs.length !== 1 ? "s" : ""}</span>
                    {pkgs.length > 0 && (
                      <>
                        <span className="text-gray-200">·</span>
                        <span className="text-xs font-bold text-emerald-500">{pkgs.filter(p => p.isActive).length} active</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {pkgs.length === 0 && (
                  <button onClick={() => removeSet(key)} className="p-2 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all cursor-pointer"
                >
                  {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Services list */}
            {!isCollapsed && (
              <div className="p-5 space-y-4 bg-gray-50/50">

                {/* Package cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {pkgs.map((pkg) => {
                    const isThisEditing = isEditingHere && editingPkg?.id === pkg.id;
                    return (
                      <div
                        key={pkg.id}
                        className={cn(
                          "rounded-2xl border bg-white overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:shadow-md hover:shadow-gray-200/20 transition-all duration-200 flex flex-col",
                          isThisEditing
                            ? "border-blue-500 ring-2 ring-blue-500/10"
                            : "border-gray-150 hover:border-gray-250"
                        )}
                      >
                        {/* Main content */}
                        <div className="px-5 pt-5 pb-4 flex-1 space-y-3.5">
                          {/* Title + Price */}
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-black text-gray-900 leading-snug">{pkg.title}</p>
                            <p className="text-xl font-black text-gray-900 shrink-0 leading-none drop-shadow-sm">{formatCurrency(pkg.price)}</p>
                          </div>
                          <p className="text-xs font-semibold text-gray-400 leading-relaxed line-clamp-2">{pkg.description}</p>

                          {/* Spec chips */}
                          <div className="flex flex-wrap gap-1.5">
                            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-blue-750 bg-blue-50/60 border border-blue-100/60 px-2.5 py-1 rounded-xl">
                              <Clock className="w-3.5 h-3.5 text-blue-550" /> {pkg.deliveryDays}d delivery
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-700 bg-amber-50/60 border border-amber-100/60 px-2.5 py-1 rounded-xl">
                              <RefreshCw className="w-3.5 h-3.5 text-amber-500" /> {pkg.revisionCount === -1 ? "∞" : pkg.revisionCount} rev
                            </span>
                            {pkg.videoLengthLimit && (
                              <span className="inline-flex items-center text-[10.5px] font-bold text-gray-600 bg-gray-50 border border-gray-200/80 px-2.5 py-1 rounded-xl">
                                {pkg.videoLengthLimit}
                              </span>
                            )}
                            {pkg.resolution && (
                              <span className="inline-flex items-center text-[10.5px] font-black bg-purple-50 text-purple-600 border border-purple-100/60 px-2.5 py-1 rounded-xl uppercase tracking-wider">
                                {pkg.resolution}
                              </span>
                            )}
                          </div>

                          {/* Add-on pills */}
                          {((pkg.addons?.length ?? 0) > 0 || pkg.includesSourceFiles || pkg.includesCommercialRights) && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {pkg.addons?.map((a) => (
                                <span key={a} className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100/50 uppercase tracking-wide">
                                  {ADDON_LABELS[a] ?? a.replace(/_/g, " ")}
                                </span>
                              ))}
                              {pkg.includesSourceFiles && (
                                <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-105">
                                  <FileArchive className="w-2.5 h-2.5" /> Source files
                                </span>
                              )}
                              {pkg.includesCommercialRights && (
                                <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-105">
                                  <Briefcase className="w-2.5 h-2.5" /> Commercial
                                </span>
                              )}
                            </div>
                          )}

                          {/* Software + delivery format tags */}
                          {((pkg.softwareUsed?.length ?? 0) > 0 || (pkg.deliveryFormats?.length ?? 0) > 0) && (
                            <div className="flex flex-wrap gap-1.5 pt-3.5 border-t border-gray-100">
                              {pkg.softwareUsed?.map((s) => (
                                <span key={s} className="text-[9.5px] font-bold text-gray-500 bg-gray-50 border border-gray-200/80 px-2 py-0.5 rounded-full">
                                  {SOFTWARE_LABELS[s] ?? s}
                                </span>
                              ))}
                              {pkg.deliveryFormats?.map((f) => (
                                <span key={f} className="text-[9.5px] font-bold text-gray-500 bg-gray-50 border border-gray-200/80 px-2 py-0.5 rounded-full">
                                  {FORMAT_LABELS[f] ?? f}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Footer action bar */}
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-55/40 mt-auto">
                          <div className="flex items-center gap-2 pl-1 select-none">
                            <Switch checked={pkg.isActive} onCheckedChange={() => toggleActive(pkg)} className="scale-[0.8] cursor-pointer" />
                            <span className={cn("text-xs font-bold flex items-center gap-1.5", pkg.isActive ? "text-emerald-600" : "text-amber-500")}>
                              {pkg.isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                              {pkg.isActive ? "Active" : "Paused"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => openForm(key, pkg)}
                              className={cn(
                                "flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer",
                                isThisEditing
                                  ? "border-blue-200 bg-blue-50 text-blue-600"
                                  : "border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300 hover:bg-gray-50"
                              )}
                            >
                              <Pencil className="w-3 h-3" /> Edit
                            </button>
                            <button
                              onClick={() => deletePackage(pkg)}
                              className="p-1.5 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Full-width edit / create form */}
                {isEditingHere && (
                  <div className="rounded-2xl border border-gray-200 bg-white shadow-md overflow-hidden animate-in fade-in duration-200">
                    <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-sky-400 to-[#1e40af]" />
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-5">
                        <p className="text-sm font-black text-gray-900 uppercase tracking-wider">
                          {editingPkg !== null ? `Edit Package — ${editingPkg?.title}` : `New Service Details — ${setLabel(key)}`}
                        </p>
                        <button onClick={closeForm} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-150 transition-all cursor-pointer">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <PackageBuilderForm
                        existing={editingPkg ?? undefined}
                        lockedCategory={category === "__none__" ? null : category}
                        lockedFormat={format === "__none__" ? null : format}
                        onSaved={handleSaved}
                        onCancel={closeForm}
                      />
                    </div>
                  </div>
                )}

                {/* Add service / full indicator */}
                {!isEditingHere && (
                  pkgs.length >= packagesPerSet ? (
                    <div className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200/80 bg-gray-50/20 py-5 text-sm font-bold text-gray-300 cursor-not-allowed select-none">
                      <Plus className="w-4 h-4" /> {packagesPerSet}/{packagesPerSet} Packages — Set is Full
                    </div>
                  ) : (
                    <button
                      onClick={() => openForm(key, null)}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/5 hover:text-blue-600 py-5 text-sm font-bold text-gray-400 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Add a service to this set ({pkgs.length}/{packagesPerSet})
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { useState, useRef, KeyboardEvent, useEffect } from "react";
import { X, Search, CheckCircle2, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PRESET_TOOLS: Record<string, { emoji: string; items: string[] }> = {
  "Video Editing": {
    emoji: "🎬",
    items: [
      "Adobe Premiere Pro", "DaVinci Resolve", "Final Cut Pro", "CapCut",
      "Sony Vegas Pro", "iMovie", "Filmora", "Kdenlive", "HitFilm Express",
    ],
  },
  "Motion Graphics": {
    emoji: "✨",
    items: [
      "Adobe After Effects", "Motion 5", "Blender", "Cinema 4D",
      "Cavalry", "HitFilm Express",
    ],
  },
  "Audio": {
    emoji: "🎙️",
    items: [
      "Adobe Audition", "Audacity", "Logic Pro", "GarageBand",
      "FL Studio", "Reaper",
    ],
  },
  "Design": {
    emoji: "🎨",
    items: [
      "Adobe Photoshop", "Adobe Illustrator", "Canva",
      "Figma", "GIMP", "Affinity Designer",
    ],
  },
  "Color Grading": {
    emoji: "🌈",
    items: [
      "DaVinci Resolve Color", "Lumetri Color", "FilmConvert",
      "LUTS.io", "Dehancer",
    ],
  },
  "Subtitles": {
    emoji: "💬",
    items: ["Descript", "Kapwing", "Zubtitle", "AutoSub", "SubRip"],
  },
  "AI Tools": {
    emoji: "🤖",
    items: [
      "RunwayML", "Adobe Firefly", "ElevenLabs", "Topaz Video AI",
      "Pika Labs", "Sora",
    ],
  },
};

const ALL_TOOLS = Object.entries(PRESET_TOOLS).flatMap(([cat, { items }]) =>
  items.map((item) => ({ cat, item }))
);

interface ToolTagsProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  className?: string;
  /** Return an error message to reject a custom tag, or null/undefined to allow it. */
  validateTag?: (value: string) => string | null | undefined;
}

export function ToolTags({ tags, onChange, placeholder = "e.g. Resolve Fusion", maxTags = 20, className, validateTag }: ToolTagsProps) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(Object.keys(PRESET_TOOLS)[0]);
  const [search, setSearch] = useState("");
  const [customInput, setCustomInput] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const customRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  function addTag(value: string, skipValidation = false) {
    const trimmed = value.trim();
    if (!trimmed || tags.includes(trimmed) || tags.length >= maxTags) return;
    if (!skipValidation && validateTag) {
      const error = validateTag(trimmed);
      if (error) { toast.error(error); return; }
    }
    onChange([...tags, trimmed]);
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  function toggle(tool: string) {
    // Presets are curated by us, so they skip the custom-tag validator.
    if (tags.includes(tool)) removeTag(tool); else addTag(tool, true);
  }

  function handleCustomKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); addTag(customInput); setCustomInput(""); }
    if (e.key === "Backspace" && !customInput && tags.length > 0) onChange(tags.slice(0, -1));
  }

  const searchResults = search.trim()
    ? ALL_TOOLS.filter(({ item }) => item.toLowerCase().includes(search.toLowerCase()))
    : null;

  const categories = Object.keys(PRESET_TOOLS);

  return (
    <div className={cn("space-y-3", className)} ref={containerRef}>

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all",
          open
            ? "border-[#0EA5E9] bg-[#0EA5E9]/5 text-[#0EA5E9]"
            : "border-dashed border-gray-300 text-gray-500 hover:border-[#0EA5E9]/50 hover:text-[#0EA5E9] hover:bg-[#0EA5E9]/5"
        )}
      >
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4" />
          {open ? "Browsing tools — click a tool to add" : "Browse & add tools"}
        </div>
        <span className="text-xs font-normal text-gray-400">{tags.length}/{maxTags}</span>
      </button>

      {/* Panel */}
      {open && (
        <div className="border border-gray-200 rounded-2xl shadow-lg overflow-hidden bg-white">
          {/* Search bar */}
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60">
            <div className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-xl px-3 py-2 focus-within:border-[#0EA5E9] focus-within:ring-2 focus-within:ring-[#0EA5E9]/10 transition-all">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search all tools…"
                className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder:text-gray-400"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {searchResults ? (
            /* ── Search results ── */
            <div className="p-3 max-h-56 overflow-y-auto">
              {searchResults.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400">No tools match &quot;{search}&quot;</p>
                  <p className="text-xs text-gray-300 mt-1">Add it as a custom tool below</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {searchResults.map(({ item }) => {
                    const selected = tags.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggle(item)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                          selected
                            ? "bg-[#0EA5E9] text-white border-[#0EA5E9]"
                            : "bg-white text-gray-600 border-gray-200 hover:border-[#0EA5E9] hover:text-[#0EA5E9]"
                        )}
                      >
                        {selected && <CheckCircle2 className="w-3 h-3" />}
                        {item}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ── Category browser ── */
            <div className="flex" style={{ height: 260 }}>
              {/* Left sidebar */}
              <div className="w-36 shrink-0 border-r border-gray-100 overflow-y-auto bg-gray-50/40 py-2">
                {categories.map((cat) => {
                  const { emoji } = PRESET_TOOLS[cat];
                  const count = PRESET_TOOLS[cat].items.filter((t) => tags.includes(t)).length;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={cn(
                        "w-full text-left px-3 py-2.5 text-xs font-medium transition-all flex items-center justify-between gap-1",
                        activeCategory === cat
                          ? "bg-white text-[#0EA5E9] border-r-2 border-[#0EA5E9]"
                          : "text-gray-500 hover:text-gray-800 hover:bg-white/60"
                      )}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <span>{emoji}</span>
                        <span className="truncate">{cat}</span>
                      </span>
                      {count > 0 && (
                        <span className="shrink-0 w-4 h-4 rounded-full bg-[#0EA5E9] text-white text-[10px] flex items-center justify-center font-bold">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Right tool grid */}
              <div className="flex-1 overflow-y-auto p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {PRESET_TOOLS[activeCategory].emoji} {activeCategory}
                </p>
                <div className="flex flex-wrap gap-2">
                  {PRESET_TOOLS[activeCategory].items.map((tool) => {
                    const selected = tags.includes(tool);
                    return (
                      <button
                        key={tool}
                        type="button"
                        onClick={() => toggle(tool)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                          selected
                            ? "bg-[#0EA5E9] text-white border-[#0EA5E9] shadow-sm"
                            : "bg-white text-gray-600 border-gray-200 hover:border-[#0EA5E9] hover:text-[#0EA5E9] hover:bg-[#0EA5E9]/5"
                        )}
                      >
                        {selected && <CheckCircle2 className="w-3 h-3 shrink-0" />}
                        {tool}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Custom input row */}
          <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/40 flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 focus-within:border-[#0EA5E9] focus-within:ring-2 focus-within:ring-[#0EA5E9]/10 transition-all">
              <span className="text-xs text-gray-400 shrink-0">Custom:</span>
              <input
                ref={customRef}
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={handleCustomKey}
                placeholder={placeholder}
                disabled={tags.length >= maxTags}
                className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder:text-gray-400 disabled:opacity-40"
              />
              {customInput && (
                <button
                  type="button"
                  onClick={() => { addTag(customInput); setCustomInput(""); customRef.current?.focus(); }}
                  className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-lg bg-[#0EA5E9] text-white"
                >
                  Add
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selected tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1.5 bg-[#0EA5E9]/10 text-[#0EA5E9] text-xs px-3 py-1.5 rounded-full font-medium border border-[#0EA5E9]/20"
            >
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

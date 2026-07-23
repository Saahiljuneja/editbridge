"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  Trash2, Star, StarOff, GripVertical, ChevronDown, X, Plus, Edit3,
  ArrowLeftRight, Check, ShieldCheck, Link as LinkIcon, Play, Filter,
  LayoutGrid, List, Copy, Eye, EyeOff, AlertCircle,
  Share2, SortAsc, MoreVertical,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { FileUpload, UploadedFile, getReadableFileSize } from "@/components/common/file-upload/file-upload-base";
import { useUpload } from "@/lib/hooks/use-upload";
import { toast } from "sonner";
import { MAX_FEATURED_ITEMS } from "@/lib/portfolio-validation";
import { getYouTubeId, getVimeoId, getThumbnailUrl, getEmbedUrl, isExternalVideo } from "@/lib/portfolio-media";

// ── Click-outside helper ─────────────────────────────────────────────────────

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onOutside: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [active, onOutside, ref]);
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PORTFOLIO_CATEGORIES = [
  "YouTube Video", "Reels / Shorts", "Wedding Video", "Corporate Video",
  "Music Video", "Podcast", "Documentary", "Ad / Commercial",
  "Gaming Video", "Thumbnail", "Motion Graphics", "VFX",
  "Color Grading", "Tutorial", "Vlog",
];

const SORT_OPTIONS = [
  { value: "manual",   label: "Manual order" },
  { value: "newest",   label: "Newest first" },
  { value: "oldest",   label: "Oldest first" },
  { value: "views",    label: "Most viewed" },
  { value: "likes",    label: "Most liked" },
  { value: "featured", label: "Featured first" },
] as const;
type SortMode = typeof SORT_OPTIONS[number]["value"];

// ── Completeness ──────────────────────────────────────────────────────────────

function completenessScore(item: PortfolioItem): number {
  return [
    !!item.title,
    !!item.description,
    !!item.category,
    !!(item.thumbnailUrl || getThumbnailUrl(item.url)),
  ].filter(Boolean).length;
}

const COMPLETENESS_BADGE = [
  "bg-red-50 text-red-600",
  "bg-orange-50 text-orange-600",
  "bg-yellow-50 text-yellow-700",
  "bg-emerald-50 text-emerald-600",
  "bg-emerald-50 text-emerald-600",
];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PortfolioItem {
  id: string;
  type: "video" | "image";
  url: string;
  beforeUrl?: string | null;
  thumbnailUrl?: string | null;
  title: string | null;
  description: string | null;
  category: string | null;
  tags: string[];
  isFeatured: boolean;
  isHidden: boolean;
  sortOrder: number;
  orderId?: string | null;
  likesCount?: number;
  commentsCount?: number;
  viewsCount?: number;
  createdAt?: string;
}

export interface CompletedOrderOption {
  id: string;
  packageTitle: string | null;
  clientName: string | null;
  createdAt: string;
}

interface UndoEntry {
  id: string;
  item: PortfolioItem;
  timer: ReturnType<typeof setTimeout>;
}

interface Props {
  initialPortfolio: PortfolioItem[];
  editorId?: string;
  maxFileSizeMb?: number;
}

// ── API helper ───────────────────────────────────────────────────────────────

async function createPortfolioItem(body: Record<string, unknown>): Promise<PortfolioItem> {
  const res = await fetch("/api/portfolio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? "Request failed");
  }
  return res.json();
}

// ── Main component ────────────────────────────────────────────────────────────

export function PortfolioSection({ initialPortfolio, editorId, maxFileSizeMb }: Props) {
  const [items, setItems] = useState<PortfolioItem[]>(
    [...initialPortfolio].sort((a, b) => a.sortOrder - b.sortOrder)
  );
  const [uploadQueue, setUploadQueue] = useState<UploadedFile[]>([]);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [sliderValues, setSliderValues] = useState<Record<string, number>>({});
  const [draggingId, setDraggingId]   = useState<string | null>(null);
  const [dragOverId, setDragOverId]   = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode]       = useState<"grid" | "list">(() => {
    if (typeof window !== "undefined") return (localStorage.getItem("portfolio-view") as "grid" | "list") ?? "grid";
    return "grid";
  });
  const [sortMode, setSortMode]       = useState<SortMode>("manual");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [needsAttentionOnly, setNeedsAttentionOnly] = useState(false);
  const [showHidden, setShowHidden]   = useState(false);
  const [urlInput, setUrlInput]       = useState("");
  const [addingUrl, setAddingUrl]     = useState(false);
  const [showUrlPanel, setShowUrlPanel] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [bulkCategory, setBulkCategory] = useState("");
  const [showBulkCatPicker, setShowBulkCatPicker] = useState(false);
  const undoQueue = useRef<UndoEntry[]>([]);
  const dragItem  = useRef<string | null>(null);
  const [completedOrders, setCompletedOrders] = useState<CompletedOrderOption[]>([]);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const idCounter = useRef(0);
  const { upload } = useUpload();
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const bulkCatRef  = useRef<HTMLDivElement>(null);

  useClickOutside(sortMenuRef, () => setShowSortMenu(false), showSortMenu);
  useClickOutside(bulkCatRef, () => setShowBulkCatPicker(false), showBulkCatPicker);

  function nextTempId(prefix: string) {
    idCounter.current += 1;
    return `${prefix}_${idCounter.current}`;
  }

  function addPending(id: string) {
    setPendingIds(prev => new Set(prev).add(id));
  }

  function removePending(id: string) {
    setPendingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
  }

  useEffect(() => {
    fetch("/api/orders?status=completed")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.orders) setCompletedOrders(d.orders.map((o: { id: string; packageTitle: string | null; clientName: string | null; createdAt: string }) => ({
          id: o.id, packageTitle: o.packageTitle, clientName: o.clientName, createdAt: o.createdAt,
        })));
      }).catch(() => {});
  }, []);

  // persist view mode
  useEffect(() => { localStorage.setItem("portfolio-view", viewMode); }, [viewMode]);

  // ── helpers ──────────────────────────────────────────────────────────────

  function updateLocal(id: string, patch: Partial<PortfolioItem>) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  }

  async function persist(id: string, patch: Partial<PortfolioItem>) {
    const previous = items.find(i => i.id === id);
    updateLocal(id, patch);
    const res = await fetch(`/api/portfolio/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => null);

    if (!res || !res.ok) {
      if (previous) updateLocal(id, previous);
      const data = res ? await res.json().catch(() => null) : null;
      toast.error(data?.error ?? "Failed to save");
    }
  }

  function toggleFeature(item: PortfolioItem) {
    if (!item.isFeatured && featuredCount >= MAX_FEATURED_ITEMS) {
      toast.error(`You can feature at most ${MAX_FEATURED_ITEMS} items — unfeature another first.`);
      return;
    }
    persist(item.id, { isFeatured: !item.isFeatured });
  }

  // ── undo delete ───────────────────────────────────────────────────────────

  function scheduleDelete(item: PortfolioItem) {
    // Optimistically remove
    setItems(prev => prev.filter(i => i.id !== item.id));
    setSelectedIds(prev => { const s = new Set(prev); s.delete(item.id); return s; });

    const timer = setTimeout(() => {
      fetch(`/api/portfolio/${item.id}`, { method: "DELETE" }).catch(() => {});
      undoQueue.current = undoQueue.current.filter(e => e.id !== item.id);
    }, 5000);

    undoQueue.current.push({ id: item.id, item, timer });

    toast(`"${item.title || "Item"}" deleted`, {
      action: {
        label: "Undo",
        onClick: () => {
          const entry = undoQueue.current.find(e => e.id === item.id);
          if (!entry) return;
          clearTimeout(entry.timer);
          undoQueue.current = undoQueue.current.filter(e => e.id !== item.id);
          setItems(prev => {
            const next = [...prev, entry.item];
            return next.sort((a, b) => a.sortOrder - b.sortOrder);
          });
          toast.success("Deletion undone");
        },
      },
      duration: 5000,
    });
  }

  function scheduleBulkDelete(ids: string[]) {
    const toDelete = items.filter(i => ids.includes(i.id));
    setItems(prev => prev.filter(i => !ids.includes(i.id)));
    setSelectedIds(new Set());

    const timer = setTimeout(() => {
      fetch("/api/portfolio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulk: { ids, action: "delete" } }),
      }).catch(() => {});
      undoQueue.current = undoQueue.current.filter(e => !ids.includes(e.id));
    }, 5000);

    // store one entry per item so individual undo also works
    ids.forEach(id => {
      const item = toDelete.find(i => i.id === id);
      if (item) undoQueue.current.push({ id, item, timer });
    });

    toast(`${ids.length} item${ids.length > 1 ? "s" : ""} deleted`, {
      action: {
        label: "Undo",
        onClick: () => {
          clearTimeout(timer);
          undoQueue.current = undoQueue.current.filter(e => !ids.includes(e.id));
          setItems(prev => {
            const next = [...prev, ...toDelete];
            return next.sort((a, b) => a.sortOrder - b.sortOrder);
          });
          toast.success("Deletion undone");
        },
      },
      duration: 5000,
    });
  }

  // ── bulk actions ──────────────────────────────────────────────────────────

  async function bulkAction(action: string, extra?: Record<string, unknown>) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    if (action === "delete") { scheduleBulkDelete(ids); return; }

    if (action === "feature") {
      const alreadyFeaturedSelected = items.filter(i => selectedIds.has(i.id) && i.isFeatured).length;
      const toFeatureCount = ids.length - alreadyFeaturedSelected;
      const remainingSlots = MAX_FEATURED_ITEMS - (featuredCount - alreadyFeaturedSelected);
      if (toFeatureCount > remainingSlots) {
        toast.error(remainingSlots <= 0
          ? `You can feature at most ${MAX_FEATURED_ITEMS} items — unfeature some first.`
          : `Only ${remainingSlots} more item${remainingSlots === 1 ? "" : "s"} can be featured (limit ${MAX_FEATURED_ITEMS}).`);
        return;
      }
    }

    const previousItems = items;
    const patch: Partial<PortfolioItem> =
      action === "feature"     ? { isFeatured: true }  :
      action === "unfeature"   ? { isFeatured: false } :
      action === "hide"        ? { isHidden: true }    :
      action === "unhide"      ? { isHidden: false }   :
      action === "setCategory" ? { category: (extra?.category as string) ?? null } : {};

    setItems(prev => prev.map(i => selectedIds.has(i.id) ? { ...i, ...patch } : i));
    setSelectedIds(new Set());
    setShowBulkCatPicker(false);
    setBulkCategory("");

    const res = await fetch("/api/portfolio", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bulk: { ids, action, ...extra } }),
    }).catch(() => null);

    if (!res || !res.ok) {
      setItems(previousItems);
      const data = res ? await res.json().catch(() => null) : null;
      toast.error(data?.error ?? "Bulk action failed");
    }
  }

  // ── duplicate ─────────────────────────────────────────────────────────────

  async function handleDuplicate(item: PortfolioItem) {
    const tempId = nextTempId("temp_dup");
    addPending(tempId);
    const placeholder: PortfolioItem = {
      ...item, id: tempId,
      title: item.title ? `${item.title} (copy)` : null,
      isFeatured: false,
      sortOrder: items.length,
    };
    setItems(prev => [...prev, placeholder]);

    createPortfolioItem({ duplicate: true, sourceId: item.id })
      .then(saved => {
        removePending(tempId);
        setItems(prev => prev.map(i => i.id === tempId ? { ...i, ...saved, tags: saved.tags ?? [] } : i));
        toast.success("Item duplicated");
      })
      .catch((err: Error) => {
        removePending(tempId);
        setItems(prev => prev.filter(i => i.id !== tempId));
        toast.error(err.message || "Failed to duplicate");
      });
  }

  // ── add via URL ───────────────────────────────────────────────────────────

  async function handleAddUrl() {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (!getYouTubeId(trimmed) && !getVimeoId(trimmed)) {
      toast.error("Please paste a valid YouTube or Vimeo URL.");
      return;
    }
    setAddingUrl(true);
    const tempId = nextTempId("temp_url");
    addPending(tempId);
    setItems(prev => [...prev, {
      id: tempId, type: "video", url: trimmed,
      title: null, description: null, category: null, tags: [],
      isFeatured: false, isHidden: false, sortOrder: items.length, beforeUrl: null,
    }]);
    setUrlInput(""); setShowUrlPanel(false);

    createPortfolioItem({ type: "video", url: trimmed, sortOrder: items.length })
      .then(saved => {
        removePending(tempId);
        setItems(prev => prev.map(i => i.id === tempId ? { ...i, ...saved, tags: saved.tags ?? [] } : i));
        setEditingId(saved.id);
        toast.success("Video added! Add a title and category.");
      })
      .catch((err: Error) => {
        removePending(tempId);
        setItems(prev => prev.filter(i => i.id !== tempId));
        toast.error(err.message || "Failed to add video.");
      })
      .finally(() => setAddingUrl(false));
  }

  // ── file upload ───────────────────────────────────────────────────────────

  async function handleDropFiles(files: FileList) {
    const fileArr = Array.from(files);
    const baseSortOrder = items.length;
    const queueEntries: (UploadedFile & { file: File })[] = fileArr.map(file => ({
      id: nextTempId("q"),
      name: file.name, size: file.size, type: file.type, progress: 0, failed: false, file,
    }));
    setUploadQueue(prev => [...prev, ...queueEntries.map((entry) => {
      const { file, ...rest } = entry;
      void file;
      return rest;
    })]);

    await Promise.all(queueEntries.map(async ({ id: qId, file }, index) => {
      const result = await upload(file, "portfolio", pct => {
        setUploadQueue(prev => prev.map(e => e.id === qId ? { ...e, progress: pct, failed: false } : e));
      });
      if (!result) {
        setUploadQueue(prev => prev.map(e => e.id === qId ? { ...e, failed: true, progress: 0 } : e));
        return;
      }
      const { key } = result;
      const proxyUrl = `/api/file/${key}`;
      const type = file.type.startsWith("video/")
        ? "video"
        : file.type.startsWith("image/")
        ? "image"
        : key.match(/\.(mp4|mov|avi|webm|mkv|flv|wmv|m4v|mts|3gp|ogv|mpe?g)$/i)
        ? "video"
        : "image";
      const sortOrder = baseSortOrder + index;
      const tempId = `temp_${qId}`;
      addPending(tempId);
      setItems(prev => [...prev, {
        id: tempId, type, url: proxyUrl,
        title: null, description: null, category: null, tags: [],
        isFeatured: false, isHidden: false, sortOrder, beforeUrl: null,
      }]);
      createPortfolioItem({ type, url: key, sortOrder })
        .then(saved => {
          removePending(tempId);
          setItems(prev => prev.map(i => i.id === tempId ? { ...i, ...saved, tags: saved.tags ?? [] } : i));
          setEditingId(saved.id);
          setUploadQueue(prev => prev.filter(e => e.id !== qId));
        })
        .catch((err: Error) => {
          removePending(tempId);
          setItems(prev => prev.filter(i => i.id !== tempId));
          setUploadQueue(prev => prev.map(e => e.id === qId ? { ...e, failed: true, progress: 0 } : e));
          toast.error(err.message || "Failed to save upload.");
        });
    }));
  }

  // ── drag reorder (desktop) ────────────────────────────────────────────────

  const onDragStart = useCallback((id: string) => { dragItem.current = id; setDraggingId(id); }, []);
  const onDragOver  = useCallback((e: React.DragEvent, id: string) => { e.preventDefault(); if (dragItem.current !== id) setDragOverId(id); }, []);
  const onDrop = useCallback((targetId: string) => {
    if (!dragItem.current || dragItem.current === targetId) return;
    setItems(prev => {
      const next = [...prev];
      const from = next.findIndex(i => i.id === dragItem.current);
      const to   = next.findIndex(i => i.id === targetId);
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      const reordered = next.map((item, idx) => ({ ...item, sortOrder: idx }));
      fetch("/api/portfolio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: reordered.map(({ id, sortOrder }) => ({ id, sortOrder })) }),
      }).catch(() => null);
      return reordered;
    });
    setDraggingId(null); setDragOverId(null); dragItem.current = null;
  }, []);

  // ── touch drag (mobile) ───────────────────────────────────────────────────

  const touchItemId = useRef<string | null>(null);

  function onTouchStart(e: React.TouchEvent, id: string) {
    if (sortMode !== "manual" || selectedIds.size > 0) return;
    // Don't start drag tracking when the touch lands on a button/input/link inside
    // the card (checkbox, action buttons, before/after slider) — otherwise every
    // tap briefly flashes the card's "dragging" visual state.
    const target = e.target as HTMLElement;
    if (target.closest("button, input, a, [role='button']")) return;
    touchItemId.current = id;
    setDraggingId(id);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!touchItemId.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const card = el?.closest("[data-portfolio-id]") as HTMLElement | null;
    const targetId = card?.dataset.portfolioId ?? null;
    if (targetId && targetId !== touchItemId.current) setDragOverId(targetId);
  }

  function onTouchEnd() {
    if (touchItemId.current && dragOverId) {
      onDrop(dragOverId);
    }
    touchItemId.current = null;
    setDraggingId(null);
    setDragOverId(null);
  }

  // ── selection ─────────────────────────────────────────────────────────────

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(visibleItems.map(i => i.id)));
  }

  // ── share link ────────────────────────────────────────────────────────────

  function handleShare() {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const url = editorId ? `${base}/editor/${editorId}#portfolio` : `${base}/editor/portfolio`;
    navigator.clipboard?.writeText(url);
    toast.success("Portfolio link copied!");
  }

  // ── derived ───────────────────────────────────────────────────────────────

  const sortedItems = [...items].sort((a, b) => {
    if (sortMode === "manual")   return a.sortOrder - b.sortOrder;
    if (sortMode === "newest")   return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
    if (sortMode === "oldest")   return new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();
    if (sortMode === "views")    return (b.viewsCount ?? 0) - (a.viewsCount ?? 0);
    if (sortMode === "likes")    return (b.likesCount ?? 0) - (a.likesCount ?? 0);
    if (sortMode === "featured") return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
    return 0;
  });

  const visibleItems = sortedItems
    .filter(i => showHidden || !i.isHidden)
    .filter(i => !needsAttentionOnly || completenessScore(i) < 4)
    .filter(i => !categoryFilter || i.category === categoryFilter);

  const featuredCount  = items.filter(i => i.isFeatured).length;
  const hiddenCount    = items.filter(i => i.isHidden).length;
  const allCategories  = Array.from(new Set(items.map(i => i.category).filter(Boolean))) as string[];
  const needsAttnCount = items.filter(i => completenessScore(i) < 4).length;
  const canDrag        = sortMode === "manual" && selectedIds.size === 0;

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-sm text-gray-500 flex-1 min-w-0">
          Drag to reorder — featured items appear first on your profile.
        </p>

        {/* Share */}
        <button onClick={handleShare} title="Copy portfolio link" aria-label="Copy portfolio link"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          <Share2 className="w-3.5 h-3.5" /> Share
        </button>

        {/* View toggle */}
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
          <button onClick={() => setViewMode("grid")} aria-label="Grid view" aria-pressed={viewMode === "grid"}
            className={cn("px-2.5 py-1.5 transition-colors", viewMode === "grid" ? "bg-[#0EA5E9] text-white" : "text-gray-400 hover:text-gray-600")}>
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setViewMode("list")} aria-label="List view" aria-pressed={viewMode === "list"}
            className={cn("px-2.5 py-1.5 transition-colors", viewMode === "list" ? "bg-[#0EA5E9] text-white" : "text-gray-400 hover:text-gray-600")}>
            <List className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Sort */}
        <div className="relative" ref={sortMenuRef}>
          <button onClick={() => setShowSortMenu(s => !s)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <SortAsc className="w-3.5 h-3.5" />
            {SORT_OPTIONS.find(o => o.value === sortMode)?.label}
            <ChevronDown className="w-3 h-3 text-gray-400" />
          </button>
          {showSortMenu && (
            <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-44">
              {SORT_OPTIONS.map(o => (
                <button key={o.value} onClick={() => { setSortMode(o.value); setShowSortMenu(false); }}
                  className={cn("w-full text-left px-4 py-2 text-xs transition-colors",
                    sortMode === o.value ? "text-[#0EA5E9] font-semibold bg-[#0EA5E9]/5" : "text-gray-700 hover:bg-gray-50"
                  )}>
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full shrink-0">
          {items.length} item{items.length !== 1 ? "s" : ""}
          {featuredCount > 0 && ` · ${featuredCount}/${MAX_FEATURED_ITEMS} ★`}
        </span>
      </div>

      {/* ── Filters ── */}
      <div className="space-y-2">
        {allCategories.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <button onClick={() => setCategoryFilter(null)}
              className={cn("px-3 py-1 rounded-full text-xs font-medium border transition-all shrink-0 whitespace-nowrap",
                !categoryFilter ? "bg-[#0EA5E9] text-white border-[#0EA5E9]" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300")}>
              All
            </button>
            {allCategories.map(cat => (
              <button key={cat} onClick={() => setCategoryFilter(cat === categoryFilter ? null : cat)}
                className={cn("px-3 py-1 rounded-full text-xs font-medium border transition-all shrink-0 whitespace-nowrap",
                  categoryFilter === cat ? "bg-[#0EA5E9] text-white border-[#0EA5E9]" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300")}>
                {cat}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {needsAttnCount > 0 && (
            <button onClick={() => setNeedsAttentionOnly(v => !v)}
              className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all",
                needsAttentionOnly ? "bg-orange-500 text-white border-orange-500" : "bg-white text-orange-600 border-orange-200 hover:border-orange-300")}>
              <AlertCircle className="w-3 h-3" />
              {needsAttnCount} need attention
            </button>
          )}

          {hiddenCount > 0 && (
            <button onClick={() => setShowHidden(v => !v)}
              className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all",
                showHidden ? "bg-gray-700 text-white border-gray-700" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300")}>
              <EyeOff className="w-3 h-3" />
              {hiddenCount} hidden
            </button>
          )}

          {items.length > 1 && (
            <button onClick={selectedIds.size === visibleItems.length ? () => setSelectedIds(new Set()) : selectAll}
              className="ml-auto px-3 py-1 rounded-full text-xs font-medium border border-gray-200 text-gray-500 hover:border-gray-300 transition-all">
              {selectedIds.size === visibleItems.length ? "Deselect all" : "Select all"}
            </button>
          )}
        </div>
      </div>

      {/* ── Bulk action bar ── */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="bg-gray-900/95 backdrop-blur-sm border border-white/10 shadow-lg rounded-2xl px-4 py-3 flex items-center gap-3 flex-wrap"
          >
          <span className="text-sm font-semibold text-white">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2 flex-wrap ml-auto">
            <button onClick={() => bulkAction("feature")} className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors flex items-center gap-1">
              <Star className="w-3 h-3" /> Feature
            </button>
            <button onClick={() => bulkAction("unfeature")} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors flex items-center gap-1">
              <StarOff className="w-3 h-3" /> Unfeature
            </button>
            <button onClick={() => bulkAction("hide")} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors flex items-center gap-1">
              <EyeOff className="w-3 h-3" /> Hide
            </button>
            <button onClick={() => bulkAction("unhide")} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors flex items-center gap-1">
              <Eye className="w-3 h-3" /> Unhide
            </button>

            {/* Bulk set category */}
            <div className="relative" ref={bulkCatRef}>
              <button onClick={() => setShowBulkCatPicker(v => !v)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors flex items-center gap-1">
                Set category <ChevronDown className="w-3 h-3" />
              </button>
              {showBulkCatPicker && (
                <div className="absolute right-0 top-full mt-1 z-40 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-52 max-h-64 overflow-y-auto">
                  {PORTFOLIO_CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => bulkAction("setCategory", { category: cat })}
                      className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                      {cat}
                    </button>
                  ))}
                  <div className="px-3 py-2 border-t border-gray-100 flex gap-1.5">
                    <input value={bulkCategory} onChange={e => setBulkCategory(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && bulkCategory.trim()) bulkAction("setCategory", { category: bulkCategory.trim() }); }}
                      placeholder="Custom category…" maxLength={60}
                      className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-gray-200 outline-none focus:border-[#0EA5E9] transition-all" />
                    <button onClick={() => bulkCategory.trim() && bulkAction("setCategory", { category: bulkCategory.trim() })}
                      disabled={!bulkCategory.trim()}
                      className="px-2.5 py-1.5 rounded-lg bg-[#0EA5E9] text-white text-xs font-semibold disabled:opacity-40 transition-colors">
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => bulkAction("delete")} className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> Delete
            </button>
            <button onClick={() => setSelectedIds(new Set())} aria-label="Clear selection" className="text-white/50 hover:text-white transition-colors p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Grid ── */}
      {visibleItems.length > 0 && viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence initial={false}>
            {visibleItems.map(item => (
              <motion.div key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.18 }}
              >
                <PortfolioCard
                  item={item}
                  isPending={pendingIds.has(item.id)}
                  canDrag={canDrag}
                  isDragging={draggingId === item.id}
                  isDragOver={dragOverId === item.id}
                  isEditing={editingId === item.id}
                  isSelected={selectedIds.has(item.id)}
                  sliderVal={sliderValues[item.id] ?? 50}
                  onSliderChange={v => setSliderValues(prev => ({ ...prev, [item.id]: v }))}
                  onDragStart={() => onDragStart(item.id)}
                  onDragOver={e => onDragOver(e, item.id)}
                  onDrop={() => onDrop(item.id)}
                  onDragEnd={() => { setDraggingId(null); setDragOverId(null); }}
                  onTouchStart={e => onTouchStart(e, item.id)}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                  onToggleSelect={() => toggleSelect(item.id)}
                  onEdit={() => setEditingId(editingId === item.id ? null : item.id)}
                  onFeature={() => toggleFeature(item)}
                  onHide={() => persist(item.id, { isHidden: !item.isHidden })}
                  onDuplicate={() => handleDuplicate(item)}
                  onDelete={() => scheduleDelete(item)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── List ── */}
      {visibleItems.length > 0 && viewMode === "list" && (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {visibleItems.map(item => (
              <motion.div key={item.id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <PortfolioListRow
                  item={item}
                  isPending={pendingIds.has(item.id)}
                  canDrag={canDrag}
                  isDragging={draggingId === item.id}
                  isDragOver={dragOverId === item.id}
                  isSelected={selectedIds.has(item.id)}
                  isEditing={editingId === item.id}
                  onDragStart={() => onDragStart(item.id)}
                  onDragOver={e => onDragOver(e, item.id)}
                  onDrop={() => onDrop(item.id)}
                  onDragEnd={() => { setDraggingId(null); setDragOverId(null); }}
                  onTouchStart={e => onTouchStart(e, item.id)}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                  onToggleSelect={() => toggleSelect(item.id)}
                  onEdit={() => setEditingId(editingId === item.id ? null : item.id)}
                  onFeature={() => toggleFeature(item)}
                  onHide={() => persist(item.id, { isHidden: !item.isHidden })}
                  onDuplicate={() => handleDuplicate(item)}
                  onDelete={() => scheduleDelete(item)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Edit drawer ── */}
      {editingId && (() => {
        const item = items.find(i => i.id === editingId);
        if (!item) return null;
        return (
          <EditDrawer
            key={item.id}
            item={item}
            completedOrders={completedOrders}
            sliderVal={sliderValues[item.id] ?? 50}
            onSliderChange={v => setSliderValues(prev => ({ ...prev, [item.id]: v }))}
            onSave={patch => { persist(item.id, patch); setEditingId(null); }}
            onClose={() => setEditingId(null)}
          />
        );
      })()}

      {/* ── Add options ── */}
      <div className="space-y-3">
        {showUrlPanel && (
          <div className="rounded-2xl border border-[#0EA5E9]/30 bg-[#0EA5E9]/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-[#0EA5E9] shrink-0" />
              <p className="text-sm font-semibold text-gray-800">Add YouTube or Vimeo video</p>
              <button onClick={() => { setShowUrlPanel(false); setUrlInput(""); }} aria-label="Close" className="ml-auto text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <input autoFocus value={urlInput} onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddUrl()}
                placeholder="https://www.youtube.com/watch?v=..."
                className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-gray-200 bg-white outline-none focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9]/10 transition-all" />
              <button onClick={handleAddUrl} disabled={addingUrl || !urlInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-[#0EA5E9] text-white text-sm font-semibold hover:bg-sky-600 disabled:opacity-50 transition-colors">
                {addingUrl ? "Adding…" : "Add"}
              </button>
            </div>
            <p className="text-xs text-gray-400">Paste any YouTube or Vimeo link — no file upload needed.</p>
          </div>
        )}

        <FileUpload.Root>
          <FileUpload.DropZone onDropFiles={handleDropFiles} accept="image/*,video/*"
            label={items.length === 0 ? "Start building your portfolio" : undefined}
            hint={items.length === 0
              ? `Drop a video or image here, or add a YouTube / Vimeo link below · Max ${maxFileSizeMb ?? 5000} MB`
              : `MP4, MOV, AVI, MKV, JPG, PNG · Max ${maxFileSizeMb ?? 5000} MB`} />
          {uploadQueue.length > 0 && (
            <FileUpload.List>
              {uploadQueue.map(f => (
                <FileUpload.ListItemProgressBar key={f.id} {...f}
                  onDelete={() => setUploadQueue(prev => prev.filter(e => e.id !== f.id))}
                  onRetry={() => setUploadQueue(prev => prev.map(e => e.id === f.id ? { ...e, failed: false, progress: 0 } : e))} />
              ))}
            </FileUpload.List>
          )}
        </FileUpload.Root>

        {!showUrlPanel && (
          <button onClick={() => setShowUrlPanel(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-[#0EA5E9] hover:text-[#0EA5E9] hover:bg-[#0EA5E9]/5 transition-all">
            <LinkIcon className="w-4 h-4" />
            Add YouTube / Vimeo link instead
          </button>
        )}
      </div>
    </div>
  );
}

// ── Portfolio Card (grid) ─────────────────────────────────────────────────────

interface CardProps {
  item: PortfolioItem;
  isPending: boolean;
  canDrag: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  isEditing: boolean;
  isSelected: boolean;
  sliderVal: number;
  onSliderChange: (v: number) => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onToggleSelect: () => void;
  onEdit: () => void;
  onFeature: () => void;
  onHide: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function PortfolioCard({
  item, isPending, canDrag, isDragging, isDragOver, isEditing, isSelected,
  sliderVal, onSliderChange, onDragStart, onDragOver, onDrop, onDragEnd,
  onTouchStart, onTouchMove, onTouchEnd,
  onToggleSelect, onEdit, onFeature, onHide, onDuplicate, onDelete,
}: CardProps) {
  const score     = completenessScore(item);
  const thumbnail = item.thumbnailUrl ?? getThumbnailUrl(item.url);
  const external  = isExternalVideo(item.url);
  const hasBA     = !!item.beforeUrl;
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  useClickOutside(moreRef, () => setShowMore(false), showMore);

  return (
    <div
      data-portfolio-id={item.id}
      draggable={canDrag}
      onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={onDragEnd}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      className={cn(
        "bg-white border rounded-2xl overflow-hidden transition-all select-none",
        isDragging && "opacity-40 scale-95",
        isDragOver && "border-[#0EA5E9] ring-2 ring-[#0EA5E9]/20",
        !isDragging && !isDragOver && "border-gray-200",
        isSelected && "ring-2 ring-[#0EA5E9] border-[#0EA5E9]",
        item.isFeatured && !isSelected && "ring-2 ring-amber-400/50 border-amber-300",
        item.isHidden && "opacity-60",
      )}
    >
      {/* Media */}
      <div className="relative aspect-video bg-gray-900 group">
        {/* Checkbox — always visible so touch users can discover multi-select */}
        <button onClick={onToggleSelect}
          aria-label={isSelected ? "Deselect item" : "Select item"}
          className={cn("absolute top-2 left-2 z-20 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
            isSelected ? "bg-[#0EA5E9] border-[#0EA5E9]" : "bg-white/80 border-white/80 hover:border-gray-300"
          )}>
          {isSelected && <Check className="w-3 h-3 text-white" />}
        </button>

        {canDrag && (
          <div className="absolute top-2 right-2 z-10 opacity-40 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
            <div className="bg-black/50 rounded-lg p-1"><GripVertical className="w-4 h-4 text-white" /></div>
          </div>
        )}

        {/* Secondary badges — stacked below the checkbox, not manually offset */}
        {(item.isHidden || external) && (
          <div className="absolute top-9 left-2 z-10 flex flex-col items-start gap-1">
            {external && (
              <span className="bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                <LinkIcon className="w-2.5 h-2.5" />{getYouTubeId(item.url) ? "YouTube" : "Vimeo"}
              </span>
            )}
            {item.isHidden && (
              <span className="bg-gray-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <EyeOff className="w-2.5 h-2.5" /> Hidden
              </span>
            )}
          </div>
        )}

        {item.isFeatured && (
          <div className="absolute bottom-2 left-2 z-10 bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Star className="w-2.5 h-2.5" /> Featured
          </div>
        )}
        {item.orderId && (
          <div className="absolute bottom-2 right-2 z-10 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <ShieldCheck className="w-2.5 h-2.5" /> Verified
          </div>
        )}

        {/* Media content */}
        {hasBA && item.type === "image" ? (
          <div className="relative w-full h-full overflow-hidden select-none">
            <Image src={item.url} alt="After" fill className="object-cover" sizes="400px" unoptimized />
            <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderVal}%` }}>
              <div className="relative w-full h-full" style={{ width: `${10000 / sliderVal}%` }}>
                <Image src={item.beforeUrl!} alt="Before" fill className="object-cover" sizes="400px" unoptimized />
              </div>
            </div>
            <div className="absolute inset-y-0 z-10 flex items-center justify-center" style={{ left: `${sliderVal}%`, transform: "translateX(-50%)" }}>
              <div className="w-0.5 h-full bg-white/80" />
              <div className="absolute w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
                <ArrowLeftRight className="w-4 h-4 text-gray-600" />
              </div>
            </div>
            <span className="absolute bottom-8 left-2 text-[10px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded">BEFORE</span>
            <span className="absolute bottom-8 right-2 text-[10px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded">AFTER</span>
            <input type="range" min={0} max={100} value={sliderVal} onChange={e => onSliderChange(Number(e.target.value))}
              aria-label="Before/after comparison slider"
              className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20" />
          </div>
        ) : thumbnail ? (
          <div className="relative w-full h-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumbnail} alt={item.title ?? "Video"} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            {item.type === "video" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center">
                  <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                </div>
              </div>
            )}
          </div>
        ) : item.type === "image" ? (
          <Image src={item.url} alt={item.title ?? "Portfolio"} fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="400px" unoptimized />
        ) : (
          <video src={item.url} controls preload="metadata" className="w-full h-full object-cover" />
        )}

        {isPending && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
            <span className="text-white text-xs font-medium">Saving…</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-3 pt-2.5 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              {/* Completeness badge — self-explanatory, no tooltip needed */}
              {score === 4 ? (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 shrink-0">
                  <Check className="w-2.5 h-2.5" /> Complete
                </span>
              ) : (
                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0", COMPLETENESS_BADGE[score])}>
                  {score}/4
                </span>
              )}
              {item.category && (
                <span className="text-[10px] font-semibold text-[#0EA5E9] bg-[#0EA5E9]/10 px-2 py-0.5 rounded-full truncate">
                  {item.category}
                </span>
              )}
            </div>
            <p className={cn("text-sm font-semibold truncate", item.title ? "text-gray-900" : "text-gray-300 italic font-normal")}>
              {item.title || "Add a title…"}
            </p>
            {item.description
              ? <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{item.description}</p>
              : <p className="text-xs text-gray-300 italic mt-0.5">No description</p>
            }
            {/* Tags */}
            {item.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {item.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="text-[10px] bg-gray-100 text-gray-500 rounded-md px-1.5 py-0.5">{tag}</span>
                ))}
                {item.tags.length > 3 && <span className="text-[10px] text-gray-400">+{item.tags.length - 3}</span>}
              </div>
            )}
          </div>

          {/* Action row — always visible so it also works on touch devices. Only the
              3 most-used actions are inline; Hide/Duplicate live in the overflow menu
              to keep this from crowding out the title on narrower grid columns. */}
          {!isPending && (
            <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
              <button onClick={onFeature} aria-label={item.isFeatured ? "Unfeature item" : "Feature item"} className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-colors">
                {item.isFeatured ? <StarOff className="w-3.5 h-3.5" /> : <Star className="w-3.5 h-3.5" />}
              </button>
              <button onClick={onEdit} aria-label="Edit item" className={cn("p-1.5 rounded-lg transition-colors", isEditing ? "bg-[#0EA5E9]/10 text-[#0EA5E9]" : "text-gray-400 hover:text-[#0EA5E9] hover:bg-[#0EA5E9]/5")}>
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button onClick={onDelete} aria-label="Delete item" className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <div className="relative" ref={moreRef}>
                <button onClick={() => setShowMore(v => !v)} aria-label="More actions" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
                {showMore && (
                  <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-32">
                    <button onClick={() => { onHide(); setShowMore(false); }} className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2">
                      {item.isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      {item.isHidden ? "Show" : "Hide"}
                    </button>
                    <button onClick={() => { onDuplicate(); setShowMore(false); }} className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2">
                      <Copy className="w-3.5 h-3.5" /> Duplicate
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {score < 4 && !isEditing && !isPending && (
          <button onClick={onEdit} className="mt-2 w-full text-xs text-[#0EA5E9] border border-dashed border-[#0EA5E9]/30 rounded-xl py-1.5 hover:bg-[#0EA5E9]/5 transition-colors">
            + Complete this listing
          </button>
        )}

        {!isPending && ((item.likesCount ?? 0) > 0 || (item.viewsCount ?? 0) > 0) && (
          <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-400">
            {(item.viewsCount ?? 0) > 0 && <span>👁 {item.viewsCount}</span>}
            {(item.likesCount ?? 0) > 0 && <span>❤️ {item.likesCount}</span>}
            {(item.commentsCount ?? 0) > 0 && <span>💬 {item.commentsCount}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Portfolio List Row ────────────────────────────────────────────────────────

interface ListRowProps {
  item: PortfolioItem;
  isPending: boolean;
  canDrag: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  isSelected: boolean;
  isEditing: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onToggleSelect: () => void;
  onEdit: () => void;
  onFeature: () => void;
  onHide: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function PortfolioListRow({
  item, isPending, canDrag, isDragging, isDragOver, isSelected, isEditing,
  onDragStart, onDragOver, onDrop, onDragEnd, onTouchStart, onTouchMove, onTouchEnd,
  onToggleSelect, onEdit, onFeature, onHide, onDuplicate, onDelete,
}: ListRowProps) {
  const score     = completenessScore(item);
  const thumbnail = item.thumbnailUrl ?? getThumbnailUrl(item.url);

  return (
    <div
      data-portfolio-id={item.id}
      draggable={canDrag}
      onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={onDragEnd}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      className={cn(
        "bg-white border rounded-xl flex items-center gap-3 px-3 py-2.5 transition-all select-none",
        isDragging && "opacity-40 scale-[0.98]",
        isDragOver && "border-[#0EA5E9] ring-2 ring-[#0EA5E9]/20",
        !isDragging && !isDragOver && (isSelected ? "border-[#0EA5E9] ring-1 ring-[#0EA5E9]" : "border-gray-200"),
        item.isHidden && "opacity-60",
      )}
    >
      {canDrag && (
        <div className="shrink-0 text-gray-300 hover:text-gray-400 cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      {/* Checkbox */}
      <button onClick={onToggleSelect}
        aria-label={isSelected ? "Deselect item" : "Select item"}
        className={cn("w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center transition-all",
          isSelected ? "bg-[#0EA5E9] border-[#0EA5E9]" : "border-gray-300 hover:border-gray-400"
        )}>
        {isSelected && <Check className="w-3 h-3 text-white" />}
      </button>

      {/* Thumbnail */}
      <div className="w-16 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0 relative">
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnail} alt="" className="w-full h-full object-cover" />
        ) : item.type === "image" ? (
          <Image src={item.url} alt="" fill className="object-cover" sizes="64px" unoptimized />
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <Play className="w-3 h-3 text-white/70" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {score === 4 ? (
            <span className="inline-flex items-center text-[9px] font-bold px-1 py-0.5 rounded bg-emerald-50 text-emerald-600 shrink-0">
              <Check className="w-2 h-2" />
            </span>
          ) : (
            <span className={cn("text-[9px] font-bold px-1 py-0.5 rounded shrink-0", COMPLETENESS_BADGE[score])}>
              {score}/4
            </span>
          )}
          <p className={cn("text-sm font-semibold truncate", item.title ? "text-gray-900" : "text-gray-400 italic font-normal")}>
            {item.title || "Untitled"}
          </p>
          {item.isFeatured && <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
          {item.isHidden && <EyeOff className="w-3 h-3 text-gray-400 shrink-0" />}
          {item.orderId && <ShieldCheck className="w-3 h-3 text-indigo-500 shrink-0" />}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {item.category && <span className="text-[10px] text-[#0EA5E9]">{item.category}</span>}
          {item.tags?.slice(0, 3).map(t => (
            <span key={t} className="text-[10px] bg-gray-100 text-gray-500 rounded px-1">{t}</span>
          ))}
          {(item.viewsCount ?? 0) > 0 && <span className="text-[10px] text-gray-400">👁 {item.viewsCount}</span>}
          {(item.likesCount ?? 0) > 0 && <span className="text-[10px] text-gray-400">❤️ {item.likesCount}</span>}
        </div>
      </div>

      {/* Actions */}
      {!isPending && (
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onFeature} aria-label={item.isFeatured ? "Unfeature item" : "Feature item"} className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-colors">
            {item.isFeatured ? <StarOff className="w-3.5 h-3.5" /> : <Star className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onHide} aria-label={item.isHidden ? "Show item" : "Hide item"} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            {item.isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onDuplicate} aria-label="Duplicate item" className="p-1.5 rounded-lg text-gray-400 hover:text-[#0EA5E9] hover:bg-[#0EA5E9]/5 transition-colors">
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button onClick={onEdit} aria-label="Edit item" className={cn("p-1.5 rounded-lg transition-colors", isEditing ? "bg-[#0EA5E9]/10 text-[#0EA5E9]" : "text-gray-400 hover:text-[#0EA5E9] hover:bg-[#0EA5E9]/5")}>
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} aria-label="Delete item" className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {isPending && <span className="text-xs text-gray-400 shrink-0">Saving…</span>}
    </div>
  );
}

// ── Edit Drawer ──────────────────────────────────────────────────────────────

interface EditDrawerProps {
  item: PortfolioItem;
  completedOrders: CompletedOrderOption[];
  sliderVal: number;
  onSliderChange: (v: number) => void;
  onSave: (patch: Partial<PortfolioItem>) => void;
  onClose: () => void;
}

function EditDrawer({ item, completedOrders, sliderVal, onSliderChange, onSave, onClose }: EditDrawerProps) {
  const [title, setTitle]           = useState(item.title ?? "");
  const [description, setDesc]      = useState(item.description ?? "");
  const [category, setCategory]     = useState(item.category ?? "");
  const [customCat, setCustomCat]   = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [showBeforeUpload, setShowBeforeUpload] = useState(false);
  const [orderId, setOrderId]       = useState(item.orderId ?? "");
  const [tagInput, setTagInput]     = useState("");
  const [tags, setTags]             = useState<string[]>(item.tags ?? []);
  const [isHidden, setIsHidden]     = useState(item.isHidden);
  // Committed thumbnail value ("" once removed). A newly-picked file is staged
  // separately (thumbnailFile/thumbnailPreview) and only uploaded to R2 on Save —
  // this avoids leaving an orphaned upload behind if the drawer is cancelled.
  const [thumbnailUrl, setThumbnailUrl] = useState(item.thumbnailUrl ?? "");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [beforePreview, setBeforePreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { upload } = useUpload();

  // Revoke blob URLs as soon as they're replaced or the drawer unmounts.
  useEffect(() => () => { if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview); }, [thumbnailPreview]);
  useEffect(() => () => { if (beforePreview) URL.revokeObjectURL(beforePreview); }, [beforePreview]);

  const finalCategory = showCustom ? customCat : category;
  const hasBA = !!item.beforeUrl;
  const external = isExternalVideo(item.url);
  const embedUrl = getEmbedUrl(item.url);
  const displayThumb = thumbnailPreview || thumbnailUrl || item.thumbnailUrl || getThumbnailUrl(item.url);

  function addTag() {
    const val = tagInput.trim().toLowerCase();
    if (val && !tags.includes(val) && tags.length < 10) {
      setTags(prev => [...prev, val]);
      setTagInput("");
    }
  }

  function handleThumbFile(files: FileList) {
    const file = files[0];
    if (!file) return;
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  }

  function removeThumbnail() {
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setThumbnailUrl("");
  }

  async function handleSaveClick() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      let finalThumbnailUrl = thumbnailUrl || null;
      if (thumbnailFile) {
        const result = await upload(thumbnailFile, "portfolio");
        if (!result) { toast.error("Failed to upload thumbnail — please try again."); return; }
        finalThumbnailUrl = `/api/file/${result.key}`;
      }

      let finalBeforeUrl = item.beforeUrl ?? null;
      if (beforeFile) {
        const result = await upload(beforeFile, "portfolio");
        if (!result) { toast.error("Failed to upload before image — please try again."); return; }
        finalBeforeUrl = `/api/file/${result.key}`;
      }

      onSave({
        title: title || null,
        description: description || null,
        category: finalCategory || null,
        tags,
        isHidden,
        thumbnailUrl: finalThumbnailUrl,
        beforeUrl: finalBeforeUrl,
        orderId: orderId || null,
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Edit portfolio item</h2>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[260px]">{item.title || "Untitled"}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Preview */}
          <div className="rounded-2xl overflow-hidden bg-gray-900 aspect-video relative">
            {external && embedUrl ? (
              <iframe src={embedUrl} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            ) : hasBA && item.type === "image" ? (
              <div className="relative w-full h-full overflow-hidden select-none">
                <Image src={item.url} alt="After" fill className="object-cover" sizes="480px" unoptimized />
                <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderVal}%` }}>
                  <div className="relative w-full h-full" style={{ width: `${10000 / sliderVal}%` }}>
                    <Image src={item.beforeUrl!} alt="Before" fill className="object-cover" sizes="480px" unoptimized />
                  </div>
                </div>
                <div className="absolute inset-y-0 z-10 flex items-center justify-center" style={{ left: `${sliderVal}%`, transform: "translateX(-50%)" }}>
                  <div className="w-0.5 h-full bg-white/80" />
                  <div className="absolute w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
                    <ArrowLeftRight className="w-4 h-4 text-gray-600" />
                  </div>
                </div>
                <span className="absolute bottom-2 left-2 text-[10px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded">BEFORE</span>
                <span className="absolute bottom-2 right-2 text-[10px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded">AFTER</span>
                <input type="range" min={0} max={100} value={sliderVal} onChange={e => onSliderChange(Number(e.target.value))} aria-label="Before/after comparison slider" className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20" />
              </div>
            ) : displayThumb ? (
              <div className="relative w-full h-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={displayThumb} alt="" className="w-full h-full object-cover" />
                {item.type === "video" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center">
                      <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                )}
              </div>
            ) : item.type === "image" ? (
              <Image src={item.url} alt={item.title ?? ""} fill className="object-cover" sizes="480px" unoptimized />
            ) : (
              <video src={item.url} controls preload="metadata" className="w-full h-full object-cover" />
            )}
          </div>

          {/* Visibility toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              {isHidden ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-emerald-500" />}
              <span className="text-sm font-medium text-gray-700">{isHidden ? "Hidden from public profile" : "Visible on public profile"}</span>
            </div>
            <button onClick={() => setIsHidden(v => !v)}
              aria-label={isHidden ? "Make visible" : "Hide from public profile"}
              className={cn("relative w-10 h-5.5 rounded-full transition-colors shrink-0", isHidden ? "bg-gray-300" : "bg-emerald-500")}
              style={{ height: "22px", width: "40px" }}>
              <span className={cn("absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform", isHidden ? "translate-x-0.5" : "translate-x-[18px]")}
                style={{ width: "18px", height: "18px" }} />
            </button>
          </div>

          {/* Title */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. YouTube highlight reel for TechChannel" maxLength={100}
              className="mt-1.5 w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 bg-white outline-none focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9]/10 transition-all" />
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Description</label>
            <textarea value={description} onChange={e => setDesc(e.target.value)} placeholder="Briefly describe the project, client, and what you did…" maxLength={300} rows={3}
              className="mt-1.5 w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 bg-white outline-none focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9]/10 transition-all resize-none" />
            <p className="text-right text-[11px] text-gray-400 mt-0.5">{description.length}/300</p>
          </div>

          {/* Category */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Category</label>
            {!showCustom ? (
              <div className="mt-1.5 relative">
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 bg-white appearance-none outline-none focus:border-[#0EA5E9] pr-9">
                  <option value="">Select category…</option>
                  {PORTFOLIO_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            ) : (
              <input autoFocus value={customCat} onChange={e => setCustomCat(e.target.value)} placeholder="Type custom category…" maxLength={60}
                className="mt-1.5 w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 bg-white outline-none focus:border-[#0EA5E9]" />
            )}
            <button type="button" onClick={() => { setShowCustom(s => !s); setCategory(""); setCustomCat(""); }}
              className="mt-1.5 text-xs text-[#0EA5E9] hover:underline flex items-center gap-1">
              <Plus className="w-3 h-3" />{showCustom ? "Pick from list" : "Custom category"}
            </button>
          </div>

          {/* Tags */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Tags / Keywords</label>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5 mb-2">
                {tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 rounded-lg px-2.5 py-1">
                    {tag}
                    <button onClick={() => setTags(prev => prev.filter(t => t !== tag))} aria-label={`Remove tag ${tag}`} className="text-gray-400 hover:text-red-500 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
                placeholder="e.g. cinematic, color grading…" maxLength={30} disabled={tags.length >= 10}
                className="flex-1 text-sm px-3 py-2 rounded-xl border border-gray-200 bg-white outline-none focus:border-[#0EA5E9] transition-all disabled:opacity-50" />
              <button type="button" onClick={addTag} disabled={!tagInput.trim() || tags.length >= 10} aria-label="Add tag"
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">{tags.length}/10 · Press Enter or comma to add</p>
          </div>

          {/* Custom thumbnail (for non-YouTube videos) — staged locally, uploaded on Save */}
          {item.type === "video" && !external && (
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Custom Thumbnail</label>
              {(thumbnailPreview || thumbnailUrl) ? (
                <div className="mt-1.5 relative rounded-xl overflow-hidden aspect-video bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumbnailPreview || thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                  <button onClick={removeThumbnail} aria-label="Remove custom thumbnail"
                    className="absolute top-2 right-2 bg-black/60 hover:bg-red-500 text-white rounded-lg p-1.5 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                  {thumbnailPreview && (
                    <span className="absolute bottom-2 left-2 text-[10px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded">Will save on submit</span>
                  )}
                </div>
              ) : (
                <FileUpload.Root>
                  <FileUpload.DropZone onDropFiles={handleThumbFile} accept="image/*"
                    hint="Upload a thumbnail image for this video" />
                </FileUpload.Root>
              )}
            </div>
          )}

          {/* Before / After — staged locally, uploaded on Save */}
          {item.type === "image" && !external && (
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Before / After</label>
              {beforePreview ? (
                <div className="mt-1.5 relative rounded-xl overflow-hidden aspect-video bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={beforePreview} alt="Before preview" className="w-full h-full object-cover" />
                  <button onClick={() => { setBeforeFile(null); setBeforePreview(null); }} aria-label="Remove before image"
                    className="absolute top-2 right-2 bg-black/60 hover:bg-red-500 text-white rounded-lg p-1.5 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <span className="absolute bottom-2 left-2 text-[10px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded">Will save on submit</span>
                </div>
              ) : item.beforeUrl ? (
                <div className="mt-1.5 flex items-center gap-2 text-xs text-[#0EA5E9] bg-[#0EA5E9]/5 rounded-xl px-4 py-3 border border-[#0EA5E9]/20">
                  <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" />
                  Before image uploaded — use the slider above to compare
                </div>
              ) : showBeforeUpload ? (
                <div className="mt-1.5">
                  <FileUpload.Root>
                    <FileUpload.DropZone onDropFiles={files => {
                      const f = files[0]; if (!f) return;
                      setBeforeFile(f);
                      setBeforePreview(URL.createObjectURL(f));
                    }} accept="image/*" hint="Upload the BEFORE image" />
                  </FileUpload.Root>
                </div>
              ) : (
                <button type="button" onClick={() => setShowBeforeUpload(true)} className="mt-1.5 w-full flex items-center justify-center gap-2 text-sm text-gray-500 border border-dashed border-gray-300 rounded-xl py-3 hover:border-[#0EA5E9] hover:text-[#0EA5E9] transition-colors">
                  <ArrowLeftRight className="w-4 h-4" /> Add Before image for slider
                </button>
              )}
            </div>
          )}

          {/* Verify with order */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> Verify with a completed order
              <span className="font-normal text-gray-400 normal-case tracking-normal">(optional)</span>
            </label>
            <div className="mt-1.5 relative">
              <select value={orderId} onChange={e => setOrderId(e.target.value)} className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 bg-white appearance-none outline-none focus:border-[#0EA5E9] pr-9">
                <option value="">Not linked</option>
                {completedOrders.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.packageTitle ?? "Custom order"} — {o.clientName ?? "Client"} ({formatDate(o.createdAt)})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Adds a Verified badge — proof this work was done for a real client.</p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 bg-white">
          <button type="button" onClick={handleSaveClick} disabled={isSaving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#0EA5E9] text-white text-sm font-semibold hover:bg-sky-600 disabled:opacity-60 transition-colors">
            {isSaving ? "Saving…" : (<><Check className="w-4 h-4" /> Save changes</>)}
          </button>
          <button type="button" onClick={onClose} disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60 transition-colors">
            <X className="w-4 h-4" /> Cancel
          </button>
        </div>
      </div>
    </>
  );
}

export { getReadableFileSize };

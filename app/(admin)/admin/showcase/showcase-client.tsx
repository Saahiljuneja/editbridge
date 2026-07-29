"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { cn, displayNameFromFull } from "@/lib/utils";
import { ArrowUp, ArrowDown, Trash2, Plus, Search, X, Film } from "lucide-react";

interface ShowcaseItem {
  id: string;
  editorId: string;
  videoUrl: string;
  title: string;
  description: string | null;
  sortOrder: number;
  editorName: string | null;
  editorDisplayName: string | null;
  editorImage: string | null;
}

interface EditorResult {
  id: string;
  name: string | null;
  displayName?: string | null;
  title?: string | null;
  image: string | null;
}

function embedPreviewUrl(videoUrl: string): { ok: boolean; embedUrl: string | null } {
  try {
    const u = new URL(videoUrl.trim());
    const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");
    if (host === "youtube.com") {
      const id = u.pathname === "/watch" ? u.searchParams.get("v")
        : u.pathname.startsWith("/shorts/") ? u.pathname.split("/")[2]
        : u.pathname.startsWith("/embed/") ? u.pathname.split("/")[2]
        : null;
      return id ? { ok: true, embedUrl: `https://www.youtube.com/embed/${id}` } : { ok: false, embedUrl: null };
    }
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      return id ? { ok: true, embedUrl: `https://www.youtube.com/embed/${id}` } : { ok: false, embedUrl: null };
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const match = u.pathname.match(/(\d+)/);
      return match ? { ok: true, embedUrl: `https://player.vimeo.com/video/${match[1]}` } : { ok: false, embedUrl: null };
    }
    return { ok: false, embedUrl: null };
  } catch {
    return { ok: false, embedUrl: null };
  }
}

export function ShowcaseClient() {
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Add-clip form state
  const [editorQuery, setEditorQuery] = useState("");
  const [editorResults, setEditorResults] = useState<EditorResult[]>([]);
  const [selectedEditor, setSelectedEditor] = useState<EditorResult | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/showcase")
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch(() => toast.error("Failed to load showcase items"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Debounced editor search
  useEffect(() => {
    if (!editorQuery.trim()) { setEditorResults([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/editors?q=${encodeURIComponent(editorQuery)}&limit=6`)
        .then((r) => r.json())
        .then((d) => setEditorResults(d.editors ?? []))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [editorQuery]);

  const preview = videoUrl.trim() ? embedPreviewUrl(videoUrl) : null;

  async function handleAdd() {
    if (!selectedEditor || !videoUrl.trim() || !title.trim()) {
      toast.error("Pick an editor, paste a video URL, and add a title.");
      return;
    }
    if (!preview?.ok) {
      toast.error("Only YouTube and Vimeo links are supported.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/showcase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          editorId: selectedEditor.id,
          videoUrl: videoUrl.trim(),
          title: title.trim(),
          description: description.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to add clip");
      }
      toast.success("Clip added to showcase.");
      setSelectedEditor(null);
      setEditorQuery("");
      setVideoUrl("");
      setTitle("");
      setDescription("");
      setShowForm(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add clip");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    const res = await fetch(`/api/admin/showcase/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to remove clip"); load(); }
    else toast.success("Removed from showcase.");
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const a = items[index];
    const b = items[targetIndex];

    const next = [...items];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setItems(next);

    await Promise.all([
      fetch(`/api/admin/showcase/${a.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: b.sortOrder }),
      }),
      fetch(`/api/admin/showcase/${b.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: a.sortOrder }),
      }),
    ]).catch(() => toast.error("Failed to reorder"));
  }

  return (
    <div className="space-y-6">
      {/* Add clip */}
      <div className="a-card overflow-hidden">
        <button
          onClick={() => setShowForm((s) => !s)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-[var(--brand-editor)]" /> Add clip to showcase
          </span>
          <X className={cn("w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform", !showForm && "rotate-45")} />
        </button>

        {showForm && (
          <div className="border-t border-gray-100 dark:border-gray-800 p-5 space-y-4">
            {/* Editor picker */}
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Editor</label>
              {selectedEditor ? (
                <div className="mt-1.5 flex items-center justify-between rounded-xl border border-[var(--brand-editor)]/30 bg-[var(--brand-editor)]/5 dark:bg-[var(--brand-editor)]/10 px-3 py-2">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                    {selectedEditor.displayName || displayNameFromFull(selectedEditor.name)}
                    {selectedEditor.title && <span className="text-gray-400 dark:text-gray-500 font-normal"> · {selectedEditor.title}</span>}
                  </span>
                  <button onClick={() => { setSelectedEditor(null); setEditorQuery(""); }} className="text-gray-400 dark:text-gray-500 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative mt-1.5">
                  <Search className="w-4 h-4 text-gray-300 dark:text-gray-600 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={editorQuery}
                    onChange={(e) => setEditorQuery(e.target.value)}
                    placeholder="Search editor by name…"
                    className="w-full text-sm pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-[var(--brand-editor)] focus:ring-2 focus:ring-[var(--brand-editor)]/10"
                  />
                  {editorResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
                      {editorResults.map((e) => (
                        <button
                          key={e.id}
                          onClick={() => { setSelectedEditor(e); setEditorResults([]); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <span className="font-medium text-gray-800 dark:text-gray-100">{e.displayName || displayNameFromFull(e.name)}</span>
                          {e.title && <span className="text-xs text-gray-400 dark:text-gray-500">· {e.title}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Video URL */}
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Video URL (YouTube or Vimeo)</label>
              <input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=…"
                className="mt-1.5 w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-[var(--brand-editor)] focus:ring-2 focus:ring-[var(--brand-editor)]/10"
              />
              {videoUrl.trim() && !preview?.ok && (
                <p className="text-xs text-red-500 mt-1">Only YouTube and Vimeo links are supported.</p>
              )}
              {preview?.ok && preview.embedUrl && (
                <div className="mt-2 aspect-video rounded-xl overflow-hidden bg-black max-w-xs">
                  <iframe src={preview.embedUrl} className="w-full h-full" allowFullScreen title="Preview" />
                </div>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. YouTube highlight reel — TechChannel"
                maxLength={120}
                className="mt-1.5 w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-[var(--brand-editor)] focus:ring-2 focus:ring-[var(--brand-editor)]/10"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                maxLength={300}
                placeholder="Short context about the project…"
                className="mt-1.5 w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-[var(--brand-editor)] focus:ring-2 focus:ring-[var(--brand-editor)]/10 resize-none"
              />
            </div>

            <button
              onClick={handleAdd}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--brand-editor)] text-white text-sm font-semibold hover:bg-[var(--brand-editor-hover)] transition-colors disabled:opacity-50"
            >
              {saving ? "Adding…" : "Add to showcase"}
            </button>
          </div>
        )}
      </div>

      {/* Curated list */}
      <div className="a-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Showcased clips ({items.length})</p>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 px-5 py-8 text-center">Loading…</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-5">
            <Film className="w-8 h-8 text-gray-200 dark:text-gray-700 mb-2" />
            <p className="text-sm text-gray-400 dark:text-gray-500">No clips showcased yet. Add one above.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {items.map((item, index) => {
              const name = item.editorDisplayName || displayNameFromFull(item.editorName);
              return (
                <div key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      onClick={() => handleMove(index, -1)}
                      disabled={index === 0}
                      className="p-1 rounded text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMove(index, 1)}
                      disabled={index === items.length - 1}
                      className="p-1 rounded text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.title}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{name}</p>
                  </div>
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                    title="Remove from showcase"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

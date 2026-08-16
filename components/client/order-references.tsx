"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Link2, Loader2 } from "lucide-react";

type Reference = { url: string; note: string; addedAt: string };

export function OrderReferences({
  orderId,
  initial,
  readonly,
}: {
  orderId: string;
  initial: Reference[];
  readonly?: boolean;
}) {
  const [refs, setRefs] = useState<Reference[]>(initial);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  async function save(next: Reference[]) {
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/references`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ references: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Failed to save references.");
    } finally {
      setSaving(false);
    }
  }

  async function addRef() {
    let cleanUrl = url.trim();
    if (!cleanUrl) return;
    if (!/^https?:\/\//i.test(cleanUrl)) cleanUrl = `https://${cleanUrl}`;
    try { new URL(cleanUrl); } catch { toast.error("Please enter a valid URL."); return; }
    const next: Reference[] = [...refs, { url: cleanUrl, note: note.trim(), addedAt: new Date().toISOString() }];
    setRefs(next);
    setUrl("");
    setNote("");
    setOpen(false);
    await save(next);
  }

  async function removeRef(i: number) {
    const next = refs.filter((_, j) => j !== i);
    setRefs(next);
    await save(next);
  }

  return (
    <section className="rounded-xl border border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Inspiration & References</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Share links to videos, images, or mood boards with your editor</p>
        </div>
        {!readonly && (
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--brand-client)] hover:text-blue-900 border border-[var(--brand-client)]/30 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add link
          </button>
        )}
      </div>

      {/* Add form */}
      {open && (
        <div className="rounded-lg border border-dashed border-[var(--brand-client)]/40 bg-blue-50/40 p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addRef()}
              placeholder="https://youtube.com/watch?v=… or https://pinterest.com/…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Note (optional)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Colour grade style I like"
              maxLength={200}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/20"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={addRef} disabled={saving || !url.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: "var(--brand-client)" }}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Add
            </button>
            <button onClick={() => { setOpen(false); setUrl(""); setNote(""); }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {refs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 py-8 text-center">
          <Link2 className="w-5 h-5 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No references added yet</p>
          {!readonly && (
            <p className="text-xs text-gray-400 mt-1">Add YouTube videos, Pinterest boards, Instagram posts, etc.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {refs.map((r, i) => {
            let hostname = "";
            try { hostname = new URL(r.url).hostname.replace("www.", ""); } catch {}
            return (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                <Link2 className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <a href={r.url} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-medium text-[var(--brand-client)] hover:underline truncate block">
                    {hostname || r.url}
                  </a>
                  {r.note && <p className="text-xs text-muted-foreground mt-0.5">{r.note}</p>}
                </div>
                {!readonly && (
                  <button onClick={() => removeRef(i)} disabled={saving}
                    className="text-gray-300 hover:text-red-500 transition-colors shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

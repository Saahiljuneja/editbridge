"use client";

import { useEffect, useState } from "react";
import { FileText, Plus, Trash2, Copy, Check, Loader2, Pencil, X, Clipboard } from "lucide-react";
import { toast } from "sonner";
import { TopoBackground } from "@/components/common/topo-background";

type Template = { id: string; name: string; content: string; createdAt: string };

export default function BriefTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    fetch("/api/brief-templates")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setTemplates(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function add() {
    if (!name.trim() || !content.trim()) { toast.error("Name and content are required."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/brief-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), content: content.trim() }),
      });
      if (!res.ok) throw new Error();
      const t = await res.json();
      setTemplates(prev => [t, ...prev]);
      setName(""); setContent(""); setAdding(false);
      toast.success("Template saved.");
    } catch {
      toast.error("Failed to save template.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(t: Template) {
    setEditingId(t.id);
    setEditName(t.name);
    setEditContent(t.content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditContent("");
  }

  async function saveEdit(id: string) {
    if (!editName.trim() || !editContent.trim()) { toast.error("Name and content are required."); return; }
    setEditSaving(true);
    try {
      const res = await fetch("/api/brief-templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: editName.trim(), content: editContent.trim() }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setTemplates(prev => prev.map(t => t.id === id ? updated : t));
      cancelEdit();
      toast.success("Template updated.");
    } catch {
      toast.error("Failed to update template.");
    } finally {
      setEditSaving(false);
    }
  }

  function remove(id: string) {
    const removed = templates.find(t => t.id === id);
    if (!removed) return;

    setTemplates(prev => prev.filter(t => t.id !== id));
    if (editingId === id) cancelEdit();

    let undone = false;
    toast(`"${removed.name}" deleted`, {
      action: {
        label: "Undo",
        onClick: () => {
          undone = true;
          setTemplates(prev => {
            const next = [removed, ...prev];
            return next.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          });
        },
      },
      duration: 5000,
      onDismiss: () => { if (!undone) commitDelete(id, removed); },
      onAutoClose: () => { if (!undone) commitDelete(id, removed); },
    });
  }

  function commitDelete(id: string, fallback: Template) {
    fetch("/api/brief-templates", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {
      setTemplates(prev => {
        const next = [fallback, ...prev];
        return next.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      });
      toast.error("Failed to delete — item restored.");
    });
  }

  function copy(id: string, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      toast.success("Copied to clipboard.");
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  function useTemplate(t: Template) {
    navigator.clipboard.writeText(t.content).then(() => {
      toast.success("Brief copied!", {
        description: "Paste it when placing your order.",
        action: { label: "Browse editors →", onClick: () => window.location.href = "/editors" },
      });
    });
  }

  return (
    <div className="relative min-h-screen bg-slate-50/50 pb-12 overflow-hidden">
      <TopoBackground background="#f8fafc" strokeColor="#e2e8f0" opacity={0.4} />

      <div className="max-w-3xl mx-auto px-6 pt-6 space-y-6 relative z-10">
        {/* Header */}
        <div className="bg-white rounded-3xl border border-neutral-200/60 p-6 flex items-center justify-between shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-neutral-900">Brief Templates</h1>
            <p className="text-xs text-neutral-400 font-semibold mt-1">
              {templates.length > 0 ? `${templates.length} template${templates.length !== 1 ? "s" : ""}` : "Save reusable briefs for new orders"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setAdding(true); setEditingId(null); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors bg-[var(--brand-client)] hover:bg-[var(--brand-client-hover)]"
            >
              <Plus className="w-4 h-4" /> New template
            </button>
            <div className="w-10 h-10 rounded-2xl bg-[var(--brand-client)]/10 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-[var(--brand-client)]" />
            </div>
          </div>
        </div>

        {/* Add form */}
        {adding && (
          <div className="rounded-2xl border border-[var(--brand-client)]/20 bg-white shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-900 text-sm">New Template</p>
              <button onClick={() => { setAdding(false); setName(""); setContent(""); }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Template name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder='e.g. "YouTube Vlog Reel"'
                maxLength={60}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/20 focus:border-[var(--brand-client)]/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Brief content</label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Describe the project, style, references, deliverables…"
                rows={5}
                maxLength={2000}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/20 focus:border-[var(--brand-client)]/50"
              />
              <p className="text-[10px] text-gray-400 text-right mt-1">{content.length}/2000</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={add}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center gap-1.5 bg-[var(--brand-client)] hover:bg-[var(--brand-client-hover)]"
              >
                {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : "Save template"}
              </button>
              <button
                onClick={() => { setAdding(false); setName(""); setContent(""); }}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50"
              >Cancel</button>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        ) : templates.length === 0 ? (
          !adding && (
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[var(--brand-client)]/10 flex items-center justify-center mb-4">
                <FileText className="w-7 h-7 text-[var(--brand-client)]" />
              </div>
              <p className="font-semibold text-gray-800">No templates yet</p>
              <p className="text-sm text-gray-400 mt-1 mb-5">Save your most-used briefs here and copy them into new orders instantly.</p>
              <button
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--brand-client)] hover:bg-[var(--brand-client-hover)]"
              >
                <Plus className="w-4 h-4" /> Create first template
              </button>
            </div>
          )
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <div key={t.id} className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                {editingId === t.id ? (
                  /* Inline edit form */
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-900 text-sm">Edit Template</p>
                      <button onClick={cancelEdit} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Template name</label>
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        maxLength={60}
                        className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/20 focus:border-[var(--brand-client)]/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Brief content</label>
                      <textarea
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        rows={5}
                        maxLength={2000}
                        className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/20 focus:border-[var(--brand-client)]/50"
                      />
                      <p className="text-[10px] text-gray-400 text-right mt-1">{editContent.length}/2000</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(t.id)}
                        disabled={editSaving}
                        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center gap-1.5 bg-[var(--brand-client)] hover:bg-[var(--brand-client-hover)]"
                      >
                        {editSaving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : "Save changes"}
                      </button>
                      <button onClick={cancelEdit} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => useTemplate(t)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--brand-client)]/30 bg-[var(--brand-client)]/5 text-xs font-semibold text-[var(--brand-client)] hover:bg-[var(--brand-client)]/10 transition-colors"
                        >
                          <Clipboard className="w-3.5 h-3.5" /> Use
                        </button>
                        <button
                          onClick={() => copy(t.id, t.content)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          {copiedId === t.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedId === t.id ? "Copied!" : "Copy"}
                        </button>
                        <button
                          onClick={() => startEdit(t)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-[var(--brand-client)]/30 hover:text-[var(--brand-client)] transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => remove(t.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-3 bg-gray-50 rounded-xl px-4 py-3">
                      {t.content}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

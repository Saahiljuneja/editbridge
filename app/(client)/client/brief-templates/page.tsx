"use client";

import { useEffect, useState } from "react";
import { FileText, Plus, Trash2, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Template = { id: string; name: string; content: string; createdAt: string };

export default function BriefTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  function remove(id: string) {
    const removed = templates.find(t => t.id === id);
    if (!removed) return;

    setTemplates(prev => prev.filter(t => t.id !== id));

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
      onDismiss: () => {
        if (!undone) commitDelete(id, removed);
      },
      onAutoClose: () => {
        if (!undone) commitDelete(id, removed);
      },
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Brief Templates</h1>
            <p className="text-sm text-gray-400 mt-0.5">Save reusable order briefs so you don't retype them</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
              style={{ background: "var(--brand-client)" }}
            >
              <Plus className="w-4 h-4" /> New template
            </button>
            <div className="w-9 h-9 rounded-xl bg-[var(--brand-client)]/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-[var(--brand-client)]" />
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-4">
        {/* Add form */}
        {adding && (
          <div className="rounded-2xl border border-[var(--brand-client)]/20 bg-white shadow-sm p-5 space-y-4">
            <p className="font-semibold text-gray-900 text-sm">New Template</p>
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
                placeholder="Describe the project, style, references, deliverablesâ€¦"
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
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center gap-1.5"
                style={{ background: "var(--brand-client)" }}
              >
                {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Savingâ€¦</> : "Save template"}
              </button>
              <button
                onClick={() => { setAdding(false); setName(""); setContent(""); }}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50"
              >Cancel</button>
            </div>
          </div>
        )}

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
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: "var(--brand-client)" }}
              >
                <Plus className="w-4 h-4" /> Create first template
              </button>
            </div>
          )
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <div key={t.id} className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => copy(t.id, t.content)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      {copiedId === t.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedId === t.id ? "Copied!" : "Copy"}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

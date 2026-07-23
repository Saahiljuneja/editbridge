"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Send, Download, Pencil, Trash2, X, Check, Megaphone, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/utils";

const ROLES = [
  { value: "all", label: "All users" },
  { value: "client", label: "All clients" },
  { value: "editor", label: "All editors" },
  { value: "staff_kyc", label: "Staff — KYC" },
  { value: "staff_support", label: "Staff — Support" },
];

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

type Broadcast = {
  id: string;
  title: string;
  body: string;
  link: string | null;
  targetRole: string;
  sentCount: number;
  createdAt: string;
  updatedAt: string;
  sentByName: string | null;
};

export default function AdminBroadcastPage() {
  const now = new Date();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [targetRole, setTargetRole] = useState("all");
  const [sending, setSending] = useState(false);

  const [history, setHistory] = useState<Broadcast[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editLink, setEditLink] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [reportMonth, setReportMonth] = useState(now.getMonth() + 1);
  const [reportYear, setReportYear] = useState(now.getFullYear());

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/broadcast");
      const data = await res.json();
      setHistory(data.broadcasts ?? []);
    } catch {
      toast.error("Failed to load broadcast history.");
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const audience = ROLES.find(r => r.value === targetRole)?.label;
    if (!confirm(`Send notification to "${audience}"?`)) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, link: link || undefined, targetRole }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Sent to ${data.sent} user(s).`);
        setTitle(""); setBody(""); setLink("");
        loadHistory();
      } else {
        toast.error(data.error ?? "Failed.");
      }
    } catch { toast.error("Something went wrong."); }
    finally { setSending(false); }
  }

  function startEdit(b: Broadcast) {
    setEditId(b.id);
    setEditTitle(b.title);
    setEditBody(b.body);
    setEditLink(b.link ?? "");
    setDeleteId(null);
  }

  async function handleEdit() {
    if (!editId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/broadcast/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle, body: editBody, link: editLink || undefined }),
      });
      if (res.ok) {
        toast.success("Broadcast updated. All users will see the corrected message.");
        setEditId(null);
        loadHistory();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Failed to update.");
      }
    } catch { toast.error("Something went wrong."); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/broadcast/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Broadcast deleted and removed from all user inboxes.");
        setDeleteId(null);
        loadHistory();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Failed to delete.");
      }
    } catch { toast.error("Something went wrong."); }
    finally { setDeleting(false); }
  }

  const roleLabel = (v: string) => ROLES.find(r => r.value === v)?.label ?? v;

  return (
    <div className="px-8 py-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Broadcast & Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Send in-app notifications to users and export monthly reports.</p>
      </div>

      {/* Compose */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-[#0EA5E9]" />
          <div>
            <p className="font-semibold text-gray-900 text-sm">Send notification</p>
            <p className="text-xs text-gray-400 mt-0.5">Delivered as an in-app notification to all matched users.</p>
          </div>
        </div>
        <form onSubmit={handleSend} className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
              <input required value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Platform update available"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Message</label>
              <textarea required rows={3} value={body} onChange={e => setBody(e.target.value)}
                placeholder="Your message to users…"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30 resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Target audience</label>
              <select value={targetRole} onChange={e => setTargetRole(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30">
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Link (optional)</label>
              <input value={link} onChange={e => setLink(e.target.value)} placeholder="/editor/dashboard"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30" />
            </div>
          </div>
          <button type="submit" disabled={sending}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0EA5E9] text-white text-sm font-semibold hover:bg-[#3d34a0] disabled:opacity-50 transition-colors">
            <Send className="w-4 h-4" />
            {sending ? "Sending…" : "Send notification"}
          </button>
        </form>
      </div>

      {/* History */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <p className="font-semibold text-gray-900 text-sm">Broadcast history</p>
          <p className="text-xs text-gray-400 mt-0.5">Edit or delete a broadcast — changes apply to all recipients instantly.</p>
        </div>

        {loadingHistory ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
        ) : history.length === 0 ? (
          <div className="p-10 flex flex-col items-center text-center">
            <Megaphone className="w-8 h-8 text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">No broadcasts sent yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {history.map(b => (
              <div key={b.id} className="px-6 py-4">
                {editId === b.id ? (
                  /* Edit form */
                  <div className="space-y-3">
                    <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                      className="w-full rounded-xl border border-[#0EA5E9]/30 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20" />
                    <textarea rows={3} value={editBody} onChange={e => setEditBody(e.target.value)}
                      className="w-full rounded-xl border border-[#0EA5E9]/30 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20" />
                    <input value={editLink} onChange={e => setEditLink(e.target.value)} placeholder="Link (optional)"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20" />
                    <div className="flex gap-2">
                      <button onClick={handleEdit} disabled={saving}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0EA5E9] text-white text-xs font-semibold disabled:opacity-50">
                        <Check className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save changes"}
                      </button>
                      <button onClick={() => setEditId(null)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50">
                        <X className="w-3.5 h-3.5" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900 text-sm truncate">{b.title}</p>
                        <span className="shrink-0 flex items-center gap-1 text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          <Users className="w-2.5 h-2.5" /> {roleLabel(b.targetRole)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-2">{b.body}</p>
                      <div className="flex items-center gap-3 text-[10px] text-gray-400">
                        <span>{formatDateTime(new Date(b.createdAt))}</span>
                        <span>·</span>
                        <span>{b.sentCount} recipient{b.sentCount !== 1 ? "s" : ""}</span>
                        <span>·</span>
                        <span>by {b.sentByName ?? "Admin"}</span>
                        {b.updatedAt !== b.createdAt && <><span>·</span><span className="text-amber-500">edited</span></>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => startEdit(b)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-[#0EA5E9]/30 hover:text-[#0EA5E9] transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {deleteId === b.id ? (
                        <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                          <span className="text-xs text-red-700 font-medium">Delete?</span>
                          <button onClick={() => handleDelete(b.id)} disabled={deleting}
                            className="text-xs font-bold text-red-600 hover:text-red-800 disabled:opacity-50">
                            {deleting ? "…" : "Yes"}
                          </button>
                          <button onClick={() => setDeleteId(null)} className="text-xs text-gray-400 hover:text-gray-600">No</button>
                        </div>
                      ) : (
                        <button onClick={() => { setDeleteId(b.id); setEditId(null); }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Monthly report */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <p className="font-semibold text-gray-900 text-sm">Monthly report</p>
          <p className="text-xs text-gray-400 mt-0.5">Download a CSV summary of orders, revenue and users for any month.</p>
        </div>
        <div className="p-6 flex items-end gap-4 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Month</label>
            <select value={reportMonth} onChange={e => setReportMonth(Number(e.target.value))}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30">
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
            <input type="number" value={reportYear} onChange={e => setReportYear(Number(e.target.value))}
              min={2024} max={now.getFullYear()}
              className="w-24 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30" />
          </div>
          <a href={`/api/admin/export/report?year=${reportYear}&month=${reportMonth}`}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600",
              "hover:bg-gray-50 transition-colors"
            )}>
            <Download className="w-4 h-4" />
            Download CSV
          </a>
        </div>
      </div>
    </div>
  );
}

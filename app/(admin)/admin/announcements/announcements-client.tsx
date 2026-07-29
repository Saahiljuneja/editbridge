"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Megaphone, Plus, Trash2, ToggleLeft, ToggleRight, Pencil, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";

type Announcement = {
  id: string;
  title: string;
  body: string;
  type: string;
  isActive: boolean;
  createdAt: Date;
  expiresAt: Date | null;
  scheduledAt: Date | null;
};

const TYPE_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  info: { label: "Info", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-100" },
  warning: { label: "Warning", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100" },
  maintenance: { label: "Maintenance", bg: "bg-red-50", text: "text-red-700", border: "border-red-100" },
};

export function AnnouncementsClient({ initialRows }: { initialRows: Announcement[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("info");
  const [expiresAt, setExpiresAt] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  function startEdit(row: Announcement) {
    setEditId(row.id);
    setEditTitle(row.title);
    setEditBody(row.body);
    setDeleteId(null);
  }

  async function handleEdit() {
    if (!editId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/announcements/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle, body: editBody }),
      });
      if (res.ok) {
        toast.success("Announcement updated.");
        setEditId(null);
        router.refresh();
      } else {
        toast.error("Failed to update.");
      }
    } catch { toast.error("Something went wrong."); }
    finally { setSaving(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, type, expiresAt: expiresAt || null, scheduledAt: scheduledAt || null }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Failed to create announcement.");
        return;
      }
      toast.success("Announcement created.");
      setTitle(""); setBody(""); setType("info"); setExpiresAt(""); setScheduledAt(""); setShowForm(false);
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(id: string, current: boolean) {
    const res = await fetch(`/api/admin/announcements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    if (res.ok) { toast.success(current ? "Deactivated." : "Activated."); router.refresh(); }
    else toast.error("Failed to update.");
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Announcement deleted."); setDeleteId(null); router.refresh(); }
      else toast.error("Failed to delete.");
    } catch { toast.error("Something went wrong."); }
    finally { setDeleting(false); }
  }

  return (
    <div className="px-8 py-6 ">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Announcements</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Platform-wide notices shown to all users.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand-client)] text-white text-sm font-medium hover:bg-[var(--brand-editor-hover)] transition-colors"
        >
          <Plus className="w-4 h-4" />
          New announcement
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-6 mb-6 space-y-4">
          <p className="font-semibold text-gray-900 dark:text-white">New announcement</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Title</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Scheduled maintenance on Sunday"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/30"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Message</label>
              <textarea
                required
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Describe the notice in detail…"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/30 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/30"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Schedule for (optional)</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/30"
              />
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Leave blank to publish immediately</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Expires at (optional)</label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/30"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-[var(--brand-client)] text-white text-sm font-medium hover:bg-[var(--brand-editor-hover)] disabled:opacity-50 transition-colors"
            >
              {submitting ? (scheduledAt ? "Scheduling…" : "Publishing…") : (scheduledAt ? "Schedule" : "Publish")}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {initialRows.length === 0 && !showForm ? (
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-12 text-center shadow-sm">
          <Megaphone className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No announcements yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Create one to notify all users on the platform.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {initialRows.map((row) => {
            const cfg = TYPE_CONFIG[row.type] ?? TYPE_CONFIG.info;
            return (
              <div
                key={row.id}
                className={cn(
                  "rounded-2xl border p-5",
                  cfg.bg, cfg.border,
                  !row.isActive && "opacity-60"
                )}
              >
                {editId === row.id ? (
                  /* Inline edit form */
                  <div className="space-y-3">
                    <input
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      className="w-full rounded-xl border border-white/80 bg-white/70 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/20"
                    />
                    <textarea
                      rows={3}
                      value={editBody}
                      onChange={e => setEditBody(e.target.value)}
                      className="w-full rounded-xl border border-white/80 bg-white/70 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/20"
                    />
                    <div className="flex gap-2">
                      <button onClick={handleEdit} disabled={saving}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--brand-client)] text-white text-xs font-semibold disabled:opacity-50">
                        <Check className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save"}
                      </button>
                      <button onClick={() => setEditId(null)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/60 text-xs font-medium text-gray-600 dark:text-gray-300">
                        <X className="w-3.5 h-3.5" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full bg-white/60", cfg.text)}>
                          {cfg.label}
                        </span>
                        {row.scheduledAt && !row.isActive
                          ? <span className="text-xs text-indigo-600 font-medium">Scheduled for {formatDate(row.scheduledAt)}</span>
                          : !row.isActive && <span className="text-xs text-gray-400 font-medium">Inactive</span>
                        }
                        {row.expiresAt && <span className="text-xs text-gray-400 dark:text-gray-500">Expires {formatDate(row.expiresAt)}</span>}
                      </div>
                      <p className={cn("font-semibold text-sm", cfg.text)}>{row.title}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">{row.body}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatDate(row.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => startEdit(row)} title="Edit"
                        className="p-2 rounded-lg hover:bg-white/60 transition-colors">
                        <Pencil className="w-4 h-4 text-gray-500" />
                      </button>
                      <button onClick={() => toggleActive(row.id, row.isActive)}
                        title={row.isActive ? "Deactivate" : "Activate"}
                        className="p-2 rounded-lg hover:bg-white/60 transition-colors">
                        {row.isActive
                          ? <ToggleRight className="w-5 h-5 text-green-600" />
                          : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                      </button>
                      {deleteId === row.id ? (
                        <div className="flex items-center gap-1.5 bg-white/80 border border-red-200 rounded-lg px-2 py-1">
                          <span className="text-xs text-red-700 font-medium">Delete?</span>
                          <button onClick={() => handleDelete(row.id)} disabled={deleting}
                            className="text-xs font-bold text-red-600 hover:text-red-800 disabled:opacity-50">
                            {deleting ? "…" : "Yes"}
                          </button>
                          <button onClick={() => setDeleteId(null)} className="text-xs text-gray-400 hover:text-gray-600">No</button>
                        </div>
                      ) : (
                        <button onClick={() => { setDeleteId(row.id); setEditId(null); }} title="Delete"
                          className="p-2 rounded-lg hover:bg-white/60 transition-colors">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

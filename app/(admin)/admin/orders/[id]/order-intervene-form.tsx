"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Zap } from "lucide-react";

export function OrderInterveneForm({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState("complete");
  const [newDeadline, setNewDeadline] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const terminal = ["completed", "cancelled"].includes(currentStatus);
  if (terminal) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm(`Are you sure you want to ${action.replace("_", " ")} this order?`)) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/intervene`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, newDeadline: newDeadline || undefined, note }),
      });
      if (res.ok) {
        toast.success("Order updated.");
        setOpen(false);
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Failed.");
      }
    } catch { toast.error("Something went wrong."); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="mt-4">
      {!open ? (
        <button onClick={() => setOpen(true)}
          className="flex items-center gap-2 text-xs font-semibold text-orange-600 border border-orange-200 bg-orange-50 hover:bg-orange-100 px-3 py-2 rounded-lg transition-colors">
          <Zap className="w-3.5 h-3.5" /> Admin intervention
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-xl border border-orange-100 bg-orange-50 p-4 space-y-3">
          <p className="text-xs font-semibold text-orange-800">Admin Intervention</p>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Action</label>
            <select value={action} onChange={e => setAction(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300">
              <option value="complete">Force complete</option>
              <option value="cancel">Force cancel</option>
              <option value="extend_deadline">Extend deadline</option>
            </select>
          </div>
          {action === "extend_deadline" && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">New deadline</label>
              <input type="datetime-local" required value={newDeadline} onChange={e => setNewDeadline(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Note (optional)</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Reason for intervention…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting}
              className="px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors">
              {submitting ? "Processing…" : "Confirm"}
            </button>
            <button type="button" onClick={() => setOpen(false)}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

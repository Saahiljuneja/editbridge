"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Layers } from "lucide-react";

export function MaxOrdersForm({
  editorId,
  currentMax,
}: {
  editorId: string;
  currentMax: number | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentMax !== null ? String(currentMax) : "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/editors/${editorId}/max-orders`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxActiveOrders: value === "" ? null : Number(value) }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Failed.");
        return;
      }
      toast.success(value ? `Max active orders set to ${value}.` : "Max active orders limit cleared (uses tier default).");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Layers className="w-4 h-4 text-blue-500" /> Set Order Limit
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-blue-100 bg-blue-50 p-5 space-y-3">
      <p className="font-semibold text-sm text-gray-900">Set Max Active Orders</p>
      <p className="text-xs text-gray-500">Override how many simultaneous active orders this editor can accept. Leave blank to restore tier default.</p>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Limit (1–50, blank = tier default)</label>
        <input
          type="number"
          min="1"
          max="50"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. 5"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {submitting ? "Saving…" : "Save limit"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Palmtree } from "lucide-react";

export function VacationForm({
  editorId,
  vacationUntil,
}: {
  editorId: string;
  vacationUntil: Date | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(
    vacationUntil ? vacationUntil.toISOString().split("T")[0] : ""
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/editors/${editorId}/vacation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vacationUntil: date || null }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Failed.");
        return;
      }
      toast.success(date ? `Vacation set until ${date}.` : "Vacation mode cleared.");
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
        <Palmtree className="w-4 h-4 text-teal-500" /> Set Vacation
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-teal-100 bg-teal-50 p-5 space-y-3">
      <p className="font-semibold text-sm text-gray-900">Set Vacation Mode</p>
      <p className="text-xs text-gray-500">Editor will appear unavailable until this date. Clear to lift vacation mode early.</p>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Return date (leave blank to clear)</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-300"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {submitting ? "Saving…" : date ? "Set vacation" : "Clear vacation"}
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Crown } from "lucide-react";

const TIERS = [
  { value: "hobby", label: "Hobby" },
  { value: "starter", label: "Starter" },
  { value: "pro", label: "Pro" },
  { value: "agency", label: "Agency" },
];

export function SetTierForm({ editorId, currentTier }: { editorId: string; currentTier: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState(currentTier);
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/editors/${editorId}/tier`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, expiresAt: expiresAt || null }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Failed.");
        return;
      }
      toast.success(`Membership tier set to ${tier}.`);
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
        <Crown className="w-4 h-4 text-amber-500" /> Set Membership Tier
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-amber-100 bg-amber-50 p-5 space-y-3">
      <p className="font-semibold text-sm text-gray-900">Set Membership Tier</p>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Tier</label>
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
        >
          {TIERS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Expires at (optional — leave blank for permanent)</label>
        <input
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {submitting ? "Saving…" : "Save tier"}
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

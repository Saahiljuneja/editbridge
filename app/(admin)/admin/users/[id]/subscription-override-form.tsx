"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Save, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

export function SubscriptionOverrideForm({
  userId,
  currentTier,
  currentExpiresAt,
}: {
  userId: string;
  currentTier: string;
  currentExpiresAt: Date | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState(currentTier);
  const [expiresAt, setExpiresAt] = useState(
    currentExpiresAt ? new Date(currentExpiresAt).toISOString().split("T")[0] : ""
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          expiresAt: expiresAt || null,
        }),
      });
      if (res.ok) {
        toast.success("Membership tier overridden successfully!");
        setOpen(false);
        router.refresh();
      } else {
        toast.error("Failed to update membership.");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <Sparkles className="w-4 h-4 text-violet-500" /> Override Subscription
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-violet-100 bg-violet-50 p-5 space-y-4 w-full">
      <p className="font-semibold text-sm text-gray-900 flex items-center gap-1.5">
        <Sparkles className="w-4 h-4 text-violet-500" /> Editor Subscription Override
      </p>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-gray-750 mb-1">Membership Plan Tier</label>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none"
          >
            <option value="hobby">Hobby (Free)</option>
            <option value="starter">Starter Pass</option>
            <option value="pro">Pro Pass</option>
            <option value="agency">Agency Pass</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-750 mb-1 flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5 text-gray-400" /> Expiry Date (Optional)
          </label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-lg bg-violet-650 hover:bg-violet-750 text-white text-sm font-semibold disabled:opacity-50 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" />
          {submitting ? "Applying Override…" : "Apply Subscription Override"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-650 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

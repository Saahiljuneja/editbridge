"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Award, Save } from "lucide-react";
import { useRouter } from "next/navigation";

export function ProfileCustomizerForm({
  userId,
  initialFrame,
  initialBadges,
}: {
  userId: string;
  initialFrame: string | null;
  initialBadges: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeFrame, setActiveFrame] = useState(initialFrame ?? "");
  const [badges, setBadges] = useState<string[]>(initialBadges);
  const [submitting, setSubmitting] = useState(false);

  const AVAILABLE_BADGES = [
    { key: "trust_badge", label: "Verified Trust Badge" },
    { key: "top_rated", label: "Top Rated Editor" },
    { key: "super_editor", label: "Super Editor Award" },
    { key: "first_cohort", label: "Early Pioneer Member" },
  ];

  function toggleBadge(key: string) {
    setBadges((prev) =>
      prev.includes(key) ? prev.filter((b) => b !== key) : [...prev, key]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/profile-customizer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeFrame: activeFrame || null, badges }),
      });
      if (res.ok) {
        toast.success("Profile frame & badges overrides saved successfully.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error("Failed to update profile decorations.");
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
        <Award className="w-4 h-4 text-violet-500" /> Override Profile Cosmetics
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-violet-100 bg-violet-50 p-5 space-y-4 w-full">
      <p className="font-semibold text-sm text-gray-900 flex items-center gap-1.5">
        <Award className="w-4 h-4 text-violet-500" /> Cosmetics & Trust Badges Override
      </p>

      <div className="space-y-3">
        {/* Frame selector */}
        <div>
          <label className="block text-xs font-semibold text-gray-750 mb-1">Select Profile Avatar Frame</label>
          <select
            value={activeFrame}
            onChange={(e) => setActiveFrame(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none"
          >
            <option value="">-- No Avatar Frame --</option>
            <option value="frame_gold">🏆 Gold Frame</option>
            <option value="frame_sparkle">✨ Sparkle Highlight</option>
            <option value="frame_neon">⚡ Neon Cyber</option>
          </select>
        </div>

        {/* Badges checklist */}
        <div>
          <label className="block text-xs font-semibold text-gray-750 mb-1">Award Trust & Performance Badges</label>
          <div className="space-y-2 mt-1 bg-white p-3 rounded-lg border border-gray-150">
            {AVAILABLE_BADGES.map((badge) => (
              <label key={badge.key} className="flex items-center gap-2 text-xs text-gray-700 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={badges.includes(badge.key)}
                  onChange={() => toggleBadge(badge.key)}
                  className="rounded border-gray-300 text-violet-600 focus:ring-violet-550"
                />
                <span>{badge.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-lg bg-violet-650 hover:bg-violet-750 text-white text-sm font-semibold disabled:opacity-50 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" />
          {submitting ? "Saving changes…" : "Save Cosmetics"}
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star } from "lucide-react";

export function FeaturedToggleForm({ editorId, isFeatured }: { editorId: string; isFeatured: boolean }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function toggle() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/editors/${editorId}/featured`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: !isFeatured }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Failed.");
        return;
      }
      toast.success(isFeatured ? "Removed featured placement." : "Editor is now featured for free.");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={submitting}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors disabled:opacity-50 ${
        isFeatured
          ? "border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100"
          : "border-gray-200 text-gray-600 hover:bg-gray-50"
      }`}
    >
      <Star className={`w-4 h-4 ${isFeatured ? "fill-amber-500 text-amber-500" : ""}`} />
      {isFeatured ? "Remove featured (free override)" : "Feature for free (manual override)"}
    </button>
  );
}

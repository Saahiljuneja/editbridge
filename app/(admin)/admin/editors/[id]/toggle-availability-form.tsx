"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarCheck, CalendarX } from "lucide-react";

export function ToggleAvailabilityForm({
  editorId,
  isAvailable,
}: {
  editorId: string;
  isAvailable: boolean;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleToggle() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/editors/${editorId}/availability`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: !isAvailable }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Failed.");
        return;
      }
      toast.success(isAvailable ? "Editor set to unavailable." : "Editor set to available.");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={submitting}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors disabled:opacity-50 ${
        isAvailable
          ? "border-orange-200 text-orange-600 hover:bg-orange-50"
          : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
      }`}
    >
      {isAvailable ? <CalendarX className="w-4 h-4" /> : <CalendarCheck className="w-4 h-4" />}
      {submitting ? "Updating…" : isAvailable ? "Set Unavailable" : "Set Available"}
    </button>
  );
}

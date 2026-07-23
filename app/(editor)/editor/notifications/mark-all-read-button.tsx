"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCheck } from "lucide-react";

export function MarkAllReadButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await fetch("/api/notifications", { method: "PATCH" });
      router.refresh();
      toast.success("All notifications marked as read.");
    } catch { toast.error("Something went wrong."); }
    finally { setLoading(false); }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
    >
      <CheckCheck className="w-3.5 h-3.5" />
      {loading ? "…" : "Mark all read"}
    </button>
  );
}

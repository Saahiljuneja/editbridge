"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function DismissFlagButton({ commentId }: { commentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function dismiss() {
    setLoading(true);
    const res = await fetch("/api/portfolio/flag", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId }),
    });
    if (res.ok) {
      toast.success("Flag dismissed");
      router.refresh();
    } else {
      toast.error("Failed to dismiss flag");
      setLoading(false);
    }
  }

  return (
    <button
      onClick={dismiss}
      disabled={loading}
      className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-40 transition-colors"
    >
      {loading ? "…" : "Dismiss"}
    </button>
  );
}

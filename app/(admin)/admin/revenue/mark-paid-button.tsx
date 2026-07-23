"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";

export function MarkPaidButton({ payoutId }: { payoutId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!confirm("Mark this payout as completed?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payouts/${payoutId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      if (res.ok) {
        toast.success("Payout marked as completed.");
        router.refresh();
      } else {
        toast.error("Failed to update payout.");
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 disabled:opacity-50 transition-colors"
    >
      <CheckCircle className="w-3.5 h-3.5" />
      {loading ? "…" : "Mark paid"}
    </button>
  );
}

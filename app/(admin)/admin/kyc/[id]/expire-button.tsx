"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldOff } from "lucide-react";

export function ExpireButton({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleExpire() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/kyc/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "expire" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to expire KYC.");
        return;
      }
      toast.success("KYC marked as expired. Editor has been notified.");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Are you sure?</span>
        <button
          onClick={handleExpire}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Expiring…" : "Yes, expire"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-200 text-orange-700 text-xs font-medium hover:bg-orange-50 transition-colors"
    >
      <ShieldOff className="w-3.5 h-3.5" />
      Force expire KYC
    </button>
  );
}

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";

export function TwoFactorResetButton({ userId, enabled }: { userId: string; enabled: boolean }) {
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    if (!confirm("Are you sure you want to disable Two-Factor Authentication (2FA) for this user? This will delete their active authenticator secret and backup codes immediately, letting them log back in with password only. Continue?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-2fa`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Two-Factor Authentication status reset successfully.");
      } else {
        toast.error("Failed to reset 2FA.");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleReset}
      disabled={loading || !enabled}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors cursor-pointer ${
        enabled
          ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
          : "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
      }`}
    >
      <ShieldAlert className="w-4 h-4 text-amber-500" />
      {loading ? "Resetting…" : "Reset 2FA Status"}
    </button>
  );
}

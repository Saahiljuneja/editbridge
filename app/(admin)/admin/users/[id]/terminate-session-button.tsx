"use client";

import { useState } from "react";
import { toast } from "sonner";
import { LogOut } from "lucide-react";

export function TerminateSessionButton({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleTerminate() {
    if (
      !confirm(
        "Are you sure you want to terminate all active sessions for this user? This will log them out of all browser tabs and devices immediately. Continue?"
      )
    )
      return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/terminate-sessions`, {
        method: "POST",
      });
      if (!res.ok) {
        toast.error("Failed to terminate sessions.");
        return;
      }
      toast.success("All active login sessions terminated successfully.");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleTerminate}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors cursor-pointer"
    >
      <LogOut className="w-4 h-4 text-red-500" />
      {loading ? "Terminating…" : "Force Logout Everywhere"}
    </button>
  );
}

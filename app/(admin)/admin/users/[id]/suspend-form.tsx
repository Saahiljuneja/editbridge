"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, CheckCircle } from "lucide-react";

export function SuspendForm({
  userId,
  isActive,
}: {
  userId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive, reason }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Failed.");
        return;
      }
      toast.success(isActive ? "User suspended." : "User reactivated.");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
          isActive
            ? "border-red-200 text-red-600 hover:bg-red-50"
            : "border-green-200 text-green-700 hover:bg-green-50"
        }`}
      >
        {isActive ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
        {isActive ? "Suspend account" : "Reactivate account"}
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`rounded-2xl border p-5 space-y-3 ${
        isActive ? "border-red-100 bg-red-50" : "border-green-100 bg-green-50"
      }`}
    >
      <p className="font-semibold text-sm text-gray-900">
        {isActive ? "Suspend this account?" : "Reactivate this account?"}
      </p>
      <p className="text-xs text-gray-500">
        {isActive
          ? "The user will not be able to log in or use the platform while suspended."
          : "The user will be able to log in and use the platform again."}
      </p>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Reason (optional)</label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Violation of terms of service"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 bg-white"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className={`px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 transition-colors ${
            isActive ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {submitting ? "Processing…" : isActive ? "Suspend" : "Reactivate"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

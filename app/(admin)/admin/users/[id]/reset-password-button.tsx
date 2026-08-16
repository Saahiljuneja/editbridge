"use client";

import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Copy, Check } from "lucide-react";

export function ResetPasswordButton({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleReset() {
    if (!confirm("This will overwrite the user's password with a newly generated temporary password. Continue?")) return;
    setLoading(false);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to reset password.");
        return;
      }
      setTempPassword(data.tempPassword);
      toast.success("Temporary password generated!");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!tempPassword) return;
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  if (tempPassword) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 space-y-3 w-full">
        <p className="font-bold text-sm text-red-900">Temporary Password Generated</p>
        <p className="text-xs text-red-700 font-semibold leading-relaxed">
          Provide this password to the user. For security, they should change it immediately once logged in. This password is not shown again.
        </p>
        <div className="flex items-center gap-2 bg-white border border-red-200 rounded-lg p-2.5 max-w-sm">
          <code className="text-sm font-mono font-black text-red-900 select-all flex-1">{tempPassword}</code>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <button
          onClick={() => setTempPassword(null)}
          className="text-xs font-bold text-red-700 hover:text-red-900"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleReset}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors cursor-pointer"
    >
      <KeyRound className="w-4 h-4 text-red-500" />
      {loading ? "Generating…" : "Reset Password"}
    </button>
  );
}

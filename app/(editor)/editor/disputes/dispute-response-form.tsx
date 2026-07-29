"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";

export function DisputeResponseForm({ disputeId, existingResponse }: { disputeId: string; existingResponse: string | null }) {
  const router = useRouter();
  const [text, setText] = useState(existingResponse ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/editor/disputes/${disputeId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evidenceText: text.trim() }),
      });
      if (res.ok) { toast.success("Response submitted."); router.refresh(); }
      else toast.error((await res.json().catch(() => ({}))).error ?? "Failed to submit.");
    } catch { toast.error("Something went wrong."); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        {existingResponse ? "Update your response" : "Submit your response"}
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Explain your side clearly and professionally. Mention what was delivered, any client communication, and why the work meets the agreed scope…"
          rows={5}
          maxLength={2000}
          className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/20 focus:border-[var(--brand-client)] resize-none"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">{text.length}/2000</span>
          <button
            type="submit"
            disabled={saving || !text.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand-client)] text-white text-sm font-semibold hover:bg-[var(--brand-client-hover)] disabled:opacity-50 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            {saving ? "Submitting…" : existingResponse ? "Update response" : "Submit response"}
          </button>
        </div>
      </form>
    </div>
  );
}

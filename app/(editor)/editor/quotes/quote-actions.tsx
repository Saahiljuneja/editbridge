"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

const COLOR = "#0EA5E9";

export function EditorQuoteActions({ quoteId, budgetMax }: { quoteId: string; budgetMax: number }) {
  const router = useRouter();
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const priceInPaise = Math.round(Number(price) * 100);
    if (!priceInPaise || priceInPaise < 50000) { toast.error("Minimum offer is ₹500"); return; }
    if (priceInPaise > budgetMax) {
      toast.error(`Offer cannot exceed client's max budget of ${formatCurrency(budgetMax)}`);
      return;
    }
    if (!message || message.length < 10) { toast.error("Please add a message (min 10 chars)"); return; }

    setLoading(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: priceInPaise, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send offer");
      toast.success("Offer sent! Client will be notified.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-1">
      <div className="text-xs text-gray-400 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
        Max budget: <span className="font-semibold text-amber-700">{formatCurrency(budgetMax)}</span> — your offer cannot exceed this.
      </div>
      <div className="flex gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">₹</span>
          <input
            type="number"
            placeholder="Your price"
            value={price}
            onChange={e => setPrice(e.target.value)}
            className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2"
            style={{ "--tw-ring-color": COLOR } as React.CSSProperties}
          />
        </div>
      </div>
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        rows={3}
        placeholder="Briefly explain your approach and why your price is right for this project..."
        className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2"
        style={{ "--tw-ring-color": COLOR } as React.CSSProperties}
      />
      <button type="submit" disabled={loading}
        className="w-full py-2.5 rounded-xl font-semibold text-white text-sm disabled:opacity-60 transition-opacity"
        style={{ background: COLOR }}>
        {loading ? "Sending..." : "Send Offer"}
      </button>
    </form>
  );
}

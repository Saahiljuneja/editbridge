"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { SendHorizonal, Loader2 } from "lucide-react";

export function EditorQuoteActions({
  quoteId,
  budgetMax,
}: {
  quoteId: string;
  budgetMax: number;
}) {
  const router = useRouter();
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const priceInPaise = Math.round(Number(price) * 100);
    if (!priceInPaise || priceInPaise < 50000) {
      toast.error("Minimum offer is ₹500");
      return;
    }
    if (priceInPaise > budgetMax) {
      toast.error(
        `Offer cannot exceed client's max budget of ${formatCurrency(budgetMax)}`
      );
      return;
    }
    if (!message || message.length < 10) {
      toast.error("Please add a message (min 10 characters)");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: priceInPaise, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send offer");
      toast.success("Offer sent! The client will be notified.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-1 border-t border-gray-50 mt-1">
      {/* Budget constraint */}
      <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5">
        <span className="text-xs text-amber-700">Max client budget</span>
        <span className="text-sm font-bold text-amber-800 tabular-nums">
          {formatCurrency(budgetMax)}
        </span>
      </div>

      {/* Price input */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
          Your price (₹)
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400 pointer-events-none">
            ₹
          </span>
          <input
            type="number"
            placeholder="e.g. 2500"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            min="500"
            className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9]/50 placeholder:text-gray-400 tabular-nums"
          />
        </div>
      </div>

      {/* Message */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
          Message to client
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Explain your approach and why your price is right for this project…"
          className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9]/50 placeholder:text-gray-400"
        />
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-gray-400">
            {message.length < 10 && message.length > 0
              ? `${10 - message.length} more characters needed`
              : ""}
          </span>
          <span className="text-xs text-gray-400 tabular-nums">{message.length}/500</span>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-[#0EA5E9] hover:bg-sky-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Sending…
          </>
        ) : (
          <>
            <SendHorizonal className="w-4 h-4" />
            Send Offer
          </>
        )}
      </button>
    </form>
  );
}

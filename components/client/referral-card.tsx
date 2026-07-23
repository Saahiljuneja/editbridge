"use client";

import { useEffect, useState } from "react";
import { Gift, Copy, Check, Users, IndianRupee } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface ReferralData {
  code: string;
  referralUrl: string;
  total: number;
  rewarded: number;
  pending: number;
  totalEarned: number;
}

export function ReferralCard() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referrals")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {});
  }, []);

  async function copy() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.referralUrl);
      setCopied(true);
      toast.success("Referral link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed — try manually.");
    }
  }

  if (!data) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
        <Gift className="w-4 h-4 text-[#0EA5E9]" />
        <h2 className="font-semibold text-gray-900 text-sm">Refer & Earn</h2>
      </div>

      <div className="p-5 space-y-4">
        <p className="text-xs text-gray-500 leading-relaxed">
          Share your link. When someone signs up and places their first order, you both earn{" "}
          <span className="font-semibold text-[#0EA5E9]">₹200 in credits</span>.
        </p>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: "Referred", value: data.total, icon: Users, color: "text-gray-700" },
            { label: "Rewarded", value: data.rewarded, icon: Check, color: "text-green-600" },
            { label: "Earned", value: formatCurrency(data.totalEarned), icon: IndianRupee, color: "text-[#0EA5E9]" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl bg-gray-50 py-3 px-2">
              <p className={cn("text-base font-bold", color)}>{value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Link + copy */}
        <div className="flex gap-2">
          <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2.5 text-xs text-gray-500 font-mono truncate border border-gray-100">
            {data.referralUrl}
          </div>
          <button
            onClick={copy}
            className={cn(
              "px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-colors shrink-0",
              copied
                ? "bg-green-100 text-green-700"
                : "bg-[#0EA5E9] text-white hover:bg-[#3d34a0]"
            )}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {data.pending > 0 && (
          <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
            {data.pending} referral{data.pending > 1 ? "s" : ""} pending — waiting for their first order.
          </p>
        )}
      </div>
    </div>
  );
}

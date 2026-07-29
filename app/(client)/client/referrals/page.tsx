"use client";

import { useEffect, useState } from "react";
import { Gift, Copy, Check, Users, IndianRupee, Clock } from "lucide-react";
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

export default function ReferralsPage() {
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
      toast.error("Copy failed.");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="px-8 py-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--brand-client)]/10 flex items-center justify-center">
            <Gift className="w-5 h-5 text-[var(--brand-client)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Refer & Earn</h1>
            <p className="text-sm text-gray-400">Share EditBridge, earn ₹100 credits per referral</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">

        {/* How it works */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">How it works</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { step: "1", title: "Share your link", desc: "Send your unique referral link to a creator friend." },
              { step: "2", title: "They sign up", desc: "Your friend creates their free EditBridge account." },
              { step: "3", title: "You earn ₹100", desc: "When they place their first order worth ₹1000+, you get ₹100 credits." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-9 h-9 rounded-full bg-[var(--brand-client)] text-white text-sm font-bold flex items-center justify-center mx-auto mb-3">
                  {step}
                </div>
                <p className="font-semibold text-sm text-gray-800 mb-1">{title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Your link */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Your referral link</h2>
          {data ? (
            <>
              <div className="flex gap-2">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-600 font-mono break-all">
                  {data.referralUrl}
                </div>
                <button
                  onClick={copy}
                  className={cn(
                    "px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors shrink-0",
                    copied
                      ? "bg-green-100 text-green-700"
                      : "bg-[var(--brand-client)] text-white hover:bg-[var(--brand-editor-hover)]"
                  )}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="text-xs text-gray-400">
                Your code: <span className="font-mono font-semibold text-gray-600">{data.code}</span>
              </p>
            </>
          ) : (
            <div className="h-14 bg-gray-100 animate-pulse rounded-xl" />
          )}
        </div>

        {/* Stats */}
        {data && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Referred", value: data.total, icon: Users, color: "text-gray-800", bg: "bg-gray-50" },
              { label: "Rewarded", value: data.rewarded, icon: Check, color: "text-green-700", bg: "bg-green-50" },
              { label: "Credits Earned", value: formatCurrency(data.totalEarned), icon: IndianRupee, color: "text-[var(--brand-client)]", bg: "bg-[var(--brand-client)]/5" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className={cn("rounded-2xl border border-gray-100 p-5 text-center shadow-sm", bg, "bg-white")}>
                <Icon className={cn("w-5 h-5 mx-auto mb-2", color)} />
                <p className={cn("text-xl font-bold", color)}>{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {data && data.pending > 0 && (
          <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-100 px-5 py-4">
            <Clock className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {data.pending} referral{data.pending > 1 ? "s" : ""} pending
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Waiting for {data.pending > 1 ? "them" : "them"} to place their first order. Credits will be awarded automatically.
              </p>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400 text-center">
          Credits expire 90 days from award · One reward per referred user · No limit on referrals
        </p>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Gift, Copy, Check, Users, CheckCircle2, CreditCard, Share2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ReferralData = {
  referralCode: string;
  stats: { total: number; successful: number; creditsEarned: number };
  referrals: Array<{ id: string; creditAwarded: number; rewardedAt: string | null; createdAt: string }>;
};

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: string; icon: React.ElementType; accent: string }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200/60 shadow-sm p-5 flex items-center justify-between">
      <div>
        <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-black text-neutral-900">{value}</p>
      </div>
      <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0", accent)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  );
}

export default function ReferralPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/client/referral")
      .then(r => r.json())
      .then(d => setData(d as ReferralData))
      .catch(() => toast.error("Failed to load referral data."))
      .finally(() => setLoading(false));
  }, []);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const referralLink = data ? `${appUrl}/signup?ref=${data.referralCode}` : "";

  async function copyLink() {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink).catch(() => {});
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareLink() {
    if (!referralLink) return;
    if (navigator.share) {
      navigator.share({ title: "Join EditBridge", text: "Hire verified video editors with escrow protection.", url: referralLink }).catch(() => {});
    } else {
      await copyLink();
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-16 space-y-4">
        <div className="bg-white rounded-3xl border border-neutral-200/60 shadow-sm p-6 animate-pulse space-y-4">
          <div className="h-5 w-40 bg-neutral-100 rounded-lg" />
          <div className="h-12 bg-neutral-100 rounded-xl" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-neutral-200/60 shadow-sm p-5 h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-16 space-y-5">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-neutral-200/60 shadow-sm overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <Gift className="w-5 h-5 text-[#0EA5E9]" />
            <h1 className="text-lg font-black text-neutral-900 tracking-tight">Refer &amp; Earn</h1>
          </div>
          <p className="text-sm text-neutral-500 leading-relaxed">
            Share your unique link. When someone signs up and places their first order, you both earn platform credits.
          </p>
        </div>

        {/* Referral link */}
        <div className="px-6 pb-6 space-y-3">
          <p className="text-[11px] font-black text-neutral-400 uppercase tracking-wider">Your referral link</p>
          <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3">
            <code className="flex-1 text-sm text-neutral-700 font-mono truncate text-xs">{referralLink}</code>
            <button
              onClick={copyLink}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0",
                copied
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-[#0EA5E9]/10 text-[#0EA5E9] hover:bg-[#0EA5E9]/20"
              )}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={shareLink}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-[#0EA5E9] hover:bg-sky-600 transition-colors"
            >
              <Share2 className="w-4 h-4" /> Share link
            </button>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-600">
              Code: <span className="font-mono text-neutral-900">{data?.referralCode}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Total Referred"
          value={String(data?.stats.total ?? 0)}
          icon={Users}
          accent="bg-sky-500"
        />
        <StatCard
          label="Successful"
          value={String(data?.stats.successful ?? 0)}
          icon={CheckCircle2}
          accent="bg-emerald-500"
        />
        <StatCard
          label="Credits Earned"
          value={`₹${Math.round((data?.stats.creditsEarned ?? 0) / 100)}`}
          icon={CreditCard}
          accent="bg-violet-500"
        />
      </div>

      {/* How it works */}
      <div className="bg-white rounded-3xl border border-neutral-200/60 shadow-sm p-6">
        <p className="text-sm font-black text-neutral-900 mb-5">How it works</p>
        <div className="space-y-4">
          {[
            { step: "1", title: "Share your link", desc: "Send your unique referral link to friends or clients." },
            { step: "2", title: "They sign up & order", desc: "Your friend creates an account and places their first order." },
            { step: "3", title: "Both earn credits", desc: "You get ₹200 in platform credits. They get ₹100 off their first order." },
          ].map((item, i) => (
            <div key={item.step} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-xl bg-[#0EA5E9]/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-black text-[#0EA5E9]">{item.step}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-neutral-900">{item.title}</p>
                <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
              {i < 2 && <ArrowRight className="w-4 h-4 text-neutral-200 shrink-0 mt-2" />}
            </div>
          ))}
        </div>
      </div>

      {/* Referral history */}
      {(data?.referrals.length ?? 0) > 0 && (
        <div className="bg-white rounded-3xl border border-neutral-200/60 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100">
            <p className="text-sm font-black text-neutral-900">Referral history</p>
          </div>
          <div className="divide-y divide-neutral-100">
            {data!.referrals.map(r => (
              <div key={r.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-xs font-bold text-neutral-700">
                    {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  <p className="text-[10px] text-neutral-400 mt-0.5">
                    {r.rewardedAt ? "Reward earned" : "Awaiting first order"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {r.rewardedAt && r.creditAwarded > 0 && (
                    <span className="text-sm font-black text-emerald-600">
                      +₹{Math.round(r.creditAwarded / 100)}
                    </span>
                  )}
                  <span className={cn(
                    "text-[10px] font-black px-2.5 py-1 rounded-full",
                    r.rewardedAt
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  )}>
                    {r.rewardedAt ? "Rewarded" : "Pending"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Terms note */}
      <p className="text-[11px] text-neutral-400 text-center leading-relaxed px-4">
        Credits are issued after the referred user completes their first paid order. Credits expire after 90 days.
        One reward per referred account. EditBridge reserves the right to adjust or cancel referral rewards for abuse.
      </p>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { TopoBackground } from "@/components/common/topo-background";
import {
  Check, Crown, HelpCircle, Shield, Sparkles, CreditCard, Calendar, Zap,
  ArrowRight, CheckCircle2, Gift, Copy, CheckCheck, Users, Clock,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";

const TIER_PLANS = {
  monthly: [
    {
      name: "Free", price: "₹0", period: "/month",
      desc: "For occasional hiring",
      features: ["1 Active Project Limit", "Standard Turnaround", "Standard Editor Matching", "Standard Support (Email)", "Basic file storage"],
      cta: "Current Plan", current: true, popular: false,
      color: "border-neutral-200/60 bg-white text-neutral-800",
    },
    {
      name: "Pro", price: "₹799", period: "/month",
      desc: "For creators and growing businesses",
      features: ["3 Active Projects Limit", "Priority Turnaround", "Premium Editor Matching", "5% discount on all orders", "Priority support (Email & Chat)", "Early access to top editors"],
      cta: "Upgrade to Pro", current: false, popular: true,
      color: "border-blue-200 bg-white text-neutral-800 ring-2 ring-blue-800/10",
    },
    {
      name: "Business", price: "₹2,499", period: "/month",
      desc: "For agencies and teams",
      features: ["5 Active Projects Limit", "VIP 12-24h Turnaround", "Dedicated Account Manager", "10% discount on all orders", "24/7 VIP Slack & Chat Support", "Custom editor vetting", "Extended raw asset storage"],
      cta: "Upgrade to Business", current: false, popular: false,
      color: "border-neutral-200/60 bg-white text-neutral-800",
    },
  ],
  yearly: [
    {
      name: "Free", price: "₹0", period: "/month",
      desc: "For occasional hiring",
      features: ["1 Active Project Limit", "Standard Turnaround", "Standard Editor Matching", "Standard Support (Email)", "Basic file storage"],
      cta: "Current Plan", current: true, popular: false,
      color: "border-neutral-200/60 bg-white text-neutral-800",
    },
    {
      name: "Pro", price: "₹559", period: "/month", billedAnnually: "₹6,708 billed annually",
      desc: "For creators and growing businesses",
      features: ["3 Active Projects Limit", "Priority Turnaround", "Premium Editor Matching", "5% discount on all orders", "Priority support (Email & Chat)", "Early access to top editors"],
      cta: "Upgrade to Pro", current: false, popular: true,
      color: "border-blue-200 bg-white text-neutral-800 ring-2 ring-blue-800/10",
    },
    {
      name: "Business", price: "₹1,749", period: "/month", billedAnnually: "₹20,988 billed annually",
      desc: "For agencies and teams",
      features: ["5 Active Projects Limit", "VIP 12-24h Turnaround", "Dedicated Account Manager", "10% discount on all orders", "24/7 VIP Slack & Chat Support", "Custom editor vetting", "Extended raw asset storage"],
      cta: "Upgrade to Business", current: false, popular: false,
      color: "border-neutral-200/60 bg-white text-neutral-800",
    },
  ],
};

const FAQS = [
  {
    q: "Can I cancel or change my plan anytime?",
    a: "Absolutely. There are no lock-in contracts. You can upgrade, downgrade, or cancel your plan anytime from your billing settings. Downgrades take effect at the end of the current billing cycle.",
  },
  {
    q: "How does the active project limit work?",
    a: "An active project is any project that is currently 'In Progress' or 'In Review'. Once a project is completed or placed in draft mode, it no longer counts toward your active project limit.",
  },
  {
    q: "How are the order discounts applied?",
    a: "The order discounts (5% for Pro, 10% for Business) are automatically calculated and applied at checkout to all order types, package orders, and custom quotes.",
  },
  {
    q: "Can I invite team members under my subscription?",
    a: "Yes! Business plans allow you to invite team members to collaborate on projects, upload briefs, and share the same feedback loop.",
  },
];

type ReferralData = {
  code: string;
  referralUrl: string;
  total: number;
  rewarded: number;
  pending: number;
  totalEarned: number;
};

export default function ClientMembershipPage() {
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [referral, setReferral] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState(false);

  const plans = TIER_PLANS[billingInterval];

  const handleUpgrade = (planName: string) => {
    if (planName === "Free") return;
    setLoadingPlan(planName);
    setTimeout(() => {
      setLoadingPlan(null);
      toast.success(`Redirecting to checkout for ${planName} ${billingInterval} plan...`);
    }, 1200);
  };

  useEffect(() => {
    fetch("/api/referrals")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setReferral(d as ReferralData); })
      .catch(() => {});
  }, []);

  const copyReferralUrl = () => {
    if (!referral?.referralUrl) return;
    navigator.clipboard.writeText(referral.referralUrl).then(() => {
      setCopied(true);
      toast.success("Referral link copied!");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="relative min-h-screen bg-slate-50/50 pb-20 overflow-hidden select-none">
      <TopoBackground background="#f8fafc" strokeColor="#e2e8f0" opacity={0.4} />

      <div className="max-w-5xl mx-auto px-6 pt-8 space-y-8 relative z-10">

        {/* Header Block */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Crown className="w-5 h-5 text-amber-500 fill-amber-500" />
              <h1 className="text-2xl font-black text-neutral-900 tracking-tight leading-none">Client Membership</h1>
            </div>
            <p className="text-xs text-neutral-400 font-bold mt-1">Upgrade your production volume and unlock priority turnarounds.</p>
          </div>

          {/* Billing Switcher */}
          <div className="bg-white p-1 rounded-2xl border border-neutral-200/60 shadow-sm flex items-center shrink-0">
            <button onClick={() => setBillingInterval("monthly")}
              className={cn("px-4 py-2 rounded-xl text-xs font-black transition-all",
                billingInterval === "monthly" ? "bg-brand-primary text-white shadow-sm" : "text-neutral-500 hover:text-neutral-800")}>
              Monthly
            </button>
            <button onClick={() => setBillingInterval("yearly")}
              className={cn("px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5",
                billingInterval === "yearly" ? "bg-brand-primary text-white shadow-sm" : "text-neutral-500 hover:text-neutral-800")}>
              Yearly
              <span className={cn("text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md",
                billingInterval === "yearly" ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-600")}>
                Save 30%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan) => {
            const isFree = plan.name === "Free";
            return (
              <div key={plan.name}
                className={cn("rounded-3xl border p-6 flex flex-col justify-between shadow-sm relative overflow-hidden transition-all hover:shadow-md", plan.color)}>
                {plan.popular && (
                  <div className="absolute top-4 right-4 bg-brand-primary text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm shadow-blue-800/10">
                    <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" /> Popular
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-black text-neutral-900 tracking-tight">{plan.name}</h3>
                  <p className="text-xs text-neutral-400 font-bold mt-1 min-h-[32px]">{plan.desc}</p>
                  <div className="mt-4 flex flex-col">
                    <div className="flex items-baseline">
                      <span className="text-4xl font-black text-neutral-900 tracking-tight">{plan.price}</span>
                      <span className="text-xs text-neutral-400 font-bold ml-1">{plan.period}</span>
                    </div>
                    {"billedAnnually" in plan && plan.billedAnnually && (
                      <span className="text-[10px] text-emerald-600 font-bold mt-1">{plan.billedAnnually}</span>
                    )}
                  </div>
                  <div className="my-5 h-px bg-neutral-100" />
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-neutral-600 font-bold">
                        <Check className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-8">
                  <button disabled={isFree || loadingPlan !== null} onClick={() => handleUpgrade(plan.name)}
                    className={cn("w-full py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm",
                      isFree ? "bg-neutral-100 text-neutral-400 border border-neutral-200/20 cursor-default shadow-none"
                        : plan.popular ? "bg-brand-primary hover:bg-brand-primary text-white shadow-blue-900/10"
                        : "bg-neutral-900 hover:bg-black text-white")}>
                    {loadingPlan === plan.name
                      ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : plan.cta}
                    {!isFree && <ArrowRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current Plan Details */}
        <div className="bg-white rounded-3xl border border-neutral-200/60 p-6 shadow-sm flex flex-col md:flex-row items-stretch justify-between gap-6 relative z-10">
          <div className="space-y-4 flex-1">
            <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-primary" /> Current Plan Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-start gap-2">
                <Crown className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Plan Tier</p>
                  <p className="text-xs font-black text-neutral-800 mt-0.5">Free</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Billing Interval</p>
                  <p className="text-xs font-black text-neutral-800 mt-0.5">None (Forever Free)</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CreditCard className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Payment Method</p>
                  <p className="text-xs font-black text-neutral-800 mt-0.5">Not Linked</p>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t md:border-t-0 md:border-l border-neutral-100 pt-6 md:pt-0 md:pl-6 shrink-0 flex flex-col justify-center">
            <Link href="/client/transactions"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-[10px] font-bold uppercase tracking-wider text-neutral-700 transition-colors shadow-sm">
              View Billing History
            </Link>
          </div>
        </div>

        {/* FAQs */}
        <div className="bg-white rounded-3xl border border-neutral-200/60 p-6 shadow-sm space-y-5">
          <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-neutral-400" /> Frequently Asked Questions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
            {FAQS.map((faq, i) => (
              <div key={i} className="space-y-1.5">
                <h4 className="text-xs font-black text-neutral-800">{faq.q}</h4>
                <p className="text-xs text-neutral-400 font-semibold leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Refer & Earn Section ─── */}
        <div className="bg-white rounded-3xl border border-neutral-200/60 p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider">Refer & Earn</h3>
          </div>

          {/* How it works */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { step: "1", title: "Share your link", desc: "Send your unique referral link to friends and creators", icon: Gift },
              { step: "2", title: "They sign up", desc: "Your friend creates an account and places their first order", icon: Users },
              { step: "3", title: "Both earn credit", desc: "You get ₹200 credit once they complete their first order", icon: Zap },
            ].map(({ step, title, desc, icon: Icon }) => (
              <div key={step} className="flex items-start gap-3 p-4 rounded-2xl border border-neutral-100 bg-neutral-50/50">
                <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-amber-500" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-black text-neutral-800">{title}</p>
                  <p className="text-[10px] text-neutral-400 font-semibold leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Referral link */}
          {referral ? (
            <>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 min-w-0">
                  <span className="text-xs font-mono text-neutral-600 truncate flex-1">{referral.referralUrl}</span>
                </div>
                <button onClick={copyReferralUrl}
                  className={cn("flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-sm border shrink-0",
                    copied ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-brand-primary text-white border-brand-primary hover:bg-brand-primary")}>
                  {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Copy Link"}
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Total Referrals", value: referral.total, color: "text-neutral-900" },
                  { label: "Rewarded",         value: referral.rewarded, color: "text-emerald-600" },
                  { label: "Pending",          value: referral.pending,  color: "text-amber-600" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-neutral-50 rounded-2xl border border-neutral-100 p-4 text-center">
                    <p className={cn("text-2xl font-black leading-none", color)}>{value}</p>
                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-1">{label}</p>
                  </div>
                ))}
              </div>

              {referral.pending > 0 && (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 font-semibold leading-relaxed">
                    You have <strong>{referral.pending}</strong> pending referral{referral.pending !== 1 ? "s" : ""}. Credit will be applied once your friends complete their first order.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center py-8">
              <span className="w-5 h-5 border-2 border-neutral-300 border-t-blue-500 rounded-full animate-spin" />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

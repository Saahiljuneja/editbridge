"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Award, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MEMBERSHIP_PLANS = [
  {
    id: "hobby",
    name: "Hobby",
    price: 0,
    commission: 15,
    tagline: "Perfect for testing the platform waters.",
    badge: "Free Tier",
    features: [
      "Keep 85% of order payouts",
      "Up to 3 portfolio item uploads",
      "Standard search listing index",
      "Basic page views analytics dashboard",
      "Standard email support",
    ],
    accent: "#64748b",
  },
  {
    id: "starter",
    name: "Starter",
    price: 499,
    commission: 10,
    tagline: "Level up your freelance presence.",
    badge: "Bronze Level",
    features: [
      "Keep 90% of order payouts",
      "Up to 10 portfolio item uploads",
      "Bronze verified platform badge",
      "24-hour priority payouts approval",
      "1 active profile search boost token",
      "Priority email support",
    ],
    accent: "#0284c7",
  },
  {
    id: "pro",
    name: "Pro",
    price: 1499,
    commission: 5,
    tagline: "Designed for professional video editors.",
    badge: "Silver Level",
    features: [
      "Keep 95% of order payouts",
      "Unlimited portfolio item uploads",
      "Silver premium verified badge",
      "Instant checkout payouts transfer",
      "Top search placement boost card",
      "3 concurrent active search boosts",
      "24/7 priority discord support",
    ],
    accent: "#6366f1",
    isPopular: true,
  },
  {
    id: "agency",
    name: "Agency",
    price: 3999,
    commission: 3,
    tagline: "Ultimate tier for high-volume studios.",
    badge: "Gold Level",
    features: [
      "Keep 97% of order payouts",
      "Unlimited portfolio item uploads",
      "Gold agency verified badge",
      "Featured Agency listing cards in search",
      "6 concurrent active search boosts",
      "Dedicated success manager seat",
      "Managed invoice matching & client support",
    ],
    accent: "#d97706",
  },
];

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && (window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function MembershipClient({ isPricingTiersEnabled }: { isPricingTiersEnabled: boolean }) {
  const [currentTier, setCurrentTier] = useState<string>("hobby");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [isUpgrading, setIsUpgrading] = useState<boolean>(false);
  const [upgradeTarget, setUpgradeTarget] = useState<typeof MEMBERSHIP_PLANS[0] | null>(null);

  useEffect(() => {
    if (isPricingTiersEnabled) {
      fetchMembership();
    } else {
      setLoading(false);
    }
  }, [isPricingTiersEnabled]);

  async function fetchMembership() {
    try {
      const res = await fetch("/api/editor/membership");
      if (res.ok) {
        const data = await res.json();
        setCurrentTier(data.membershipTier || "hobby");
        setExpiresAt(data.membershipExpiresAt || null);
      }
    } catch (err) {
      console.error("Failed to fetch membership:", err);
    } finally {
      setLoading(false);
    }
  }

  if (!isPricingTiersEnabled) {
    return (
      <div className="px-6 py-16 flex flex-col items-center justify-center min-h-[70vh] text-center max-w-xl mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-6">
          <Info className="w-8 h-8 text-amber-500" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-3">Membership Tiers Coming Soon</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          Editor Membership plans (Hobby, Starter, Pro, Agency) are currently disabled by the administration. 
          Once active, you will be able to upgrade your account to lower your platform commissions, upload more portfolio items, and get search boosts.
        </p>
        <div className="text-xs text-gray-400 border border-gray-200 rounded-xl px-4 py-3 bg-gray-50">
          Feature flag: <code className="font-mono text-amber-600">editor_membership_pricing</code> is currently inactive.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
        <p className="text-sm text-gray-500">Loading your membership plan...</p>
      </div>
    );
  }

  const activePlanDetails = MEMBERSHIP_PLANS.find(p => p.id === currentTier) || MEMBERSHIP_PLANS[0];

  function handleUpgradeClick(plan: typeof MEMBERSHIP_PLANS[0]) {
    if (plan.id === currentTier) {
      toast.info(`You are already subscribed to the ${plan.name} plan.`);
      return;
    }
    if (plan.price === 0) {
      toast.info("Your active premium membership plan will revert to the Hobby plan upon expiry.");
      return;
    }
    setUpgradeTarget(plan);
    setIsUpgrading(true);
  }

  async function confirmUpgrade() {
    if (!upgradeTarget) return;
    setIsUpgrading(false);
    setIsProcessingPayment(true);

    try {
      const checkoutRes = await fetch("/api/editor/membership/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: upgradeTarget.id }),
      });

      if (!checkoutRes.ok) {
        const errData = await checkoutRes.json().catch(() => ({}));
        toast.error(errData.error ?? "Failed to initiate payment. Please try again.");
        setIsProcessingPayment(false);
        return;
      }

      const { orderId, amount, currency, key } = await checkoutRes.json();

      const scriptLoaded = await loadRazorpay();
      if (!scriptLoaded) {
        toast.error("Failed to load Razorpay SDK. Please refresh the page and try again.");
        setIsProcessingPayment(false);
        return;
      }

      const options = {
        key,
        amount,
        currency,
        name: "EditBridge",
        description: `Upgrade to ${upgradeTarget.name} Tier`,
        order_id: orderId,
        theme: { color: upgradeTarget.accent },
        modal: {
          ondismiss: () => {
            setIsProcessingPayment(false);
            toast.info("Payment cancelled.");
          },
          backdropclose: false,
          escape: false,
        },
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch("/api/editor/membership/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });

            if (!verifyRes.ok) {
              const errData = await verifyRes.json().catch(() => ({}));
              toast.error(errData.error ?? "Payment verification failed. Please contact support.");
              return;
            }

            const verifyData = await verifyRes.json();
            toast.success(`Success! Upgraded to ${upgradeTarget.name} plan.`);
            setCurrentTier(verifyData.tier);
            setExpiresAt(verifyData.expiresAt);
            setUpgradeTarget(null);
          } catch (err) {
            console.error("Verification failed:", err);
            toast.error("An error occurred during verification. Please contact support.");
          } finally {
            setIsProcessingPayment(false);
          }
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Upgrade error:", err);
      toast.error("Something went wrong during checkout.");
      setIsProcessingPayment(false);
    }
  }

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[11px] font-black uppercase tracking-wider mb-3">
            Membership Portal
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-2">Level Up Your Earnings</h1>
          <p className="text-gray-500 text-sm">Select a premium membership tier to reduce commissions and stand out to clients.</p>
        </div>

        {/* Current Tier Widget */}
        <div className="rounded-2xl p-4 border border-gray-200 bg-white shadow-sm flex items-center gap-4 shrink-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" 
               style={{ background: `${activePlanDetails.accent}10`, border: `1px solid ${activePlanDetails.accent}20` }}>
            <Award className="w-5 h-5" style={{ color: activePlanDetails.accent }} />
          </div>
          <div>
            <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest leading-none">Your Current Tier</p>
            <p className="text-gray-950 font-extrabold text-base mt-1">{activePlanDetails.name}</p>
            <div className="flex flex-col gap-0.5 mt-0.5">
              <span className="text-[10px] text-gray-500 leading-none">{activePlanDetails.commission}% commission fee</span>
              {expiresAt && (
                <span className="text-[9px] text-gray-400 leading-none mt-1">
                  Active until {new Date(expiresAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Plans */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
        {MEMBERSHIP_PLANS.map((plan) => {
          const isCurrent = plan.id === currentTier;

          return (
            <div
              key={plan.name}
              className={cn(
                "relative rounded-3xl p-6 flex flex-col justify-between border transition-all duration-300 bg-white",
                plan.isPopular
                  ? "border-indigo-500 shadow-md ring-2 ring-indigo-500/5 scale-[1.02]"
                  : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
              )}
            >
              {plan.isPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-md">
                  Most Popular
                </span>
              )}

              <div className="space-y-5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full"
                        style={{ color: plan.accent, background: `${plan.accent}10` }}>
                    {plan.name}
                  </span>
                  {isCurrent && (
                    <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Active Plan
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-gray-900">₹{plan.price.toLocaleString("en-IN")}</span>
                    <span className="text-xs text-gray-400 font-semibold">/mo</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed mt-2 font-medium">{plan.tagline}</p>
                </div>

                <div className="border-t border-gray-100 my-1" />

                <div className="py-2.5 px-3 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Commission</span>
                  <span className="text-xs font-black text-emerald-600">
                    {plan.commission}% cut
                  </span>
                </div>

                <div className="space-y-3">
                  {plan.features.map((feat) => (
                    <div key={feat} className="flex items-start gap-2.5 text-xs text-gray-600">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="leading-normal font-medium">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-gray-100">
                <button 
                  onClick={() => handleUpgradeClick(plan)}
                  className={cn(
                    "w-full text-center py-3 rounded-2xl text-xs font-bold transition-all shadow-sm text-white flex items-center justify-center gap-2",
                    (isCurrent || isProcessingPayment)
                      ? "bg-gray-100 text-gray-400 cursor-default shadow-none border border-gray-200"
                      : "hover:shadow-md hover:opacity-90"
                  )}
                  style={!(isCurrent || isProcessingPayment) ? { backgroundColor: plan.accent } : undefined}
                  disabled={isCurrent || isProcessingPayment}
                >
                  {isProcessingPayment && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isCurrent ? "Current Plan" : plan.price === 0 ? "Downgrade to Hobby" : `Upgrade to ${plan.name}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info FAQ Alert */}
      <div className="rounded-2xl p-5 border border-indigo-50 bg-indigo-50/30 flex gap-4">
        <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
        <div className="space-y-1.5">
          <h4 className="text-indigo-900 font-bold text-sm">How upgrades and billing work</h4>
          <p className="text-xs text-indigo-700/80 leading-relaxed">
            When upgrading, your lower commission term becomes active immediately for all new orders. Platform subscriptions are billed monthly on your renewal date.
            You can downgrade or cancel at any time, which reverts your commission cut to the Hobby tier (15%) at the end of your billing cycle.
          </p>
        </div>
      </div>

      {/* Upgrade Dialog Modal */}
      <AnimatePresence>
        {isUpgrading && upgradeTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUpgrading(false)}
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl space-y-6"
            >
              <div>
                <h3 className="text-gray-900 font-black text-xl tracking-tight">Confirm Subscription Upgrade</h3>
                <p className="text-gray-500 text-xs mt-1.5 leading-relaxed">
                  You are subscribing to the <strong className="text-gray-900">{upgradeTarget.name}</strong> membership tier.
                </p>
              </div>

              <div className="rounded-2xl p-4 bg-gray-50 border border-gray-100 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Subscription Price:</span>
                  <span className="text-gray-900 font-bold">₹{upgradeTarget.price} / month</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">New Commission Rate:</span>
                  <span className="text-emerald-600 font-bold">{upgradeTarget.commission}% cut</span>
                </div>
                <div className="h-px bg-gray-200 my-1" />
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-gray-700">Due Today:</span>
                  <span className="text-gray-900">₹{upgradeTarget.price}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button 
                  onClick={() => setIsUpgrading(false)}
                  className="flex-1 text-center py-3 rounded-2xl text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmUpgrade}
                  className="flex-1 text-center py-3 rounded-2xl text-xs font-bold text-white shadow-lg transition-all hover:opacity-90"
                  style={{ backgroundColor: upgradeTarget.accent }}
                >
                  Proceed & Pay
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

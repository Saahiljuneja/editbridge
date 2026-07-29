"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { CheckCircle, Lock, Star } from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

const DURATIONS = [
  { days: 7 as const, price: 99900, label: "7 days" },
  { days: 14 as const, price: 179900, label: "14 days", recommended: true },
  { days: 30 as const, price: 299900, label: "30 days" },
];

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

interface FeaturedPurchaseProps {
  isCurrentlyFeatured: boolean;
  daysRemaining: number;
  featuredUntil: string | null;
  featureEnabled: boolean;
}

export function FeaturedPurchase({ isCurrentlyFeatured, daysRemaining, featuredUntil, featureEnabled }: FeaturedPurchaseProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [selected, setSelected] = useState<7 | 14 | 30>(14);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRazorpay();
  }, []);

  async function handlePurchase() {
    setLoading(true);
    try {
      const initRes = await fetch("/api/editor/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationDays: selected }),
      });

      if (!initRes.ok) {
        const err = await initRes.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to start payment.");
        setLoading(false);
        return;
      }

      const { razorpayOrderId, key, amount } = await initRes.json();

      const loaded = await loadRazorpay();
      if (!loaded) {
        toast.error("Failed to load payment gateway. Please refresh and try again.");
        setLoading(false);
        return;
      }

      const options: Record<string, unknown> = {
        key,
        amount,
        currency: "INR",
        name: "EditBridge",
        description: `Featured placement — ${selected} days`,
        order_id: razorpayOrderId,
        prefill: { name: session?.user?.name ?? "", email: session?.user?.email ?? "" },
        theme: { color: "var(--brand-client)" },
        modal: { ondismiss: () => setLoading(false), backdropclose: false, escape: false, animation: false },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            const verifyRes = await fetch("/api/editor/featured", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                durationDays: selected,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });

            if (!verifyRes.ok) {
              const err = await verifyRes.json().catch(() => ({}));
              toast.error(err.error ?? "Payment verification failed. Contact support.");
              setLoading(false);
              return;
            }

            toast.success("You're featured! Your listing now appears at the top of search results.");
            router.refresh();
          } catch {
            toast.error("Something went wrong during verification. Contact support.");
            setLoading(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch {
      toast.error("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  if (isCurrentlyFeatured) {
    return (
      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-white border border-amber-200 flex items-center justify-center shrink-0">
          <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-900 text-sm">You&apos;re currently featured</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining — expires {featuredUntil ? formatDate(featuredUntil) : ""}
          </p>
        </div>
      </div>
    );
  }

  if (!featureEnabled) {
    return (
      <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-5 text-center">
        <p className="font-semibold text-gray-700 text-sm">Featured placement is temporarily unavailable</p>
        <p className="text-xs text-gray-400 mt-1">Check back soon — purchases are paused for now.</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="grid sm:grid-cols-3 gap-3">
        {DURATIONS.map((d) => (
          <button
            key={d.days}
            type="button"
            onClick={() => setSelected(d.days)}
            className={cn(
              "relative rounded-xl border-2 p-4 text-center transition-colors",
              selected === d.days ? "border-[var(--brand-client)] bg-[var(--brand-client)]/5" : "border-gray-200 hover:border-gray-300"
            )}
          >
            {d.recommended && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--brand-client)] text-white">
                Best value
              </span>
            )}
            <p className="text-xs text-gray-400 mb-1">{d.label}</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(d.price)}</p>
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={loading}
        onClick={handlePurchase}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-[var(--brand-client)] hover:bg-[var(--brand-client-hover)] transition-colors mt-5",
          loading && "opacity-50 cursor-not-allowed"
        )}
      >
        <Lock className="w-4 h-4" />
        {loading ? "Processing…" : `Pay ${formatCurrency(DURATIONS.find((d) => d.days === selected)!.price)} securely`}
      </button>

      <p className="text-center text-xs text-gray-400 mt-3 flex items-center justify-center gap-1.5">
        <CheckCircle className="w-3.5 h-3.5 text-gray-300" /> Powered by Razorpay
      </p>
    </div>
  );
}

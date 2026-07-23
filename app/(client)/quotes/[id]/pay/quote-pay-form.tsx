"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

const COLOR = "#0EA5E9";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

interface Props {
  quoteId: string;
  totalAmount: number;
  offeredPrice: number;
  processingFee: number;
}

export function QuotePayForm({ quoteId, totalAmount }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    setLoading(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/checkout`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to initiate payment");

      // Load Razorpay script
      await new Promise<void>((resolve, reject) => {
        if (window.Razorpay) { resolve(); return; }
        const s = document.createElement("script");
        s.src = "https://checkout.razorpay.com/v1/checkout.js";
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Failed to load payment gateway"));
        document.body.appendChild(s);
      });

      const rz = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: "INR",
        order_id: data.razorpayOrderId,
        name: "EditBridge",
        description: "Custom quote payment",
        handler: async (response: Record<string, string>) => {
          const verifyRes = await fetch(`/api/quotes/${quoteId}/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              creditApplied: data.creditApplied ?? 0,
            }),
          });
          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) {
            toast.error(verifyData.error ?? "Payment verification failed");
            return;
          }
          toast.success("Payment successful! Your order is now active.");
          router.push(`/orders/${verifyData.orderId}`);
        },
        prefill: {},
        theme: { color: COLOR },
      });
      rz.open();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handlePay}
      disabled={loading}
      className="w-full py-3.5 rounded-xl font-semibold text-white text-sm disabled:opacity-60 transition-opacity"
      style={{ background: COLOR }}>
      {loading ? "Processing..." : `Pay ${formatCurrency(totalAmount)} & Start Order`}
    </button>
  );
}

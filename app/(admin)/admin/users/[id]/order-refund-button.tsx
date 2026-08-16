"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Undo2 } from "lucide-react";

export function OrderRefundButton({
  orderId,
  onSuccess,
}: {
  orderId: string;
  onSuccess?: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleRefund() {
    if (
      !confirm(
        "Are you sure you want to cancel and refund this order? This will:\n1. Mark the order as Cancelled\n2. Refund the credits + cash back to the client's wallet as credits\n3. Delete any pending payouts for the editor."
      )
    )
      return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to refund order");
        return;
      }
      toast.success("Order refunded and cancelled successfully.");
      if (onSuccess) onSuccess();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      disabled={loading}
      onClick={handleRefund}
      title="Refund Order"
      className="p-1 rounded bg-red-50 text-red-650 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50 flex items-center justify-center cursor-pointer"
    >
      <Undo2 className="w-3.5 h-3.5" />
    </button>
  );
}

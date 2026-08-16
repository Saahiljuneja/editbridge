"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Ticket, Save, Trash2, Gift } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";

type CouponItem = {
  id: string;
  code: string;
  discountPct: number;
  maxDiscountAmount: number;
  isUsed: boolean;
  expiresAt: Date | null;
  createdAt: Date;
};

export function CouponIssuerForm({
  userId,
  coupons: initialCoupons,
}: {
  userId: string;
  coupons: CouponItem[];
}) {
  const router = useRouter();
  const [coupons, setCoupons] = useState<CouponItem[]>(initialCoupons);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [discountPct, setDiscountPct] = useState("10");
  const [maxDiscountInr, setMaxDiscountInr] = useState("500");
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function generateRandomCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let randomStr = "SAVE";
    for (let i = 0; i < 6; i++) {
      randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(randomStr);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !discountPct || !maxDiscountInr) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/coupons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          discountPct,
          maxDiscountAmountInr: maxDiscountInr,
          expiresAt: expiresAt || null,
        }),
      });
      if (res.ok) {
        toast.success("Coupon code generated and assigned successfully!");
        setOpen(false);
        setCode("");
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || "Failed to create coupon.");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this coupon? This will revoke access instantly.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Coupon deleted.");
        setCoupons((prev) => prev.filter((c) => c.id !== id));
      } else {
        toast.error("Failed to delete coupon");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-white p-5 mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm text-gray-900 flex items-center gap-1.5">
          <Ticket className="w-4 h-4 text-violet-500" /> Issued Coupons & Discounts
        </p>
        <button
          onClick={() => setOpen(!open)}
          className="text-xs font-semibold text-[var(--brand-client)] hover:underline cursor-pointer"
        >
          {open ? "Close Issuer" : "Issue New Coupon"}
        </button>
      </div>

      {open && (
        <form onSubmit={handleCreate} className="rounded-lg border border-neutral-100 bg-neutral-50/50 p-4 space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[10px] font-semibold text-gray-500 mb-1">Coupon Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
                placeholder="e.g. SAVINGS50"
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={generateRandomCode}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs text-gray-700 hover:bg-gray-50 transition-colors self-end cursor-pointer"
            >
              Generate
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 mb-1">Discount %</label>
              <input
                type="number"
                value={discountPct}
                onChange={(e) => setDiscountPct(e.target.value)}
                required
                min={1}
                max={100}
                placeholder="e.g. 20"
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-500 mb-1">Max Cap (INR)</label>
              <input
                type="number"
                value={maxDiscountInr}
                onChange={(e) => setMaxDiscountInr(e.target.value)}
                required
                placeholder="e.g. 1000"
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Expiration Date (Optional)</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-750 text-white text-xs font-semibold disabled:opacity-50 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Gift className="w-3.5 h-3.5" /> {submitting ? "Issuing…" : "Issue Coupon"}
          </button>
        </form>
      )}

      {/* Coupons list */}
      <div className="space-y-2">
        {coupons.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No coupons issued to this client yet.</p>
        ) : (
          <div className="space-y-2">
            {coupons.map((c) => (
              <div key={c.id} className="p-3 border border-neutral-100 rounded-xl bg-neutral-50/10 hover:bg-neutral-50/30 transition-colors flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded font-mono">{c.code}</span>
                    <span className="text-[10px] font-bold text-violet-600">{c.discountPct}% OFF (up to ₹{c.maxDiscountAmount / 100})</span>
                  </div>
                  <p className="text-[10px] text-gray-400">
                    {c.isUsed ? (
                      <span className="text-emerald-600 font-semibold">Used</span>
                    ) : c.expiresAt && new Date(c.expiresAt) < new Date() ? (
                      <span className="text-red-500">Expired</span>
                    ) : (
                      <span>Unused · Expires {c.expiresAt ? formatDate(c.expiresAt) : "Never"}</span>
                    )}
                  </p>
                </div>
                <button
                  disabled={deletingId === c.id}
                  onClick={() => handleDelete(c.id)}
                  title="Delete Coupon"
                  className="p-1 rounded bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building, Settings } from "lucide-react";

export function BankDetailsOverrideForm({
  userId,
  initialDetails,
}: {
  userId: string;
  initialDetails: {
    bankAccountName: string | null;
    bankAccountNumber: string | null;
    bankIfsc: string | null;
    panNumber: string | null;
    razorpayAccountId: string | null;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bankAccountName, setBankAccountName] = useState(initialDetails.bankAccountName ?? "");
  const [bankAccountNumber, setBankAccountNumber] = useState(initialDetails.bankAccountNumber ?? "");
  const [bankIfsc, setBankIfsc] = useState(initialDetails.bankIfsc ?? "");
  const [panNumber, setPanNumber] = useState(initialDetails.panNumber ?? "");
  const [razorpayAccountId, setRazorpayAccountId] = useState(initialDetails.razorpayAccountId ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/bank-details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankAccountName,
          bankAccountNumber,
          bankIfsc,
          panNumber,
          razorpayAccountId,
        }),
      });
      if (!res.ok) {
        toast.error("Failed to update bank details.");
        return;
      }
      toast.success("Bank and payout credentials overridden successfully.");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <Building className="w-4 h-4 text-violet-500" /> Override Payout Details
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-violet-100 bg-violet-50 p-5 space-y-4 w-full">
      <p className="font-semibold text-sm text-gray-900 flex items-center gap-1.5">
        <Settings className="w-4 h-4 text-violet-500" /> Payout / Bank Account Override
      </p>
      <p className="text-xs text-gray-500">DANGER: Manually overwriting these details will change where payouts are sent. Double-check all inputs.</p>
      
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-750 mb-1">Account Holder Name</label>
          <input
            type="text"
            value={bankAccountName}
            onChange={(e) => setBankAccountName(e.target.value)}
            placeholder="e.g. John Doe"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-750 mb-1">Bank Account Number</label>
          <input
            type="text"
            value={bankAccountNumber}
            onChange={(e) => setBankAccountNumber(e.target.value)}
            placeholder="Enter bank account number"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-750 mb-1">IFSC Code</label>
          <input
            type="text"
            value={bankIfsc}
            onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
            placeholder="e.g. HDFC0000123"
            maxLength={11}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-750 mb-1">PAN Number</label>
          <input
            type="text"
            value={panNumber}
            onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
            placeholder="e.g. ABCDE1234F"
            maxLength={10}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-gray-750 mb-1">Razorpay Route Account ID</label>
          <input
            type="text"
            value={razorpayAccountId}
            onChange={(e) => setRazorpayAccountId(e.target.value)}
            placeholder="e.g. acc_xxxxxxxxxxxxxx"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors cursor-pointer"
        >
          {submitting ? "Saving Overrides…" : "Apply Bank Overrides"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-650 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

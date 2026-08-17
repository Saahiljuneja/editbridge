"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  bankAccountName: string | null;
  bankAccountLastFour: string | null;
  bankIfsc: string | null;
}

export function BankAccountSection({ bankAccountName, bankAccountLastFour, bankIfsc }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [accountName, setAccountName] = useState(bankAccountName ?? "");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState(bankIfsc ?? "");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const isLinked = !!(bankAccountName && bankAccountLastFour && bankIfsc);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/editor/bank-account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountName, accountNumber, ifsc: ifsc.toUpperCase() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const firstError = Object.values(err.error ?? {})[0] as string[] | undefined;
        toast.error(firstError?.[0] ?? "Failed to save bank account.");
        return;
      }
      toast.success("Bank account saved.");
      setEditing(false);
      setAccountNumber("");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      const res = await fetch("/api/editor/bank-account", { method: "DELETE" });
      if (!res.ok) {
        toast.error("Failed to remove bank account.");
        return;
      }
      toast.success("Bank account removed.");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setRemoving(false);
      setConfirmingRemove(false);
    }
  }

  if (editing) {
    return (
      <div className="rounded-2xl border border-[#0EA5E9]/20 bg-white p-5">
        <p className="text-sm font-semibold text-gray-900 mb-4">
          {isLinked ? "Update bank account" : "Link bank account"}
        </p>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Account holder name</label>
            <input
              type="text"
              value={accountName}
              onChange={e => setAccountName(e.target.value)}
              placeholder="As per bank records"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Account number</label>
            <input
              type="text"
              value={accountNumber}
              onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ""))}
              placeholder={isLinked ? "Re-enter account number to update" : "9–18 digit account number"}
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">IFSC code</label>
            <input
              type="text"
              value={ifsc}
              onChange={e => setIfsc(e.target.value.toUpperCase())}
              placeholder="e.g. SBIN0001234"
              maxLength={11}
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30"
              required
            />
          </div>
          <p className="text-xs text-gray-400">
            Your account details are stored securely and used only for payout transfers via Razorpay.
          </p>
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className={cn(
                "px-5 py-2 rounded-xl text-sm font-semibold text-white bg-[#0EA5E9] hover:bg-sky-600 transition-colors",
                saving && "opacity-60 cursor-not-allowed"
              )}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setAccountNumber(""); }}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (confirmingRemove) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-900">Remove bank account?</p>
            <p className="text-xs text-red-700 mt-1">Payouts will be paused until a new account is linked.</p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleRemove}
                disabled={removing}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors",
                  removing && "opacity-60 cursor-not-allowed"
                )}
              >
                {removing ? "Removing…" : "Yes, remove"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingRemove(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLinked) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-green-900">Bank account linked</p>
              <p className="text-xs text-green-700 mt-0.5">{bankAccountName}</p>
              <p className="text-xs text-green-700 font-mono mt-0.5">
                ••••{bankAccountLastFour} · {bankIfsc}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => { setAccountName(bankAccountName ?? ""); setAccountNumber(""); setIfsc(bankIfsc ?? ""); setEditing(true); }}
              className="p-1.5 rounded-lg hover:bg-green-100 transition-colors"
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5 text-green-600" />
            </button>
            <button
              onClick={() => setConfirmingRemove(true)}
              className="p-1.5 rounded-lg hover:bg-red-100 transition-colors"
              title="Remove"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
            </button>
          </div>
        </div>
        <p className="text-xs text-green-700 mt-3">
          Payouts will be initiated to this account 7 days after order completion via Razorpay.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-4">
      <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
        <Building2 className="w-4 h-4 text-amber-600" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-amber-900">No bank account linked</p>
        <p className="text-xs text-amber-700 mt-1 leading-relaxed">
          Link your bank account to receive payouts. Payments are initiated 7 days after the client approves your delivery.
        </p>
        <button
          onClick={() => setEditing(true)}
          className="mt-3 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 transition-colors"
        >
          Link bank account
        </button>
      </div>
    </div>
  );
}

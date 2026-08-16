"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Users, Save, Link2 } from "lucide-react";
import { useRouter } from "next/navigation";

type ReferrerInfo = {
  id: string;
  name: string | null;
  email: string;
};

type RefereeInfo = {
  id: string;
  name: string | null;
  email: string;
  creditAwarded: number;
  rewardedAt: Date | null;
  createdAt: Date;
};

export function ReferralAdjusterForm({
  userId,
  referrer,
  referees,
}: {
  userId: string;
  referrer: ReferrerInfo | null;
  referees: RefereeInfo[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [referrerId, setReferrerId] = useState(referrer?.id ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/referral`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referrerId: referrerId || null }),
      });
      if (res.ok) {
        toast.success("Referrer relationship updated successfully.");
        setOpen(false);
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || "Failed to update referrer.");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-white p-5 mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm text-gray-900 flex items-center gap-1.5">
          <Users className="w-4 h-4 text-violet-500" /> Referrals & Invite Tree
        </p>
        <button
          onClick={() => setOpen(!open)}
          className="text-xs font-semibold text-[var(--brand-client)] hover:underline cursor-pointer"
        >
          {open ? "Close Editor" : "Adjust Referrer"}
        </button>
      </div>

      {referrer && (
        <div className="text-xs text-gray-700 bg-neutral-50 p-3 rounded-lg border border-neutral-100 flex items-center gap-1.5">
          <Link2 className="w-4 h-4 text-gray-400" />
          <span>Referred By: <span className="font-bold">{referrer.name || referrer.email}</span> ({referrer.email})</span>
        </div>
      )}

      {open && (
        <form onSubmit={handleUpdate} className="rounded-lg border border-neutral-100 bg-neutral-50/50 p-4 space-y-3">
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Referrer User ID (leave blank to clear)</label>
            <input
              type="text"
              value={referrerId}
              onChange={(e) => setReferrerId(e.target.value)}
              placeholder="Enter User UUID"
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-750 text-white text-xs font-semibold disabled:opacity-50 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" /> {submitting ? "Saving…" : "Save Referrer Link"}
          </button>
        </form>
      )}

      {/* Invited List */}
      <div>
        <p className="text-xs font-bold text-gray-700 mb-2">Invited Users ({referees.length})</p>
        {referees.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Has not referred anyone yet.</p>
        ) : (
          <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50 bg-white">
            {referees.map((ref) => (
              <div key={ref.id} className="p-2.5 text-xs flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-900">{ref.name || ref.email}</p>
                  <p className="text-[10px] text-gray-400">Joined {new Date(ref.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  {ref.rewardedAt ? (
                    <span className="text-[10px] text-emerald-600 font-bold">Reward Credited: ₹{ref.creditAwarded / 100}</span>
                  ) : (
                    <span className="text-[10px] text-gray-400">No order placed yet</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

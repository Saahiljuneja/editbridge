"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Save, Percent, AlertTriangle } from "lucide-react";

interface Field {
  key: string;
  label: string;
  sub: string;
  unit: string;
  type: "pct" | "paise" | "days" | "number";
}

const FIELDS: Field[] = [
  { key: "commission_rate_pct",     label: "Platform Commission",     sub: "Percentage taken from each completed order",                   unit: "%",      type: "pct" },
  { key: "tds_rate_pct",            label: "TDS Rate",                sub: "Tax Deducted at Source (Section 194J). 0, 10, or 20%",         unit: "%",      type: "pct" },
  { key: "featured_listing_price",  label: "Featured Listing Price",  sub: "One-time fee for editors to feature a package (in paise)",     unit: "paise",  type: "paise" },
  { key: "referral_credit_amount",  label: "Referral Credit Amount",  sub: "Credit awarded when a referred user places their first order", unit: "paise",  type: "paise" },
  { key: "min_payout_amount",       label: "Minimum Payout",          sub: "Minimum balance required to request a withdrawal",             unit: "paise",  type: "paise" },
  { key: "payout_hold_days",        label: "Payout Hold Period",      sub: "Days after delivery before payout is released to editor",      unit: "days",   type: "days" },
];

export function CommissionClient({ settings: initial }: { settings: Record<string, string> }) {
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);

  function set(key: string, value: string) {
    setSettings(s => ({ ...s, [key]: value }));
  }

  function display(f: Field) {
    const raw = settings[f.key] ?? "";
    if (f.type === "paise") return `â‚¹${(Number(raw) / 100).toFixed(2)}`;
    if (f.type === "pct") return `${raw}%`;
    if (f.type === "days") return `${raw} days`;
    return raw;
  }

  async function save() {
    const commPct = Number(settings.commission_rate_pct);
    if (commPct < 0 || commPct > 50) { toast.error("Commission must be 0â€“50%"); return; }
    const tdsPct = Number(settings.tds_rate_pct);
    if (![0, 10, 20].includes(tdsPct)) { toast.error("TDS must be 0, 10, or 20%"); return; }

    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (res.ok) toast.success("Fee settings saved");
    else toast.error("Failed to save");
    setSaving(false);
  }

  return (
    <div className="px-8 py-6 space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Commission & Fee Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Adjust platform fee percentages, payout rules, and credit amounts. Changes apply to new orders only.
          </p>
        </div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-50">
          <Save className="w-4 h-4" />
          {saving ? "Savingâ€¦" : "Save changes"}
        </button>
      </div>

      <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 flex gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          Commission and TDS changes only apply to <strong>future orders</strong>. Existing payouts are not recalculated.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {FIELDS.map(f => (
            <div key={f.key} className="flex items-center gap-6 px-6 py-5">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{f.label}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{f.sub}</p>
                <p className="text-xs text-emerald-600 font-semibold mt-1">Currently: {display(f)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="number"
                  value={settings[f.key] ?? ""}
                  onChange={e => set(f.key, e.target.value)}
                  min={0}
                  step={f.type === "pct" ? 1 : 100}
                  className="w-28 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:bg-gray-800 dark:text-white"
                />
                <span className="text-xs text-gray-400 dark:text-gray-500 w-10">{f.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-6">
        <p className="font-semibold text-gray-900 dark:text-white text-sm mb-2">Per-editor overrides</p>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Custom commission rates for individual editors can be set on the editor&apos;s profile page under{" "}
          <a href="/admin/users?role=editor" className="text-[#0EA5E9] hover:underline font-medium">Users â†’ Editors</a>.
          The override there takes precedence over this global rate.
        </p>
      </div>
    </div>
  );
}

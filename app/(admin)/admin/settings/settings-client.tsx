"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, AlertTriangle } from "lucide-react";

type Settings = Record<string, string>;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <p className="font-semibold text-gray-900 text-sm">{title}</p>
      </div>
      <div className="p-6 space-y-5">{children}</div>
    </div>
  );
}

function Field({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <div className="shrink-0 w-56">{children}</div>
    </div>
  );
}

export function SettingsClient({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>(initial);
  const [saving, setSaving] = useState(false);

  function set(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) { toast.success("Settings saved."); router.refresh(); }
      else toast.error("Failed to save.");
    } catch { toast.error("Something went wrong."); }
    finally { setSaving(false); }
  }

  const isMaintenance = settings.maintenance_mode === "true";
  const hasWindow = !!(settings.maintenance_start && settings.maintenance_end);

  return (
    <div className="px-8 py-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure global platform behaviour.</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0EA5E9] text-white text-sm font-medium hover:bg-[#3d34a0] disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? "Savingâ€¦" : "Save changes"}
        </button>
      </div>

      {(isMaintenance || hasWindow) && (
        <div className="flex items-start gap-3 rounded-2xl bg-red-50 border border-red-100 px-5 py-4">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            {isMaintenance && (
              <p className="text-sm text-red-800 font-medium">Manual maintenance is ON â€” the platform is inaccessible to all users.</p>
            )}
            {hasWindow && (
              <p className="text-sm text-red-800 font-medium">
                Scheduled window active: {settings.maintenance_start} &ndash; {settings.maintenance_end} IST daily.
              </p>
            )}
            <p className="text-xs text-red-500">Admins are not affected and can always access the platform.</p>
          </div>
        </div>
      )}

      <Section title="Platform">
        <Field label="Platform name" sub="Shown in emails and pages">
          <input value={settings.platform_name ?? ""} onChange={e => set("platform_name", e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30" />
        </Field>
        <Field label="Support email" sub="Shown to users for help">
          <input type="email" value={settings.support_email ?? ""} onChange={e => set("support_email", e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30" />
        </Field>
      </Section>

      <Section title="Maintenance">
        <Field label="Manual maintenance" sub="Force maintenance ON for all users right now">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => set("maintenance_mode", isMaintenance ? "false" : "true")}
              className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${isMaintenance ? "bg-red-500" : "bg-gray-200"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isMaintenance ? "translate-x-5" : "translate-x-0"}`} />
            </div>
            <span className={`text-sm font-medium ${isMaintenance ? "text-red-600" : "text-gray-400"}`}>
              {isMaintenance ? "ON" : "OFF"}
            </span>
          </label>
        </Field>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-900">Scheduled window</p>
            <p className="text-xs text-gray-400 mt-0.5">Platform auto-enters maintenance between these times daily (IST)</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-500">Start time</p>
              <input
                type="time"
                value={settings.maintenance_start ?? ""}
                onChange={e => set("maintenance_start", e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30 bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-500">End time</p>
              <input
                type="time"
                value={settings.maintenance_end ?? ""}
                onChange={e => set("maintenance_end", e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30 bg-white"
              />
            </div>
          </div>
          {settings.maintenance_start && settings.maintenance_end ? (
            <div className="flex items-center justify-between rounded-xl bg-amber-50 border border-amber-100 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <p className="text-xs text-amber-700 font-medium">
                  Active daily {settings.maintenance_start} â€“ {settings.maintenance_end} IST
                </p>
              </div>
              <button
                type="button"
                onClick={() => { set("maintenance_start", ""); set("maintenance_end", ""); }}
                className="text-xs text-amber-600 hover:text-amber-800 font-medium transition-colors"
              >
                Clear
              </button>
            </div>
          ) : (
            <p className="text-xs text-gray-400">Leave both blank to disable scheduled maintenance.</p>
          )}
        </div>
      </Section>

      <Section title="Commission & Fees">
        <Field label="Editor commission (%)" sub="Deducted from editor payout on every completed order">
          <div className="flex items-center gap-2">
            <input type="number" min="0" max="100" value={settings.commission_rate_pct ?? "15"}
              onChange={e => set("commission_rate_pct", e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30" />
            <span className="text-gray-400 text-sm shrink-0">%</span>
          </div>
        </Field>
        <Field label="Client processing fee (%)" sub="Charged to client on top of the package price at checkout">
          <div className="flex items-center gap-2">
            <input type="number" min="0" max="100" value={settings.processing_fee_pct ?? "4"}
              onChange={e => set("processing_fee_pct", e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30" />
            <span className="text-gray-400 text-sm shrink-0">%</span>
          </div>
        </Field>
      </Section>

      <Section title="Orders & Revisions">
        <Field label="Min revisions" sub="Minimum revisions editors must include per package">
          <input type="number" min="0" value={settings.min_revisions ?? "0"}
            onChange={e => set("min_revisions", e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30" />
        </Field>
        <Field label="Max revisions" sub="Maximum revisions editors can offer per package">
          <input type="number" min="0" value={settings.max_revisions ?? "3"}
            onChange={e => set("max_revisions", e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30" />
        </Field>
        <Field label="Max delivery days" sub="Maximum a package can offer">
          <input type="number" min="1" value={settings.max_delivery_days ?? "30"}
            onChange={e => set("max_delivery_days", e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30" />
        </Field>
      </Section>

      <Section title="File Uploads">
        <Field label="Allowed file types" sub="Comma-separated extensions">
          <input value={settings.allowed_file_types ?? ""}
            onChange={e => set("allowed_file_types", e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30" />
        </Field>
        <Field label="Max file size (MB)" sub="Per upload">
          <div className="flex items-center gap-2">
            <input type="number" min="1" value={settings.max_file_size_mb ?? "500"}
              onChange={e => set("max_file_size_mb", e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30" />
            <span className="text-gray-400 text-sm shrink-0">MB</span>
          </div>
        </Field>
      </Section>
    </div>
  );
}

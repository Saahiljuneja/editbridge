"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ToggleLeft } from "lucide-react";

type Flag = {
  key: string;
  label: string;
  description: string;
  portal: string;
  enabled: boolean;
};

const PORTAL_LABELS: Record<string, string> = {
  client: "Client portal",
  editor: "Editor portal",
  admin: "Admin portal",
  public: "Public site",
  all: "All portals",
};

export function FeatureFlagsClient({ initial }: { initial: Flag[] }) {
  const [flags, setFlags] = useState(initial);
  const [pending, setPending] = useState<string | null>(null);

  async function toggle(key: string, enabled: boolean) {
    setPending(key);
    setFlags((prev) => prev.map((f) => (f.key === key ? { ...f, enabled } : f)));
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, enabled }),
      });
      if (!res.ok) throw new Error();
      toast.success(enabled ? `${key} enabled.` : `${key} disabled.`);
    } catch {
      setFlags((prev) => prev.map((f) => (f.key === key ? { ...f, enabled: !enabled } : f)));
      toast.error("Failed to update flag.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="px-8 py-6 ">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Feature Flags</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Kill switches for features shipped after this page â€” turning one off takes effect immediately, platform-wide.
        </p>
      </div>

      {flags.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400">
          No flagged features yet.
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm divide-y divide-gray-50">
          {flags.map((flag) => (
            <div key={flag.key} className="flex items-start justify-between gap-6 px-6 py-5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 text-sm">{flag.label}</p>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
                    {PORTAL_LABELS[flag.portal] ?? flag.portal}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{flag.description}</p>
              </div>
              <label className="flex items-center gap-3 cursor-pointer shrink-0">
                <div
                  onClick={() => pending === null && toggle(flag.key, !flag.enabled)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    flag.enabled ? "bg-green-500" : "bg-gray-200"
                  } ${pending === flag.key ? "opacity-50" : ""}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      flag.enabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </div>
                <span className={`text-xs font-semibold w-6 ${flag.enabled ? "text-green-600" : "text-gray-400"}`}>
                  {flag.enabled ? "ON" : "OFF"}
                </span>
              </label>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2.5 mt-6 text-xs text-gray-400">
        <ToggleLeft className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          New flags appear here automatically as they&apos;re registered in code â€” no migration needed to add one.
        </p>
      </div>
    </div>
  );
}

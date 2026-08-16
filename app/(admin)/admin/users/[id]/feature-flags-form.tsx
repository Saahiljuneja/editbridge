"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sliders, MessageSquare, ShieldAlert, Upload } from "lucide-react";

type FlagStatus = {
  key: string;
  label: string;
  description: string;
  icon: typeof MessageSquare;
  enabled: boolean;
};

export function FeatureFlagsForm({
  userId,
  initialFlags,
}: {
  userId: string;
  initialFlags: { featureKey: string; enabled: boolean }[];
}) {
  const flagsConfig = [
    {
      key: "direct_chat",
      label: "Direct Chat Access",
      description: "Allows the user to message platform editors or clients directly without moderation holds.",
      icon: MessageSquare,
    },
    {
      key: "high_priority_support",
      label: "High-Priority Support",
      description: "Tags their support tickets as high priority automatically and moves them to the front of support queues.",
      icon: ShieldAlert,
    },
    {
      key: "beta_upload",
      label: "Beta Upload Engine",
      description: "Enables multi-threaded chunked S3 uploads for super-fast large file transfers.",
      icon: Upload,
    },
  ];

  const [flags, setFlags] = useState<FlagStatus[]>(
    flagsConfig.map((c) => {
      const match = initialFlags.find((f) => f.featureKey === c.key);
      return {
        ...c,
        enabled: match ? match.enabled : false, // defaults to disabled/false
      };
    })
  );
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  async function handleToggle(key: string, currentlyEnabled: boolean) {
    setLoadingKey(key);
    try {
      const nextEnabled = !currentlyEnabled;
      const res = await fetch(`/api/admin/users/${userId}/feature-flags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureKey: key, enabled: nextEnabled }),
      });
      if (!res.ok) {
        toast.error("Failed to update feature flag override");
        return;
      }
      setFlags((prev) =>
        prev.map((f) => (f.key === key ? { ...f, enabled: nextEnabled } : f))
      );
      toast.success(`Feature override updated successfully.`);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoadingKey(null);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4 w-full">
      <p className="font-semibold text-sm text-gray-900 flex items-center gap-2">
        <Sliders className="w-4 h-4 text-violet-500" /> Platform Feature Flags
      </p>
      <p className="text-xs text-gray-500">Configure client-specific feature overrides and privileges below.</p>
      
      <div className="space-y-3">
        {flags.map((flag) => {
          const Icon = flag.icon;
          return (
            <div key={flag.key} className="flex items-start justify-between gap-4 p-3 border border-neutral-100 rounded-xl hover:bg-neutral-50/20 transition-colors">
              <div className="flex gap-2.5">
                <div className={`p-2 rounded-lg shrink-0 ${flag.enabled ? "bg-violet-50 text-violet-600" : "bg-neutral-50 text-neutral-400"}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">{flag.label}</p>
                  <p className="text-[10px] text-gray-400 leading-normal mt-0.5">{flag.description}</p>
                </div>
              </div>
              <button
                disabled={loadingKey === flag.key}
                onClick={() => handleToggle(flag.key, flag.enabled)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  flag.enabled ? "bg-violet-605" : "bg-gray-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    flag.enabled ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

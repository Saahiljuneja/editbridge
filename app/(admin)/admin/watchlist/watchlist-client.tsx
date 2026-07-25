"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface FlaggedEditor {
  editorId: string;
  userId: string;
  name: string | null;
  email: string | null;
  kycStatus: string;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  disputeCount: number;
  completionRate: number;
  flags: string[];
}

interface Thresholds {
  MIN_ORDERS: number;
  MAX_COMPLETION_RATE: number;
  MAX_CANCELLATIONS: number;
  MAX_DISPUTES: number;
}

export function WatchlistClient() {
  const [editors, setEditors] = useState<FlaggedEditor[]>([]);
  const [thresholds, setThresholds] = useState<Thresholds | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/editor-watchlist")
      .then((r) => r.json())
      .then((data) => { setEditors(data.flagged ?? []); setThresholds(data.thresholds ?? null); })
      .catch(() => toast.error("Failed to load watch list."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-8 py-6 space-y-5">

      {/* Thresholds info */}
      {thresholds && (
        <div className="rounded-2xl border border-orange-200 dark:border-orange-800/40 bg-orange-50 dark:bg-orange-900/20 px-5 py-3.5">
          <p className="text-sm text-orange-800 dark:text-orange-300 font-medium mb-1">Auto-flag thresholds</p>
          <p className="text-xs text-orange-700 dark:text-orange-400">
            Editors appear here when they have ≥{thresholds.MIN_ORDERS} orders AND meet any of:
            completion rate &lt;{thresholds.MAX_COMPLETION_RATE}% · cancellations ≥{thresholds.MAX_CANCELLATIONS} · disputes ≥{thresholds.MAX_DISPUTES}
          </p>
        </div>
      )}

      {/* Table */}
      <div className="a-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <p className="font-semibold text-gray-900 dark:text-white text-sm">Flagged editors</p>
          <span className="text-xs text-gray-400 dark:text-gray-500">{editors.length} flagged</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500 animate-pulse">Analysing editor performance…</div>
        ) : editors.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-500 dark:text-green-400" />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">All editors are performing well</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">No editors have crossed the flag thresholds.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {editors.map((editor) => (
              <div key={editor.editorId} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0 text-orange-700 dark:text-orange-400 font-bold text-sm">
                  {(editor.name ?? "?").slice(0, 1).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/admin/users/${editor.userId}`}
                      className="font-semibold text-sm text-gray-900 dark:text-white hover:text-[#7C3AED] hover:underline">
                      {editor.name ?? "Unknown"}
                    </Link>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                      editor.kycStatus === "approved" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                    )}>
                      KYC {editor.kycStatus}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{editor.email}</p>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {editor.flags.map((flag) => (
                      <span key={flag} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                        <AlertTriangle className="w-2.5 h-2.5" /> {flag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 shrink-0 text-center">
                  {[
                    { label: "Total", value: editor.totalOrders, color: "text-gray-900 dark:text-white" },
                    { label: "Done", value: editor.completedOrders, color: "text-green-600 dark:text-green-400" },
                    { label: "Cancelled", value: editor.cancelledOrders, color: editor.cancelledOrders >= 3 ? "text-red-600 dark:text-red-400 font-bold" : "text-gray-600 dark:text-gray-300" },
                    { label: "Disputes", value: editor.disputeCount, color: editor.disputeCount >= 2 ? "text-red-600 dark:text-red-400 font-bold" : "text-gray-600 dark:text-gray-300" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="min-w-[48px]">
                      <p className={cn("text-sm font-bold", color)}>{value}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="shrink-0 text-center w-14">
                  <p className={cn("text-lg font-bold",
                    editor.completionRate < 60 ? "text-red-600 dark:text-red-400" : editor.completionRate < 80 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"
                  )}>
                    {editor.completionRate}%
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">done rate</p>
                </div>

                <div className="shrink-0">
                  <Link href={`/admin/users/${editor.userId}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800/40 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors">
                    Review
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

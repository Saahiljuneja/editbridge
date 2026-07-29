"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { MarkPaidButton } from "./mark-paid-button";
import { CheckSquare, Square, CheckCircle2, Download } from "lucide-react";
import { downloadCSV } from "@/lib/csv";

type Payout = {
  id: string;
  netAmount: number;
  commissionAmount: number;
  grossAmount: number;
  status: string;
  createdAt: Date;
  packageTitle: string | null;
  editorName: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  processing: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
};

export function RevenueClient({ payouts }: { payouts: Payout[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);

  const pending = payouts.filter(p => p.status === "pending");

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === pending.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pending.map(p => p.id)));
    }
  }

  async function batchMarkPaid() {
    if (!selected.size) return;
    if (!confirm(`Mark ${selected.size} payout(s) as completed?`)) return;
    setBatchLoading(true);
    try {
      const res = await fetch("/api/admin/payouts/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected], status: "completed" }),
      });
      if (res.ok) {
        const d = await res.json();
        toast.success(`${d.count} payout(s) marked as completed.`);
        setSelected(new Set());
        router.refresh();
      } else toast.error("Failed.");
    } catch { toast.error("Something went wrong."); }
    finally { setBatchLoading(false); }
  }

  function exportCSV() {
    downloadCSV("payouts.csv", payouts.map(p => ({
      ID: p.id,
      Editor: p.editorName ?? "",
      Package: p.packageTitle ?? "",
      "Gross (₹)": (p.grossAmount / 100).toFixed(2),
      "Commission (₹)": (p.commissionAmount / 100).toFixed(2),
      "Net (₹)": (p.netAmount / 100).toFixed(2),
      Status: p.status,
      "Created At": p.createdAt.toISOString(),
    })));
  }

  return (
    <div>
      <div className="flex justify-end mb-2">
        <button onClick={exportCSV}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>
      {pending.length > 0 && (
        <div className="flex items-center gap-3 mb-3">
          <button onClick={toggleAll} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            {selected.size === pending.length && pending.length > 0
              ? <CheckSquare className="w-4 h-4 text-[var(--brand-client)]" />
              : <Square className="w-4 h-4" />}
            {selected.size === pending.length && pending.length > 0 ? "Deselect all" : "Select all pending"}
          </button>
          {selected.size > 0 && (
            <button onClick={batchMarkPaid} disabled={batchLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {batchLoading ? "Processing…" : `Mark ${selected.size} as paid`}
            </button>
          )}
        </div>
      )}

      <div className="a-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <th className="w-8 px-4 py-3" />
              <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Order</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Gross</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Commission</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Net payout</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Date</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Action</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((row) => (
              <tr key={row.id} className={cn("border-b border-gray-50 dark:border-gray-800/50 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors", selected.has(row.id) && "bg-emerald-50/40 dark:bg-emerald-900/10")}>
                <td className="px-4 py-3.5">
                  {row.status === "pending" && (
                    <button onClick={() => toggle(row.id)} className="flex items-center justify-center">
                      {selected.has(row.id)
                        ? <CheckSquare className="w-4 h-4 text-[var(--brand-client)]" />
                        : <Square className="w-4 h-4 text-gray-300 dark:text-gray-600" />}
                    </button>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <p className="font-medium text-gray-900 dark:text-white truncate max-w-[140px]">{row.packageTitle ?? "Custom order"}</p>
                  {row.editorName && <p className="text-xs text-gray-400 dark:text-gray-500">{row.editorName}</p>}
                </td>
                <td className="px-4 py-3.5 text-right tabular-nums text-gray-700 dark:text-gray-200">{formatCurrency(row.grossAmount)}</td>
                <td className="px-4 py-3.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">+{formatCurrency(row.commissionAmount)}</td>
                <td className="px-4 py-3.5 text-right tabular-nums font-medium text-gray-900 dark:text-white">{formatCurrency(row.netAmount)}</td>
                <td className="px-4 py-3.5 text-center">
                  <Badge className={cn("text-xs border-0", STATUS_COLORS[row.status] ?? "bg-gray-100 dark:bg-gray-800")}>
                    {row.status}
                  </Badge>
                </td>
                <td className="px-4 py-3.5 text-right text-gray-400 dark:text-gray-500 text-xs">{formatDate(row.createdAt)}</td>
                <td className="px-4 py-3.5 text-right">
                  {row.status !== "completed" && <MarkPaidButton payoutId={row.id} />}
                </td>
              </tr>
            ))}
            {payouts.length === 0 && (
              <tr><td colSpan={8} className="a-empty">No payouts yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { downloadCSV } from "@/lib/csv";
import { useRouter } from "next/navigation";

interface KycRow {
  id: string;
  editorId: string;
  documentType: string;
  status: string;
  createdAt: Date;
  userName: string | null;
  userEmail: string | null;
}

const STATUS_CONFIG: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export function KycBulkTable({ rows, status }: { rows: KycRow[]; status: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  function toggleAll() {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map(r => r.id)));
  }

  function toggle(id: string) {
    setSelected(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function bulkAction(action: "approve" | "reject") {
    if (!selected.size) return;
    if (!confirm(`${action === "approve" ? "Approve" : "Reject"} ${selected.size} application(s)?`)) return;
    setBulkLoading(true);
    const ids = [...selected];
    const results = await Promise.allSettled(
      ids.map(id =>
        fetch(`/api/admin/kyc/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        })
      )
    );
    const ok = results.filter(r => r.status === "fulfilled" && (r as PromiseFulfilledResult<Response>).value.ok).length;
    toast.success(`${ok} application(s) ${action}d`);
    setSelected(new Set());
    setBulkLoading(false);
    router.refresh();
  }

  function exportCSV() {
    downloadCSV(`kyc-${status}.csv`, rows.map(r => ({
      ID: r.id,
      Name: r.userName ?? "",
      Email: r.userEmail ?? "",
      Document: r.documentType,
      Status: r.status,
      Submitted: r.createdAt.toISOString(),
    })));
  }

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
      {/* Bulk action bar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
        <input type="checkbox" checked={selected.size === rows.length && rows.length > 0}
          onChange={toggleAll} className="rounded border-gray-300" />
        <span className="text-xs text-gray-400 dark:text-gray-500">{selected.size > 0 ? `${selected.size} selected` : "Select all"}</span>
        {selected.size > 0 && status === "pending" && (
          <>
            <button onClick={() => bulkAction("approve")} disabled={bulkLoading}
              className="flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-40">
              {bulkLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
              Approve selected
            </button>
            <button onClick={() => bulkAction("reject")} disabled={bulkLoading}
              className="flex items-center gap-1 text-xs font-semibold bg-red-50 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-40">
              <XCircle className="w-3 h-3" /> Reject selected
            </button>
          </>
        )}
        <div className="ml-auto">
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg hover:border-gray-300 transition-colors">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <th className="w-8 px-5 py-3" />
            <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Editor</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Document</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Submitted</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Waiting</th>
            <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
            <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} className={cn("border-b border-gray-50 dark:border-gray-800/50 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors", selected.has(row.id) && "bg-sky-50/50")}>
              <td className="px-5 py-3.5">
                <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggle(row.id)} className="rounded border-gray-300" />
              </td>
              <td className="px-5 py-3.5">
                <p className="font-medium text-gray-900 dark:text-white">{row.userName ?? "Unknown"}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{row.userEmail}</p>
              </td>
              <td className="px-4 py-3.5 capitalize text-gray-600 dark:text-gray-300">{row.documentType}</td>
              <td className="px-4 py-3.5 text-gray-400 dark:text-gray-500 text-xs">{formatDate(row.createdAt)}</td>
              <td className="px-4 py-3.5">
                {(() => {
                  const days = Math.floor((Date.now() - new Date(row.createdAt).getTime()) / 86400000);
                  return days > 2 ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      {days}d waiting
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-gray-500">{formatRelativeTime(row.createdAt)}</span>
                  );
                })()}
              </td>
              <td className="px-4 py-3.5 text-center">
                <Badge className={cn("text-xs border-0", STATUS_CONFIG[row.status] ?? "bg-gray-100")}>
                  {row.status}
                </Badge>
              </td>
              <td className="px-4 py-3.5 text-right">
                <Link href={`/admin/kyc/${row.id}`} className="text-xs font-semibold text-[var(--brand-client)] hover:underline underline-offset-2">
                  Review →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, Download } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { downloadCSV } from "@/lib/csv";

interface PayoutRow {
  id: string;
  status: string;
  grossAmount: number;
  commissionAmount: number;
  tdsAmount: number;
  netAmount: number;
  createdAt: string;
  scheduledPayoutAt: string | null;
  editorName: string | null;
  editorEmail: string | null;
  packageTitle: string | null;
}

export function PayoutsClient({ rows: initial }: { rows: PayoutRow[] }) {
  const [rows, setRows] = useState(initial);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());

  async function approvePayout(id: string) {
    setLoading(l => ({ ...l, [id]: true }));
    const res = await fetch(`/api/admin/payouts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    if (res.ok) {
      setRows(r => r.filter(p => p.id !== id));
      toast.success("Payout approved");
    } else toast.error("Failed to approve");
    setLoading(l => ({ ...l, [id]: false }));
  }

  async function rejectPayout(id: string) {
    setLoading(l => ({ ...l, [id]: true }));
    const res = await fetch(`/api/admin/payouts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    if (res.ok) {
      setRows(r => r.filter(p => p.id !== id));
      toast.success("Payout rejected");
    } else toast.error("Failed to reject");
    setLoading(l => ({ ...l, [id]: false }));
  }

  async function bulkApprove() {
    if (!selected.size) return;
    const ids = [...selected];
    await Promise.all(ids.map(id => approvePayout(id)));
    setSelected(new Set());
  }

  function toggleAll() {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map(r => r.id)));
  }

  function exportCSV() {
    downloadCSV("payouts-pending.csv", rows.map(r => ({
      ID: r.id,
      Editor: r.editorName ?? "",
      Email: r.editorEmail ?? "",
      Package: r.packageTitle ?? "",
      "Gross (₹)": (r.grossAmount / 100).toFixed(2),
      "Commission (₹)": (r.commissionAmount / 100).toFixed(2),
      "TDS (₹)": (r.tdsAmount / 100).toFixed(2),
      "Net (₹)": (r.netAmount / 100).toFixed(2),
      "Requested At": r.createdAt,
    })));
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <input type="checkbox" checked={selected.size === rows.length && rows.length > 0}
            onChange={toggleAll} className="rounded border-gray-300" />
          <span className="text-sm text-gray-500">{rows.length} pending</span>
          {selected.size > 0 && (
            <button onClick={bulkApprove}
              className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors">
              Approve {selected.size} selected
            </button>
          )}
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      <div className="divide-y divide-gray-50">
        {rows.map(row => (
          <div key={row.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
            <input type="checkbox" checked={selected.has(row.id)}
              onChange={() => setSelected(s => {
                const n = new Set(s);
                n.has(row.id) ? n.delete(row.id) : n.add(row.id);
                return n;
              })}
              className="rounded border-gray-300 shrink-0" />

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{row.editorName ?? "Unknown"}</p>
              <p className="text-xs text-gray-400">{row.editorEmail} · {row.packageTitle ?? "Order"}</p>
            </div>

            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-gray-900">{formatCurrency(row.netAmount)}</p>
              <p className="text-xs text-gray-400">Gross {formatCurrency(row.grossAmount)} · Commission {formatCurrency(row.commissionAmount)}</p>
              {row.tdsAmount > 0 && <p className="text-xs text-amber-600">TDS {formatCurrency(row.tdsAmount)}</p>}
            </div>

            <p className="text-xs text-gray-400 shrink-0 w-20 text-right">{formatDate(new Date(row.createdAt))}</p>

            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => approvePayout(row.id)} disabled={!!loading[row.id]}
                className="flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-40">
                {loading[row.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                Approve
              </button>
              <button onClick={() => rejectPayout(row.id)} disabled={!!loading[row.id]}
                className="flex items-center gap-1 text-xs font-semibold bg-red-50 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-40">
                <XCircle className="w-3 h-3" /> Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

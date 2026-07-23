"use client";

import { useState, useMemo } from "react";
import { Download, CheckCircle, Clock } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { downloadCSV } from "@/lib/csv";

interface ReferralRow {
  id: string;
  creditAwarded: number;
  rewardedAt: string | null;
  createdAt: string;
  hasOrder: boolean;
  referrerName: string | null;
  referrerEmail: string | null;
  refereeName: string | null;
  refereeEmail: string | null;
}

export function ReferralsClient({ rows }: { rows: ReferralRow[] }) {
  const [filter, setFilter] = useState<"all" | "converted" | "pending">("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let r = rows;
    if (filter === "converted") r = r.filter(x => x.hasOrder);
    if (filter === "pending") r = r.filter(x => !x.hasOrder);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(x =>
        (x.referrerName ?? "").toLowerCase().includes(q) ||
        (x.referrerEmail ?? "").toLowerCase().includes(q) ||
        (x.refereeName ?? "").toLowerCase().includes(q) ||
        (x.refereeEmail ?? "").toLowerCase().includes(q)
      );
    }
    return r;
  }, [rows, filter, search]);

  function exportCSV() {
    downloadCSV("referrals.csv", filtered.map(r => ({
      "Referrer Name": r.referrerName ?? "",
      "Referrer Email": r.referrerEmail ?? "",
      "Referee Name": r.refereeName ?? "",
      "Referee Email": r.refereeEmail ?? "",
      "Converted": r.hasOrder ? "Yes" : "No",
      "Credit Awarded (₹)": (r.creditAwarded / 100).toFixed(2),
      "Referred At": r.createdAt,
      "Rewarded At": r.rewardedAt ?? "",
    })));
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="flex-1 min-w-48 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(["all", "converted", "pending"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all capitalize ${filter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
              {f}
            </button>
          ))}
        </div>
        <span className="text-sm text-gray-400">{filtered.length} rows</span>
        <button onClick={exportCSV}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 px-3 py-2 rounded-xl hover:border-gray-300 transition-colors shrink-0">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <th className="text-left px-6 py-3">Referrer</th>
              <th className="text-left px-4 py-3">Referee</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Credit</th>
              <th className="px-4 py-3 text-right">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(r => (
              <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3.5">
                  <p className="font-semibold text-gray-900">{r.referrerName ?? "—"}</p>
                  <p className="text-xs text-gray-400">{r.referrerEmail}</p>
                </td>
                <td className="px-4 py-3.5">
                  <p className="font-semibold text-gray-900">{r.refereeName ?? "—"}</p>
                  <p className="text-xs text-gray-400">{r.refereeEmail}</p>
                </td>
                <td className="px-4 py-3.5 text-center">
                  {r.hasOrder ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
                      <CheckCircle className="w-3 h-3" /> Converted
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">
                      <Clock className="w-3 h-3" /> Pending
                    </span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-right font-semibold text-gray-900">
                  {r.creditAwarded > 0 ? formatCurrency(r.creditAwarded) : "—"}
                </td>
                <td className="px-4 py-3.5 text-right text-xs text-gray-400">
                  {formatDate(new Date(r.createdAt))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">No referrals found.</div>
        )}
      </div>
    </div>
  );
}

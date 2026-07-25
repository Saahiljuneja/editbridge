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
    <div className="a-card overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="flex-1 min-w-48 a-input rounded-xl px-3 py-2" />
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {(["all", "converted", "pending"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all capitalize ${filter === f ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400"}`}>
              {f}
            </button>
          ))}
        </div>
        <span className="text-sm text-gray-400 dark:text-gray-500">{filtered.length} rows</span>
        <button onClick={exportCSV}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl hover:border-gray-300 dark:hover:border-gray-600 transition-colors shrink-0">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              <th className="text-left px-6 py-3">Referrer</th>
              <th className="text-left px-4 py-3">Referee</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Credit</th>
              <th className="px-4 py-3 text-right">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {filtered.map(r => (
              <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                <td className="px-6 py-3.5">
                  <p className="font-semibold text-gray-900 dark:text-white">{r.referrerName ?? "—"}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{r.referrerEmail}</p>
                </td>
                <td className="px-4 py-3.5">
                  <p className="font-semibold text-gray-900 dark:text-white">{r.refereeName ?? "—"}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{r.refereeEmail}</p>
                </td>
                <td className="px-4 py-3.5 text-center">
                  {r.hasOrder ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full">
                      <CheckCircle className="w-3 h-3" /> Converted
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2.5 py-1 rounded-full">
                      <Clock className="w-3 h-3" /> Pending
                    </span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-right font-semibold text-gray-900 dark:text-white">
                  {r.creditAwarded > 0 ? formatCurrency(r.creditAwarded) : "—"}
                </td>
                <td className="px-4 py-3.5 text-right text-xs text-gray-400 dark:text-gray-500">
                  {formatDate(new Date(r.createdAt))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="a-empty">No referrals found.</div>
        )}
      </div>
    </div>
  );
}

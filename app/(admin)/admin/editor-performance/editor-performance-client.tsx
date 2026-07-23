"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowUpDown, ArrowUp, ArrowDown, Download, Star } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { downloadCSV } from "@/lib/csv";

interface EditorRow {
  editorId: string;
  name: string | null;
  email: string | null;
  kycStatus: string;
  totalOrders: number;
  completedOrders: number;
  activeOrders: number;
  totalRevenue: number;
  avgRating: number | null;
  reviewCount: number;
}

type SortKey = keyof EditorRow;

export function EditorPerformanceClient({ rows }: { rows: EditorRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("totalRevenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let r = q ? rows.filter(e =>
      (e.name ?? "").toLowerCase().includes(q) ||
      (e.email ?? "").toLowerCase().includes(q)
    ) : rows;
    r = [...r].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return r;
  }, [rows, search, sortKey, sortDir]);

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ArrowUpDown className="w-3 h-3 text-gray-300" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-gray-700" /> : <ArrowDown className="w-3 h-3 text-gray-700" />;
  }

  function ThBtn({ label, k }: { label: string; k: SortKey }) {
    return (
      <button onClick={() => toggleSort(k)} className="flex items-center gap-1 hover:text-gray-900 transition-colors whitespace-nowrap">
        {label} <SortIcon k={k} />
      </button>
    );
  }

  function completionRate(r: EditorRow) {
    const total = r.completedOrders + r.activeOrders;
    if (!total) return null;
    return Math.round((r.completedOrders / (r.totalOrders || 1)) * 100);
  }

  function exportCSV() {
    downloadCSV("editor-performance.csv", filtered.map(r => ({
      Name: r.name ?? "",
      Email: r.email ?? "",
      "Total Orders": r.totalOrders,
      "Completed": r.completedOrders,
      "Active": r.activeOrders,
      "Completion %": completionRate(r) ?? "",
      "Revenue (₹)": (r.totalRevenue / 100).toFixed(2),
      "Avg Rating": r.avgRating ?? "",
      "Reviews": r.reviewCount,
    })));
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
        />
        <span className="text-sm text-gray-400">{filtered.length} editors</span>
        <button onClick={exportCSV}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 px-3 py-2 rounded-xl hover:border-gray-300 transition-colors shrink-0">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <th className="text-left px-6 py-3">Editor</th>
              <th className="px-4 py-3"><ThBtn label="Total Orders" k="totalOrders" /></th>
              <th className="px-4 py-3"><ThBtn label="Completed" k="completedOrders" /></th>
              <th className="px-4 py-3"><ThBtn label="Active" k="activeOrders" /></th>
              <th className="px-4 py-3 text-right"><ThBtn label="Revenue" k="totalRevenue" /></th>
              <th className="px-4 py-3"><ThBtn label="Avg Rating" k="avgRating" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((r, i) => {
              const cr = completionRate(r);
              return (
                <tr key={r.editorId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-gray-100 text-[10px] font-bold text-gray-400 flex items-center justify-center shrink-0">{i + 1}</span>
                      <div>
                        <Link href={`/admin/editors/${r.editorId}`} className="font-semibold text-gray-900 hover:underline">{r.name ?? "—"}</Link>
                        <p className="text-xs text-gray-400">{r.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center font-semibold text-gray-900">{r.totalOrders}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="text-gray-900 font-semibold">{r.completedOrders}</span>
                    {cr !== null && <span className="text-gray-400 text-xs ml-1">({cr}%)</span>}
                  </td>
                  <td className="px-4 py-3.5 text-center text-gray-700">{r.activeOrders}</td>
                  <td className="px-4 py-3.5 text-right font-semibold text-gray-900">{formatCurrency(r.totalRevenue)}</td>
                  <td className="px-4 py-3.5">
                    {r.avgRating ? (
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span className="font-semibold text-gray-900">{r.avgRating.toFixed(1)}</span>
                        <span className="text-gray-400 text-xs">({r.reviewCount})</span>
                      </div>
                    ) : <span className="text-gray-300 text-xs">No reviews</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">No editors found.</div>
        )}
      </div>
    </div>
  );
}

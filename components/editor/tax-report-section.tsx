"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileDown, Loader2, Receipt } from "lucide-react";

function currentFYStartYear(): number {
  const now = new Date();
  // Indian financial year runs Apr 1 – Mar 31; before April, we're still in last year's FY
  return now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
}

export function TaxReportSection() {
  const thisFY = currentFYStartYear();
  const lastFY = thisFY - 1;
  const [year, setYear] = useState(lastFY);
  const [loading, setLoading] = useState(false);

  const label = (fy: number) => `FY ${fy}–${String(fy + 1).slice(-2)}`;

  async function handleDownload() {
    setLoading(true);
    try {
      const res = await fetch(`/api/editor/tax-report?year=${year}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to generate tax report.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `editbridge-income-FY${year}-${String(year + 1).slice(-2)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Something went wrong generating the report.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
          <Receipt className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">Annual tax report</p>
          <p className="text-xs text-gray-400">One-click PDF of your full year's earnings for ITR filing</p>
        </div>
      </div>
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/30 bg-white"
          >
            <option value={thisFY}>{label(thisFY)} (year to date)</option>
            <option value={lastFY}>{label(lastFY)}</option>
          </select>
          <button
            type="button"
            onClick={handleDownload}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[var(--brand-client)] hover:bg-[var(--brand-editor-hover)] disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
            {loading ? "Preparing…" : "Download PDF"}
          </button>
        </div>
        <p className="text-xs text-gray-400">
          This summary is for your reference. Consult a CA for official tax filing.
        </p>
      </div>
    </div>
  );
}

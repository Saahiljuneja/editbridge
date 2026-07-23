"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";

export function GstExportButton() {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(defaultMonth);

  return (
    <div className="flex items-center gap-2">
      <input
        type="month"
        value={month}
        max={defaultMonth}
        onChange={(e) => setMonth(e.target.value)}
        className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 bg-white"
      />
      <a
        href={`/api/admin/gst-export?month=${month}`}
        download
        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
      >
        <FileDown className="w-4 h-4" />
        GST Export
      </a>
    </div>
  );
}

"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
      style={{ background: "var(--brand-client)" }}
    >
      <Printer className="w-4 h-4" /> Print / Save PDF
    </button>
  );
}

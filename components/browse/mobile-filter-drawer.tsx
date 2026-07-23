"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { FilterPanel } from "@/components/common/filter-panel";

export function MobileFilterDrawer({ activeCount }: { activeCount: number }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 bg-white relative"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        Filters
        {activeCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#0EA5E9] text-white text-[9px] font-bold flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          {/* Drawer */}
          <div className="absolute right-0 top-0 h-full w-80 max-w-[90vw] bg-white shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <span className="font-semibold text-gray-900">Filters &amp; Sort</span>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="px-5 py-2">
              <FilterPanel />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

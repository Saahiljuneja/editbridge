"use client";

import { useState } from "react";
import { ShieldAlert, ArrowLeftRight } from "lucide-react";

export function StickyImpersonationBar() {
  const [switching, setSwitching] = useState(false);

  async function handleSwitchBack() {
    setSwitching(true);
    try {
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "/api/auth/impersonate-back";
      document.body.appendChild(form);
      form.submit();
    } catch {
      setSwitching(false);
    }
  }

  return (
    <div className="bg-amber-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-between gap-4 sticky top-0 z-[9999] shadow-md select-none">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 animate-pulse text-amber-100" />
        <span>Impersonating user account. You are viewing their profile and dashboard.</span>
      </div>
      <button
        onClick={handleSwitchBack}
        disabled={switching}
        className="flex items-center gap-1.5 bg-white text-amber-800 px-3 py-1 rounded-md text-[11px] font-bold hover:bg-amber-50 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
      >
        <ArrowLeftRight className="w-3.5 h-3.5" />
        {switching ? "Switching back…" : "Switch back to Admin"}
      </button>
    </div>
  );
}

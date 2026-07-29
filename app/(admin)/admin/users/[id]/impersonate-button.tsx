"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Eye } from "lucide-react";

export function ImpersonateButton({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!confirm("This will open a new tab where you are logged in AS this user (read their session). Continue?")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed."); return; }
      // Open the switch URL via POST form submit in a new tab to avoid query param token leakage
      const newTab = window.open("", "_blank");
      if (newTab) {
        newTab.document.write(`
          <form id="switch-form" method="POST" action="/api/auth/impersonate-switch">
            <input type="hidden" name="token" value="${data.token}" />
          </form>
          <script>
            document.getElementById('switch-form').submit();
          </script>
        `);
      }
      toast.success(`Impersonation tab opened. You remain logged in here as admin.`);
    } catch { toast.error("Something went wrong."); }
    finally { setLoading(false); }
  }

  return (
    <button onClick={handleClick} disabled={loading}
      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-200 bg-amber-50 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors">
      <Eye className="w-4 h-4" />
      {loading ? "Loading…" : "Impersonate"}
    </button>
  );
}

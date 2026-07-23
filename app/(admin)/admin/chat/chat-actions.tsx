"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Unlock, Trash2 } from "lucide-react";

export function ChatMessageActions({ messageId }: { messageId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"unblock" | "delete" | null>(null);

  async function unblock() {
    if (!confirm("Unblock this message? It will become visible to both parties.")) return;
    setLoading("unblock");
    try {
      const res = await fetch(`/api/admin/messages/${messageId}`, { method: "PATCH" });
      if (res.ok) { toast.success("Message unblocked."); router.refresh(); }
      else toast.error("Failed to unblock.");
    } catch { toast.error("Something went wrong."); }
    finally { setLoading(null); }
  }

  async function remove() {
    if (!confirm("Permanently delete this message? This cannot be undone.")) return;
    setLoading("delete");
    try {
      const res = await fetch(`/api/admin/messages/${messageId}`, { method: "DELETE" });
      if (res.ok) { toast.success("Message deleted."); router.refresh(); }
      else toast.error("Failed to delete.");
    } catch { toast.error("Something went wrong."); }
    finally { setLoading(null); }
  }

  return (
    <div className="flex items-center gap-2 justify-end">
      <button
        onClick={unblock}
        disabled={loading !== null}
        className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-800 disabled:opacity-40 transition-colors"
        title="Unblock — make visible again"
      >
        <Unlock className="w-3.5 h-3.5" />
        {loading === "unblock" ? "…" : "Unblock"}
      </button>
      <span className="text-gray-200">|</span>
      <button
        onClick={remove}
        disabled={loading !== null}
        className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors"
        title="Permanently delete this message"
      >
        <Trash2 className="w-3.5 h-3.5" />
        {loading === "delete" ? "…" : "Delete"}
      </button>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban } from "lucide-react";

export function BlockMessageButton({ messageId }: { messageId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function block() {
    const reason = prompt("Reason for blocking this message:");
    if (!reason?.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/admin/messages/${messageId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) {
      toast.success("Message blocked");
      router.refresh();
    } else {
      toast.error("Failed to block message");
      setLoading(false);
    }
  }

  return (
    <button
      onClick={block}
      disabled={loading}
      title="Block this message"
      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 disabled:opacity-40"
    >
      <Ban className="w-3.5 h-3.5" />
    </button>
  );
}

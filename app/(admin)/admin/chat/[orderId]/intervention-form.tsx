"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export function AdminChatInterventionForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/chat/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to send message.");
        return;
      }
      toast.success("Admin message sent to both parties.");
      setContent("");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as unknown as React.FormEvent);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-violet-200 bg-violet-50 p-5">
      <div className="flex items-center gap-2 mb-3">
        <ShieldAlert className="w-4 h-4 text-violet-600" />
        <p className="text-sm font-semibold text-violet-800">Admin Intervention</p>
      </div>
      <p className="text-xs text-violet-600 mb-4">
        Your message will appear to both the client and editor in their chat, labeled as an admin message.
        Use this only for platform-level emergencies.
      </p>
      <form onSubmit={handleSend} className="flex items-end gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your admin message… (Enter to send, Shift+Enter for new line)"
          className="flex-1 min-h-[72px] max-h-40 resize-none rounded-xl border border-violet-300 bg-white px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400/30"
          maxLength={2000}
        />
        <button
          type="submit"
          disabled={sending || !content.trim()}
          className={cn(
            buttonVariants({ size: "sm" }),
            "bg-violet-600 hover:bg-violet-700 text-white shrink-0 px-4",
            (sending || !content.trim()) && "opacity-50 cursor-not-allowed"
          )}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

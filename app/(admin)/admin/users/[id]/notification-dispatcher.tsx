"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Send, BellRing } from "lucide-react";

export function NotificationDispatcher({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [type, setType] = useState("system_alert");
  const [sending, setSending] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !text.trim()) {
      toast.error("Title and message are required.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/dispatch-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, text, type }),
      });
      if (!res.ok) {
        toast.error("Failed to send notification.");
        return;
      }
      toast.success("Notification dispatched successfully!");
      setTitle("");
      setText("");
      setOpen(false);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <BellRing className="w-4 h-4 text-amber-500" /> Send Notification
      </button>
    );
  }

  return (
    <form onSubmit={handleSend} className="rounded-2xl border border-amber-100 bg-amber-50/50 p-5 space-y-3 w-full">
      <p className="font-semibold text-sm text-gray-900">Dispatch System Notification</p>
      <p className="text-xs text-gray-500">This sends an alert directly to the user's header notifications bell popover.</p>
      
      <div>
        <label className="block text-[10px] font-semibold text-gray-500 mb-1">Notification Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="e.g. Account Update Needed"
          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-[10px] font-semibold text-gray-500 mb-1">Message Content</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
          rows={3}
          placeholder="Enter the alert message here..."
          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-[10px] font-semibold text-gray-500 mb-1">Notification Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
        >
          <option value="system_alert">System Alert (Warning)</option>
          <option value="kyc_rejected">KYC Resubmission Request</option>
          <option value="new_message">General Message Info</option>
        </select>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={sending}
          className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          {sending ? "Sending…" : "Send Alert"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs text-gray-650 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

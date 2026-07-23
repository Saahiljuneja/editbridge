"use client";

import { useEffect, useRef, useState } from "react";
import Pusher from "pusher-js";
import { cn } from "@/lib/utils";
import { Send, ShieldAlert } from "lucide-react";
import Image from "next/image";

interface Message {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  senderName: string | null;
  senderRole: string;
  senderImage: string | null;
}

function timeStr(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function roleBadge(role: string) {
  if (role === "admin" || role?.startsWith("staff_")) return { label: "Admin", cls: "bg-purple-100 text-purple-700" };
  if (role === "editor") return { label: "Editor", cls: "bg-blue-100 text-blue-700" };
  return { label: "Client", cls: "bg-green-100 text-green-700" };
}

export function DisputeChat({
  disputeId,
  currentUserId,
  isResolved,
}: {
  disputeId: string;
  currentUserId: string;
  isResolved: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load history
  useEffect(() => {
    fetch(`/api/disputes/${disputeId}/messages`)
      .then(r => r.ok ? r.json() : [])
      .then(setMessages)
      .finally(() => setLoading(false));
  }, [disputeId]);

  // Pusher real-time
  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
    const channel = pusher.subscribe(`dispute-${disputeId}`);
    channel.bind("new-message", (msg: Message) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });
    return () => { channel.unbind_all(); pusher.unsubscribe(`dispute-${disputeId}`); };
  }, [disputeId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    try {
      const res = await fetch(`/api/disputes/${disputeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
      }
    } finally {
      setSending(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
        <span className="text-sm font-semibold text-gray-900">Dispute Thread</span>
        <span className="text-xs text-gray-400 ml-1">— visible to both parties and our support team</span>
        {isResolved && (
          <span className="ml-auto text-xs font-medium px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Resolved</span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[260px] max-h-[420px]">
        {loading ? (
          <div className="flex items-center justify-center h-full text-xs text-gray-400 py-10">Loading messages…</div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-10 text-center">
            <ShieldAlert className="w-8 h-8 text-gray-200 mb-2" />
            <p className="text-xs text-gray-400">No messages yet. Explain your situation to get help from our support team.</p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.senderId === currentUserId;
            const badge = roleBadge(msg.senderRole);
            return (
              <div key={msg.id} className={cn("flex gap-3", isMe && "flex-row-reverse")}>
                {/* Avatar */}
                <div className="shrink-0">
                  {msg.senderImage ? (
                    <Image src={msg.senderImage} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0EA5E9] to-[#7c6ff7] flex items-center justify-center">
                      <span className="text-xs font-bold text-white">{(msg.senderName ?? "?")[0].toUpperCase()}</span>
                    </div>
                  )}
                </div>

                {/* Bubble */}
                <div className={cn("max-w-[75%] space-y-1", isMe && "items-end")}>
                  <div className={cn("flex items-center gap-1.5 text-[10px]", isMe && "justify-end")}>
                    <span className="font-semibold text-gray-700">{msg.senderName ?? "Unknown"}</span>
                    <span className={cn("px-1.5 py-0.5 rounded-full font-medium", badge.cls)}>{badge.label}</span>
                    <span className="text-gray-400">{timeStr(msg.createdAt)}</span>
                  </div>
                  <div className={cn(
                    "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    isMe
                      ? "bg-[#0EA5E9] text-white rounded-tr-sm"
                      : msg.senderRole === "admin" || msg.senderRole?.startsWith("staff_")
                        ? "bg-purple-50 border border-purple-100 text-gray-800 rounded-tl-sm"
                        : "bg-gray-100 text-gray-800 rounded-tl-sm"
                  )}>
                    {msg.body}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!isResolved ? (
        <div className="border-t border-gray-100 p-3 flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type your message… (Enter to send)"
            rows={2}
            className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30 focus:border-[#0EA5E9] transition-colors"
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            className="self-end w-10 h-10 rounded-xl bg-[#0EA5E9] hover:bg-[#3d34a0] disabled:opacity-40 flex items-center justify-center transition-colors shrink-0"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      ) : (
        <div className="border-t border-gray-100 px-5 py-3 text-xs text-gray-400 text-center">
          This dispute has been resolved. The thread is now read-only.
        </div>
      )}
    </div>
  );
}

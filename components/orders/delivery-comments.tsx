"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Clock, Send, Loader2 } from "lucide-react";
import { cn, displayNameFromFull } from "@/lib/utils";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

interface Comment {
  id: string;
  timestampSec: number | null;
  comment: string;
  createdAt: string;
  userId: string;
  userName: string | null;
  userRole: string;
}

interface DeliveryCommentsProps {
  deliveryId: string;
  currentUserId: string;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const ROLE_BADGE: Record<string, string> = {
  client: "bg-green-100 text-green-700",
  editor: "bg-blue-100 text-blue-700",
  admin: "bg-purple-100 text-purple-700",
};

export function DeliveryComments({ deliveryId, currentUserId, videoRef }: DeliveryCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [atTimestamp, setAtTimestamp] = useState(false);
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const textRef = useRef(text);
  textRef.current = text;

  useEffect(() => {
    fetch(`/api/deliveries/${deliveryId}/comments`)
      .then(r => r.ok ? r.json() : [])
      .then(setComments)
      .catch(() => {});
  }, [deliveryId]);

  // Update current video time for timestamp capture
  useEffect(() => {
    const video = videoRef?.current;
    if (!video) return;
    const handler = () => setCurrentTime(Math.floor(video.currentTime));
    video.addEventListener("timeupdate", handler);
    return () => video.removeEventListener("timeupdate", handler);
  }, [videoRef]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/deliveries/${deliveryId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment: text.trim(),
          ...(atTimestamp && currentTime != null ? { timestampSec: currentTime } : {}),
        }),
      });
      if (!res.ok) throw new Error();
      const newComment = await res.json();
      setComments(prev => [...prev, newComment]);
      setText("");
      setAtTimestamp(false);
    } catch {
      toast.error("Failed to post comment.");
    } finally {
      setSending(false);
    }
  }

  function seekTo(sec: number) {
    if (videoRef?.current) {
      videoRef.current.currentTime = sec;
      videoRef.current.play().catch(() => {});
    }
  }

  return (
    <div className="rounded-xl border border-border bg-white">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
        <MessageCircle className="w-4 h-4 text-muted-foreground" />
        <span className="font-semibold text-sm">Delivery Feedback</span>
        {comments.length > 0 && (
          <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 ml-1">
            {comments.length}
          </span>
        )}
      </div>

      {/* Comments list */}
      <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            No comments yet. Add feedback below.
          </p>
        ) : (
          comments.map(c => {
            const isMe = c.userId === currentUserId;
            const roleBadge = ROLE_BADGE[c.userRole] ?? "bg-gray-100 text-gray-600";
            return (
              <div key={c.id} className={cn("px-5 py-3 text-sm", isMe && "bg-blue-50/30")}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-800 text-xs">
                    {displayNameFromFull(c.userName ?? "")}
                  </span>
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", roleBadge)}>
                    {c.userRole}
                  </span>
                  {c.timestampSec != null && (
                    <button
                      onClick={() => seekTo(c.timestampSec!)}
                      className="flex items-center gap-0.5 text-[10px] text-[#0EA5E9] font-semibold bg-[#0EA5E9]/10 px-1.5 py-0.5 rounded-full hover:bg-[#0EA5E9]/20 transition-colors"
                    >
                      <Clock className="w-2.5 h-2.5" />
                      {fmtTime(c.timestampSec)}
                    </button>
                  )}
                  <span className="text-[10px] text-gray-300 ml-auto">{formatDateTime(new Date(c.createdAt))}</span>
                </div>
                <p className="text-gray-700 leading-relaxed">{c.comment}</p>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="border-t border-border p-4">
        {/* Timestamp toggle — only if video is available */}
        {videoRef && currentTime != null && (
          <button
            type="button"
            onClick={() => setAtTimestamp(v => !v)}
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg mb-2 transition-colors",
              atTimestamp
                ? "bg-[#0EA5E9]/10 text-[#0EA5E9]"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            )}
          >
            <Clock className="w-3 h-3" />
            {atTimestamp ? `Comment at ${fmtTime(currentTime)}` : "Add timestamp"}
          </button>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Leave feedback on this delivery…"
            maxLength={1000}
            className="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30"
            style={{ fontSize: "16px" }}
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className={cn(
              "px-3 py-2 rounded-lg bg-[#0EA5E9] text-white text-sm font-medium flex items-center gap-1.5 transition-opacity",
              (sending || !text.trim()) && "opacity-40 cursor-not-allowed"
            )}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </form>
    </div>
  );
}

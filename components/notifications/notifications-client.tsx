"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  Bell, Award, TrendingUp, CreditCard, Package, MessageSquare,
  ShieldCheck, Star, CheckCheck, Check, ChevronRight, Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string | Date;
};

function timeAgo(date: string | Date) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const TYPE_META: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  badge_earned:       { icon: Award,         color: "text-amber-600",   bg: "bg-amber-50" },
  level_up:           { icon: TrendingUp,    color: "text-violet-600",  bg: "bg-violet-50" },
  credit_earned:      { icon: CreditCard,    color: "text-emerald-600", bg: "bg-emerald-50" },
  new_order:          { icon: Package,       color: "text-sky-600",     bg: "bg-sky-50" },
  order_status:       { icon: Package,       color: "text-sky-600",     bg: "bg-sky-50" },
  new_message:        { icon: MessageSquare, color: "text-sky-600",     bg: "bg-sky-50" },
  delivery_received:  { icon: Package,       color: "text-emerald-600", bg: "bg-emerald-50" },
  revision_requested: { icon: Package,       color: "text-amber-600",   bg: "bg-amber-50" },
  review_received:    { icon: Star,          color: "text-amber-500",   bg: "bg-amber-50" },
  kyc_approved:       { icon: ShieldCheck,   color: "text-emerald-600", bg: "bg-emerald-50" },
  kyc_rejected:       { icon: ShieldCheck,   color: "text-red-500",     bg: "bg-red-50" },
};

function NotifIcon({ type }: { type: string }) {
  const meta = TYPE_META[type] ?? { icon: Bell, color: "text-sky-600", bg: "bg-sky-50" };
  const Icon = meta.icon;
  return (
    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", meta.bg)}>
      <Icon className={cn("w-5 h-5", meta.color)} />
    </div>
  );
}

type Filter = "all" | "unread";

export function NotificationsClient({
  initialNotifications,
  accent = "#1e40af",
}: {
  initialNotifications: Notification[];
  accent?: string;
}) {
  const [notifs, setNotifs] = useState<Notification[]>(initialNotifications);
  const [filter, setFilter] = useState<Filter>("all");
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = notifs.filter(n => !n.isRead).length;

  const markAllRead = useCallback(async () => {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    try {
      const res = await fetch("/api/notifications", { method: "PATCH" });
      if (!res.ok) throw new Error();
      setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch {
      toast.error("Failed to mark all as read.");
    } finally {
      setMarkingAll(false);
    }
  }, [unreadCount]);

  const markOneRead = useCallback(async (id: string) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    await fetch(`/api/notifications/${id}`, { method: "PATCH" }).catch(() => {});
  }, []);

  const visible = filter === "unread" ? notifs.filter(n => !n.isRead) : notifs;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-16 space-y-4">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-neutral-200/60 shadow-sm p-5 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-5 h-5" style={{ color: accent }} />
            <h1 className="text-lg font-black text-neutral-900 tracking-tight leading-none">Notifications</h1>
            {unreadCount > 0 && (
              <span
                className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-white text-[10px] font-black"
                style={{ background: accent }}
              >
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-400 font-semibold">Activity from the last 30 days</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingAll}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors disabled:opacity-50 shrink-0"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl w-fit">
        {(["all", "unread"] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-black capitalize transition-all",
              filter === f ? "bg-white shadow-sm" : "text-neutral-500 hover:text-neutral-700"
            )}
            style={filter === f ? { color: accent } : {}}
          >
            {f === "unread" && unreadCount > 0 ? `Unread (${unreadCount})` : f === "unread" ? "Unread" : "All"}
          </button>
        ))}
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: `${accent}18` }}>
            <Inbox className="w-7 h-7" style={{ color: accent }} />
          </div>
          <p className="font-semibold text-neutral-800 text-sm">
            {filter === "unread" ? "No unread notifications" : "No notifications yet"}
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            {filter === "unread" ? "You're all caught up." : "Activity like orders, messages, and badges will appear here."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-neutral-200/60 shadow-sm overflow-hidden divide-y divide-neutral-100">
          {visible.map(notif => {
            const inner = (
              <div
                className={cn(
                  "flex items-start gap-3.5 px-5 py-4 transition-colors cursor-pointer",
                  "hover:bg-neutral-50/80"
                )}
                style={!notif.isRead ? { backgroundColor: `${accent}0d` } : {}}
                onClick={() => !notif.isRead && markOneRead(notif.id)}
              >
                <NotifIcon type={notif.type} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("text-sm leading-snug", notif.isRead ? "text-neutral-700" : "text-neutral-900 font-semibold")}>
                      {notif.title}
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: accent }} />
                      )}
                      <span className="text-[10px] text-neutral-400 whitespace-nowrap font-medium">
                        {timeAgo(notif.createdAt)}
                      </span>
                    </div>
                  </div>
                  {notif.body && (
                    <p className="text-xs text-neutral-400 mt-0.5 line-clamp-2 leading-relaxed">{notif.body}</p>
                  )}
                </div>
                {notif.link && <ChevronRight className="w-4 h-4 text-neutral-300 shrink-0 mt-0.5" />}
              </div>
            );

            return notif.link ? (
              <Link key={notif.id} href={notif.link} className="block" onClick={() => !notif.isRead && markOneRead(notif.id)}>
                {inner}
              </Link>
            ) : (
              <div key={notif.id}>{inner}</div>
            );
          })}
        </div>
      )}

      {visible.length > 0 && unreadCount === 0 && filter === "all" && (
        <div className="flex items-center justify-center gap-1.5 text-xs text-neutral-400 font-medium py-2">
          <Check className="w-3.5 h-3.5 text-emerald-500" />
          All caught up
        </div>
      )}
    </div>
  );
}

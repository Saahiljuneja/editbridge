export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Bell, ShoppingBag, MessageSquare, Star, CheckCircle2, AlertCircle, Info, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";
import { MarkAllReadButton } from "./mark-all-read-button";

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  new_order:          { icon: ShoppingBag,   color: "text-blue-600",   bg: "bg-blue-50" },
  new_message:        { icon: MessageSquare, color: "text-violet-600", bg: "bg-violet-50" },
  revision_requested: { icon: AlertCircle,   color: "text-amber-600",  bg: "bg-amber-50" },
  delivery_received:  { icon: CheckCircle2,  color: "text-green-600",  bg: "bg-green-50" },
  review_received:    { icon: Star,          color: "text-amber-500",  bg: "bg-amber-50" },
  dispute_opened:     { icon: AlertCircle,   color: "text-red-600",    bg: "bg-red-50" },
  broadcast:          { icon: Megaphone,     color: "text-[var(--brand-client)]",  bg: "bg-[var(--brand-client)]/10" },
  announcement:       { icon: Info,          color: "text-blue-600",   bg: "bg-blue-50" },
};

export default async function ClientNotificationsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, session.user.userId!))
    .orderBy(desc(notifications.createdAt))
    .limit(100);

  const unreadCount = rows.filter(r => !r.isRead).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-400 mt-0.5">{unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}</p>
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && <MarkAllReadButton />}
            <div className="w-9 h-9 rounded-xl bg-[var(--brand-client)]/10 flex items-center justify-center">
              <Bell className="w-4 h-4 text-[var(--brand-client)]" />
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--brand-client)]/10 flex items-center justify-center mb-4">
              <Bell className="w-7 h-7 text-[var(--brand-client)]" />
            </div>
            <p className="font-semibold text-gray-800">No notifications yet</p>
            <p className="text-sm text-gray-400 mt-1">We'll notify you about orders, deliveries, and messages.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            {rows.map((n) => {
              const cfg = TYPE_CONFIG[n.type] ?? { icon: Bell, color: "text-gray-500", bg: "bg-gray-100" };
              const Icon = cfg.icon;
              return (
                <div key={n.id} className={cn("flex items-start gap-4 px-5 py-4 border-b border-gray-50 last:border-0", !n.isRead ? "bg-[var(--brand-client)]/[0.02]" : "bg-white")}>
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5", cfg.bg)}>
                    <Icon className={cn("w-4 h-4", cfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className={cn("text-sm leading-snug", !n.isRead ? "font-semibold text-gray-900" : "font-medium text-gray-700")}>
                        {n.title}
                      </p>
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-[var(--brand-client)] shrink-0 mt-1.5" />}
                    </div>
                    {n.body && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>}
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] text-gray-400">{formatDateTime(n.createdAt)}</span>
                      {n.link && <Link href={n.link} className="text-[10px] font-semibold text-[var(--brand-client)] hover:underline">View →</Link>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

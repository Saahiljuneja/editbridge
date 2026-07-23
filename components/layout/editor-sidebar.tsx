"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import {
  LayoutDashboard, User, Package, ShoppingBag, DollarSign,
  MessageSquare, Settings, Star, BarChart2, AlertTriangle,
  Bell, Users, Zap, Sparkles, HelpCircle, Bookmark,
  FileQuestion,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_GROUPS = [
  {
    label: "Work",
    items: [
      { href: "/editor/dashboard",      label: "Dashboard",      icon: LayoutDashboard },
      { href: "/editor/orders",         label: "Orders",         icon: ShoppingBag },
      { href: "/editor/quotes",         label: "Quotes",         icon: FileQuestion },
      { href: "/editor/questions",      label: "Pre-order Q&A",  icon: HelpCircle },
      { href: "/editor/messages",       label: "Messages",       icon: MessageSquare, badgeKey: "messages" as const },
      { href: "/editor/payouts",        label: "Payouts",        icon: DollarSign },
      { href: "/editor/disputes",       label: "Disputes",       icon: AlertTriangle },
    ],
  },
  {
    label: "Profile",
    items: [
      { href: "/editor/profile",        label: "My Profile",     icon: User },
      { href: "/editor/saved-portfolio",label: "Saved",          icon: Bookmark },
      { href: "/editor/packages",       label: "Packages",       icon: Package },
      { href: "/editor/reviews",        label: "Reviews",        icon: Star },
      { href: "/editor/clients",        label: "Clients",        icon: Users },
    ],
  },
  {
    label: "Grow",
    items: [
      { href: "/editor/analytics",      label: "Analytics",      icon: BarChart2 },
      { href: "/editor/featured",       label: "Featured",       icon: Sparkles, flag: "featuredPlacementEnabled" as const },
      { href: "/editor/rewards",        label: "Rewards & XP",   icon: Zap },
      { href: "/editor/xp-shop",        label: "XP Shop",        icon: Sparkles },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/editor/notifications",  label: "Notifications",  icon: Bell, badgeKey: "notifications" as const },
      { href: "/editor/settings",       label: "Settings",       icon: Settings },
    ],
  },
];

const LEVEL_META: Record<string, { label: string; color: string; bg: string }> = {
  bronze:   { label: "Bronze",   color: "#B45309", bg: "#FEF3C7" },
  silver:   { label: "Silver",   color: "#6B7280", bg: "#F3F4F6" },
  gold:     { label: "Gold",     color: "#CA8A04", bg: "#FEF9C3" },
  platinum: { label: "Platinum", color: "#4F46E5", bg: "#EEF2FF" },
};

interface EditorSidebarProps {
  featuredPlacementEnabled?: boolean;
  userName?: string;
  userImage?: string | null;
  xpLevel?: string;
  editorId?: string | null;
  userId?: string | null;
}

export function EditorSidebar({
  featuredPlacementEnabled = true,
  userName = "",
  userImage = null,
  xpLevel = "bronze",
  editorId = null,
  userId = null,
}: EditorSidebarProps) {
  const pathname = usePathname();
  const [counts, setCounts] = useState({ messages: 0, notifications: 0 });
  const flags = { featuredPlacementEnabled };
  const lm = LEVEL_META[xpLevel] ?? LEVEL_META.bronze;
  const initials = userName.split(" ").filter(Boolean).map(n => n[0]).join("").toUpperCase().slice(0, 2) || "E";

  useEffect(() => {
    fetch("/api/editor/unread-count")
      .then(r => r.json())
      .then(d => setCounts({ messages: d.count ?? 0, notifications: d.notifications ?? 0 }))
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    if (!userId) return;
    let client: import("pusher-js").default | null = null;
    import("pusher-js").then((mod) => {
      const PusherClient = mod.default;
      client = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        authEndpoint: "/api/chat/pusher-auth",
      });
      const channel = client.subscribe(`private-user-${userId}`);
      channel.bind("notification", () => {
        setCounts(prev => ({ ...prev, notifications: prev.notifications + 1 }));
      });
    });
    return () => { client?.unsubscribe(`private-user-${userId}`); };
  }, [userId]);

  return (
    <aside className="w-[220px] flex-shrink-0 hidden md:flex flex-col h-screen sticky top-0 bg-white border-r border-gray-100">

      {/* ── Brand ─────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        {/* User card */}
        <div className="flex items-center gap-2.5">
          <div className="relative shrink-0">
            <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold">
              {userImage
                ? <Image src={userImage} alt={userName} fill className="object-cover" />
                : initials}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-semibold text-gray-800 leading-tight truncate">{userName || "Editor"}</p>
            <span className="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: lm.color, background: lm.bg }}>
              {lm.label}
            </span>
          </div>
          {editorId && (
            <Link href={`/editor/${editorId}`} target="_blank"
              className="w-6 h-6 rounded-lg border border-gray-200 hover:border-[#0EA5E9] flex items-center justify-center text-gray-300 hover:text-[#0EA5E9] transition-colors shrink-0"
              title="View public profile">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          )}
        </div>
      </div>

      {/* ── Nav ──────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 scrollbar-none">
        {NAV_GROUPS.map(group => {
          const visibleItems = group.items.filter(item =>
            !("flag" in item) || flags[item.flag as keyof typeof flags]
          );
          if (!visibleItems.length) return null;

          return (
            <div key={group.label} className="mb-4">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-gray-300 px-2.5 mb-1">
                {group.label}
              </p>
              <div className="space-y-px">
                {visibleItems.map(({ href, label, icon: Icon, badgeKey }) => {
                  const active = href === "/editor/dashboard"
                    ? pathname === "/editor/dashboard"
                    : pathname.startsWith(href);
                  const badgeCount = badgeKey ? counts[badgeKey] : 0;

                  return (
                    <Link key={href} href={href}
                      className={cn(
                        "relative flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[12.5px] font-medium transition-all",
                        active
                          ? "bg-[#0EA5E9]/8 text-[#0EA5E9]"
                          : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-[#0EA5E9]" />
                      )}
                      <Icon className={cn("h-[15px] w-[15px] shrink-0 transition-colors", active ? "text-[#0EA5E9]" : "text-gray-400")} />
                      <span className="flex-1 truncate">{label}</span>
                      {badgeCount > 0 && (
                        <span className="min-w-[17px] h-[17px] px-1 rounded-full bg-[#0EA5E9] text-white text-[9px] font-bold flex items-center justify-center">
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── Footer ───────────────────────────────── */}
      <div className="px-2 pb-3 pt-2 border-t border-gray-100">
        <Link href="/"
          className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors text-[12px] font-medium">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to website
        </Link>
      </div>
    </aside>
  );
}

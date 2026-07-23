"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import {
  LayoutDashboard, Search, ShoppingBag, MessageSquare,
  Settings, HelpCircle, AlertTriangle, Bell, Heart,
  Star, BarChart2, FileText, Gift, Zap, Bookmark,
  CalendarDays, IndianRupee, CreditCard, GitCompare,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_GROUPS = [
  {
    label: "Discover",
    items: [
      { href: "/dashboard",        label: "Dashboard",        icon: LayoutDashboard },
      { href: "/browse",           label: "Browse Editors",   icon: Search },
    ],
  },
  {
    label: "Orders",
    items: [
      { href: "/orders",           label: "My Orders",        icon: ShoppingBag },
      { href: "/calendar",         label: "Calendar",         icon: CalendarDays },
      { href: "/quotes",           label: "Quote Requests",   icon: MessageSquare },
      { href: "/messages",         label: "Messages",         icon: MessageSquare, badgeKey: "unread" as const },
      { href: "/disputes",         label: "Disputes",         icon: AlertTriangle },
    ],
  },
  {
    label: "Library",
    items: [
      { href: "/saved",            label: "Saved Editors",    icon: Heart, badgeKey: "saved" as const },
      { href: "/saved-portfolio",  label: "Saved Portfolio",  icon: Bookmark },
      { href: "/brief-templates",  label: "Brief Templates",  icon: FileText },
    ],
  },
  {
    label: "Rewards",
    items: [
      { href: "/referrals",        label: "Refer & Earn",     icon: Gift },
      { href: "/rewards",          label: "Rewards & XP",     icon: Zap },
      { href: "/reviews",          label: "My Reviews",       icon: Star },
      { href: "/analytics",        label: "Analytics",        icon: BarChart2 },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/transactions",     label: "Transactions",     icon: IndianRupee },
      { href: "/payment-methods",  label: "Payment Methods",  icon: CreditCard },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/notifications",    label: "Notifications",    icon: Bell },
      { href: "/settings",         label: "Settings",         icon: Settings },
      { href: "/help",             label: "Help & FAQ",       icon: HelpCircle },
    ],
  },
];

interface ClientSidebarProps {
  userName?: string;
  userImage?: string | null;
}

export function ClientSidebar({ userName = "", userImage = null }: ClientSidebarProps) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const [savedAvailable, setSavedAvailable] = useState(0);

  const initials = userName.split(" ").filter(Boolean).map(n => n[0]).join("").toUpperCase().slice(0, 2) || "C";
  const badgeCounts: Record<string, number> = { unread, saved: savedAvailable };

  useEffect(() => {
    fetch("/api/client/unread-count")
      .then(r => r.json())
      .then(d => setUnread(d.count ?? 0))
      .catch(() => {});
    fetch("/api/saved-editors/available-count")
      .then(r => r.json())
      .then(d => setSavedAvailable(d.count ?? 0))
      .catch(() => {});
  }, [pathname]);

  return (
    <aside className="w-[220px] flex-shrink-0 hidden md:flex flex-col h-screen sticky top-0 bg-white border-r border-gray-100">

      {/* ── Brand ─────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        {/* User card */}
        <div className="flex items-center gap-2.5">
          <div className="relative shrink-0">
            <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-white text-sm font-bold">
              {userImage
                ? <Image src={userImage} alt={userName} fill className="object-cover" />
                : initials}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-semibold text-gray-800 leading-tight truncate">{userName || "Client"}</p>
            <p className="text-[10.5px] text-gray-400 leading-tight mt-0.5">Client account</p>
          </div>
        </div>
      </div>

      {/* ── Nav ──────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 scrollbar-none">
        {NAV_GROUPS.map(group => (
          <div key={group.label} className="mb-4">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-gray-300 px-2.5 mb-1">
              {group.label}
            </p>
            <div className="space-y-px">
              {group.items.map(({ href, label, icon: Icon, badgeKey }) => {
                const active = href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(href);
                const badgeCount = badgeKey ? badgeCounts[badgeKey] : 0;

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
                    <Icon className={cn("h-[15px] w-[15px] shrink-0", active ? "text-[#0EA5E9]" : "text-gray-400")} />
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
        ))}
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

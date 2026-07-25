"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard, ShoppingBag,
  Users, DollarSign, Shield,
  Mail, Server, TrendingUp,
  Film, Settings, ChevronDown, ChevronUp, ExternalLink,
  HelpCircle, ChevronsUpDown, UserCircle, BookOpen, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";
import { AdminGlobalSearch } from "./admin-global-search";
import { AdminThemeToggle } from "@/components/admin/admin-theme-toggle";

const NAV_GROUPS = [
  {
    label: "Overview",
    icon: LayoutDashboard,
    roles: ["admin","staff_kyc","staff_support","staff_dispute","staff_moderation"],
    items: [
      { href: "/admin/dashboard",   label: "Dashboard",  roles: ["admin","staff_kyc","staff_support","staff_dispute","staff_moderation"], badgeKey: null },
      { href: "/admin/analytics",   label: "Analytics",  roles: ["admin"],                                                               badgeKey: null },
    ],
  },
  {
    label: "Operations",
    icon: ShoppingBag,
    roles: ["admin","staff_kyc","staff_support","staff_dispute","staff_moderation"],
    items: [
      { href: "/admin/kyc",         label: "KYC Queue",  roles: ["admin","staff_kyc"],                                                   badgeKey: "pendingKyc" as const },
      { href: "/admin/orders",      label: "Orders",     roles: ["admin","staff_support","staff_dispute"],                               badgeKey: null },
      { href: "/admin/disputes",    label: "Disputes",   roles: ["admin","staff_dispute"],                                               badgeKey: "openDisputes" as const },
      { href: "/admin/users",       label: "Users",      roles: ["admin","staff_support","staff_dispute","staff_moderation"],            badgeKey: null },
    ],
  },
  {
    label: "Finance",
    icon: DollarSign,
    roles: ["admin"],
    items: [
      { href: "/admin/revenue",     label: "Revenue",    roles: ["admin"], badgeKey: null },
      { href: "/admin/payouts",     label: "Payouts",    roles: ["admin"], badgeKey: "pendingPayouts" as const },
      { href: "/admin/chargebacks", label: "Chargebacks",roles: ["admin"], badgeKey: null },
      { href: "/admin/refunds",     label: "Refunds",    roles: ["admin"], badgeKey: null },
      { href: "/admin/payments",    label: "Payments",   roles: ["admin"], badgeKey: null },
    ],
  },
  {
    label: "Insights",
    icon: TrendingUp,
    roles: ["admin"],
    items: [
      { href: "/admin/editor-performance", label: "Editor Performance", roles: ["admin"], badgeKey: null },
      { href: "/admin/referrals",          label: "Referral Analytics", roles: ["admin"], badgeKey: null },
    ],
  },
  {
    label: "Oversight",
    icon: Shield,
    roles: ["admin","staff_support","staff_dispute","staff_moderation"],
    items: [
      { href: "/admin/chat",        label: "Chat",           roles: ["admin","staff_support","staff_dispute"],              badgeKey: null },
      { href: "/admin/moderation",  label: "Moderation",     roles: ["admin","staff_moderation"],                           badgeKey: null },
      { href: "/admin/watchlist",   label: "Watch List",     roles: ["admin","staff_moderation","staff_support"],           badgeKey: null },
      { href: "/admin/flagged",     label: "Flagged Users",  roles: ["admin","staff_moderation","staff_support"],           badgeKey: null },
      { href: "/admin/abuse",       label: "Abuse Detection",roles: ["admin","staff_moderation"],                           badgeKey: null },
    ],
  },
  {
    label: "Content",
    icon: Mail,
    roles: ["admin","staff_moderation","staff_support"],
    items: [
      { href: "/admin/blog",            label: "Blog",              roles: ["admin","staff_moderation"],                         badgeKey: null },
      { href: "/admin/showcase",        label: "Showcase",          roles: ["admin","staff_moderation"],                         badgeKey: null },
      { href: "/admin/announcements",   label: "Announcements",     roles: ["admin","staff_moderation"],                         badgeKey: null },
      { href: "/admin/broadcast",       label: "Broadcast",         roles: ["admin","staff_moderation","staff_support"],         badgeKey: null },
      { href: "/admin/push",            label: "Push notifications",roles: ["admin"],                                            badgeKey: null },
      { href: "/admin/email-templates", label: "Email templates",   roles: ["admin"],                                            badgeKey: null },
    ],
  },
  {
    label: "System",
    icon: Server,
    roles: ["admin"],
    items: [
      { href: "/admin/staff",         label: "Staff",           roles: ["admin"], badgeKey: null },
      { href: "/admin/audit",         label: "Audit log",       roles: ["admin"], badgeKey: null },
      { href: "/admin/system",        label: "System health",   roles: ["admin"], badgeKey: null },
      { href: "/admin/commission",    label: "Commission & fees",roles: ["admin"], badgeKey: null },
      { href: "/admin/feature-flags", label: "Feature flags",   roles: ["admin"], badgeKey: null },
    ],
  },
];

const ROLE_LABELS: Partial<Record<UserRole, string>> = {
  admin:             "Super Admin",
  staff_kyc:         "KYC Staff",
  staff_support:     "Support Staff",
  staff_dispute:     "Dispute Staff",
  staff_moderation:  "Moderation Staff",
};

type Counts   = { pendingKyc: number; openDisputes: number; pendingPayouts: number };
type BadgeKey = "pendingKyc" | "openDisputes" | "pendingPayouts";

export function AdminSidebar() {
  const pathname  = usePathname();
  const { data: session } = useSession();
  const role      = (session?.user?.role ?? "") as UserRole;
  const userName  = session?.user?.name  ?? "";
  const userEmail = session?.user?.email ?? "";
  const userImage = session?.user?.image ?? null;
  const [counts,   setCounts]    = useState<Counts>({ pendingKyc: 0, openDisputes: 0, pendingPayouts: 0 });
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const initials  = userName.split(" ").filter(Boolean).map(n => n[0]).join("").toUpperCase().slice(0, 2) || "A";
  const roleLabel = ROLE_LABELS[role] ?? "Staff";

  const activeGroupLabel = NAV_GROUPS.find(g =>
    g.items.some(item =>
      item.href === "/admin/dashboard"
        ? pathname === "/admin/dashboard"
        : pathname.startsWith(item.href)
    )
  )?.label;

  useEffect(() => {
    if (activeGroupLabel) {
      setOpenGroups(prev => new Set([...prev, activeGroupLabel]));
    }
  }, [activeGroupLabel]);

  useEffect(() => {
    fetch("/api/admin/counts")
      .then(r => r.json())
      .then(d => setCounts(d))
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [userMenuOpen]);

  function toggle(label: string) {
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }

  function groupBadge(items: { badgeKey: string | null }[]): number {
    return items.reduce((s, it) => s + (it.badgeKey ? (counts[it.badgeKey as BadgeKey] ?? 0) : 0), 0);
  }

  return (
    <aside className="w-[240px] flex-shrink-0 hidden md:flex flex-col h-screen sticky top-0 bg-gray-950 border-r border-white/[0.06]">

      {/* ── Brand ── */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-[30px] h-[30px] rounded-lg bg-rose-500 flex items-center justify-center shrink-0">
            <Film className="w-4 h-4 text-white"/>
          </div>
          <span className="text-[14.5px] font-bold text-white tracking-tight">EditBridge</span>
        </div>
        <AdminThemeToggle />
      </div>

      {/* ── Search ── */}
      <div className="px-3 pb-3">
        <AdminGlobalSearch />
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2 scrollbar-none">
        <div className="space-y-0.5">
          {NAV_GROUPS.map(group => {
            const visible = group.items.filter(it => it.roles.includes(role));
            if (!visible.length) return null;

            const isOpen    = openGroups.has(group.label);
            const Icon      = group.icon;
            const total     = groupBadge(visible);
            const anyActive = visible.some(it =>
              it.href === "/admin/dashboard"
                ? pathname === "/admin/dashboard"
                : pathname.startsWith(it.href)
            );

            return (
              <div key={group.label}>
                <button
                  onClick={() => toggle(group.label)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-[9px] rounded-lg text-left text-[13px] font-medium transition-colors",
                    anyActive
                      ? "text-white"
                      : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.05]"
                  )}
                >
                  <Icon className={cn(
                    "w-[15px] h-[15px] shrink-0",
                    anyActive ? "text-rose-400" : "text-gray-600"
                  )}/>
                  <span className="flex-1 truncate">{group.label}</span>
                  {!isOpen && total > 0 && (
                    <span className="text-[10.5px] font-bold bg-rose-500 text-white rounded-full px-1.5 py-0.5 leading-none">
                      {total > 99 ? "99+" : total}
                    </span>
                  )}
                  {isOpen
                    ? <ChevronUp   className="w-3.5 h-3.5 text-gray-600 shrink-0"/>
                    : <ChevronDown className="w-3.5 h-3.5 text-gray-600 shrink-0"/>
                  }
                </button>

                {isOpen && (
                  <div className="ml-6 mt-0.5 mb-1 space-y-0.5">
                    {visible.map(({ href, label, badgeKey }) => {
                      const active = href === "/admin/dashboard"
                        ? pathname === "/admin/dashboard"
                        : pathname.startsWith(href);
                      const count  = badgeKey ? counts[badgeKey as BadgeKey] : 0;

                      return (
                        <Link key={href} href={href}
                          className={cn(
                            "flex items-center justify-between px-3 py-[7px] rounded-lg text-[12.5px] font-medium transition-colors",
                            active
                              ? "bg-white/10 text-white"
                              : "text-gray-500 hover:bg-white/[0.05] hover:text-gray-300"
                          )}
                        >
                          <span className="truncate">{label}</span>
                          {count > 0 && (
                            <span className={cn(
                              "text-[10.5px] font-bold rounded-full px-1.5 py-0.5 leading-none ml-1.5",
                              active
                                ? "bg-rose-500 text-white"
                                : "bg-gray-800 text-gray-400"
                            )}>
                              {count > 99 ? "99+" : count}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* ── Footer links ── */}
      <div className="px-2 pt-1 border-t border-white/[0.06]">
        <Link href="/admin/settings"
          className={cn(
            "flex items-center gap-2.5 px-3 py-[9px] rounded-lg text-[13px] font-medium transition-colors",
            pathname.startsWith("/admin/settings")
              ? "text-white bg-white/10"
              : "text-gray-500 hover:bg-white/[0.05] hover:text-gray-300"
          )}>
          <Settings className="w-[15px] h-[15px] shrink-0"/>
          Settings
        </Link>

        <div className="flex items-center gap-2.5 px-3 py-[9px] rounded-lg text-[13px] font-medium text-gray-600">
          <HelpCircle className="w-[15px] h-[15px] shrink-0"/>
          <span className="flex-1">Support</span>
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-900/40 rounded-full px-2 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"/>
            Online
          </span>
        </div>

        <Link href="/" target="_blank"
          className="flex items-center gap-2.5 px-3 py-[9px] rounded-lg text-[13px] font-medium text-gray-500 hover:bg-white/[0.05] hover:text-gray-300 transition-colors">
          <ExternalLink className="w-[15px] h-[15px] shrink-0"/>
          <span className="flex-1">Open website</span>
          <ExternalLink className="w-3 h-3 text-gray-700"/>
        </Link>
      </div>

      {/* ── User card ── */}
      <div className="p-3 border-t border-white/[0.06] relative" ref={userMenuRef}>
        {userMenuOpen && (
          <div className="absolute bottom-[calc(100%-8px)] left-3 right-3 bg-gray-900 rounded-xl shadow-2xl border border-white/[0.08] overflow-hidden z-50">
            <div className="p-1">
              <button
                onClick={() => { setUserMenuOpen(false); router.push("/admin/settings"); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-gray-300 hover:bg-white/[0.06] transition-colors text-left"
              >
                <UserCircle className="w-4 h-4 text-gray-500 shrink-0"/>
                <span className="flex-1">View profile</span>
              </button>
              <button
                onClick={() => { setUserMenuOpen(false); router.push("/admin/settings"); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-gray-300 hover:bg-white/[0.06] transition-colors text-left"
              >
                <Settings className="w-4 h-4 text-gray-500 shrink-0"/>
                <span className="flex-1">Account settings</span>
              </button>
              <Link
                href="/"
                target="_blank"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-gray-300 hover:bg-white/[0.06] transition-colors"
              >
                <BookOpen className="w-4 h-4 text-gray-500 shrink-0"/>
                <span className="flex-1">Documentation</span>
              </Link>
            </div>
            <div className="h-px bg-white/[0.06] mx-1"/>
            <div className="p-1">
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-red-400 hover:bg-red-900/30 transition-colors text-left"
              >
                <LogOut className="w-4 h-4 shrink-0"/>
                <span className="flex-1">Sign out</span>
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => setUserMenuOpen(v => !v)}
          className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl hover:bg-white/[0.05] transition-colors"
        >
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-rose-500 to-orange-400 flex items-center justify-center text-white text-[11px] font-bold select-none">
              {userImage
                ? <img src={userImage} alt={userName} className="w-full h-full object-cover"/>
                : initials}
            </div>
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border-[1.5px] border-gray-950"/>
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[12.5px] font-semibold text-gray-200 leading-tight truncate">
              {userName || "Admin"}
            </p>
            <p className="text-[11px] text-gray-500 leading-tight truncate">
              {roleLabel}
            </p>
          </div>
          <ChevronsUpDown className="w-3.5 h-3.5 text-gray-600 shrink-0"/>
        </button>
      </div>

    </aside>
  );
}

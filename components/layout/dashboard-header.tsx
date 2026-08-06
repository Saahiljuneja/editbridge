"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Plus, LogOut, Settings, User, Search, ChevronDown, Zap, ShieldCheck } from "lucide-react";
import { signOut } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { CommandPalette } from "./command-palette";

// ── Page title map ────────────────────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  // Client
  "/client/dashboard":       "Dashboard",
  "/client/orders":          "My Orders",
  "/client/messages":        "Messages",
  "/client/quotes":          "Quote Requests",
  "/client/calendar":        "Calendar",
  "/client/disputes":        "Disputes",
  "/client/rewards":         "Rewards & XP",
  "/client/xp-store":        "XP Store",
  "/client/referrals":       "Refer & Earn",
  "/client/profile":         "My Profile",
  "/client/reviews":         "My Reviews",
  "/client/analytics":       "Analytics",
  "/client/transactions":    "Transactions",
  "/client/payment-methods": "Payment Methods",
  "/client/saved-portfolio": "Saved Portfolio",
  "/client/brief-templates": "Brief Templates",
  "/client/notifications":   "Notifications",
  "/client/settings":        "Settings",
  "/client/help":            "Help & FAQ",
  "/client/saved":           "Saved Editors",
  // Editor
  "/editor/dashboard":       "Dashboard",
  "/editor/availability":    "Availability",
  "/editor/orders":          "Orders",
  "/editor/quotes":          "Quotes",
  "/editor/questions":       "Pre-order Q&A",
  "/editor/messages":        "Messages",
  "/editor/payouts":         "Payouts",
  "/editor/disputes":        "Disputes",
  "/editor/profile":         "My Profile",
  "/editor/saved-portfolio": "Saved",
  "/editor/packages":        "Services",
  "/editor/reviews":         "Reviews",
  "/editor/clients":         "Clients",
  "/editor/analytics":       "Analytics",
  "/editor/featured":        "Featured",
  "/editor/membership":      "Membership",
  "/editor/rewards":         "Rewards & XP",
  "/editor/xp-shop":         "XP Shop",
  "/editor/referrals":       "Refer & Earn",
  "/editor/notifications":   "Notifications",
  "/editor/settings":        "Settings",
  // Admin
  "/admin/dashboard":            "Dashboard",
  "/admin/orders":               "Orders",
  "/admin/users":                "Users",
  "/admin/kyc":                  "KYC Queue",
  "/admin/disputes":             "Disputes",
  "/admin/payouts":              "Payouts",
  "/admin/analytics":            "Analytics",
  "/admin/editor-performance":   "Editor Performance",
  "/admin/referrals":            "Referral Analytics",
  "/admin/blog":                 "Blog",
  "/admin/settings":             "Settings",
  "/admin/feature-flags":        "Feature Flags",
  "/admin/notifications":        "Notifications",
  "/admin/commission":           "Commission",
  "/admin/announcements":        "Announcements",
  "/admin/broadcast":            "Broadcast",
  "/admin/audit-log":            "Audit Log",
  "/admin/platform-health":      "Platform Health",
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  let bestLen = 0, bestTitle = "Dashboard";
  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(path) && path.length > bestLen) { bestLen = path.length; bestTitle = title; }
  }
  return bestTitle;
}

function getPortalLabel(pathname: string) {
  if (pathname.startsWith("/editor")) return "Editor Portal";
  if (pathname.startsWith("/admin"))  return "Admin Panel";
  return "Client Portal";
}

function getPortalPrefix(pathname: string) {
  if (pathname.startsWith("/editor")) return "/editor";
  if (pathname.startsWith("/admin"))  return "/admin";
  return "/client";
}

function getNotificationsHref(pathname: string) {
  if (pathname.startsWith("/editor")) return "/editor/notifications";
  if (pathname.startsWith("/admin"))  return "/admin/notifications";
  return "/client/notifications";
}

function getAvatarColor(pathname: string) {
  if (pathname.startsWith("/editor")) return "var(--brand-editor)";
  if (pathname.startsWith("/admin"))  return "#374151";
  return "var(--brand-client)";
}

// ── Stats ─────────────────────────────────────────────────────────────────────

interface HeaderStats {
  type: "client" | "editor" | "admin" | "unknown";
  activeOrders?: number;
  isAvailable?: boolean;
  monthEarnings?: number;
  pendingKyc?: number;
  openDisputes?: number;
  unreadNotifications?: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface DashboardHeaderProps {
  userName: string;
  userImage: string | null;
}

export function DashboardHeader({ userName, userImage }: DashboardHeaderProps) {
  const pathname = usePathname();
  const [stats, setStats] = useState<HeaderStats>({ type: "unknown" });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const title        = getPageTitle(pathname);
  const portalLabel  = getPortalLabel(pathname);
  const portalPrefix = getPortalPrefix(pathname);
  const notifHref    = getNotificationsHref(pathname);
  const avatarColor  = getAvatarColor(pathname);
  const initials     = userName.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U";

  // Fetch header stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/header/stats");
      if (res.ok) setStats(await res.json());
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, 30_000);
    return () => clearInterval(id);
  }, [fetchStats]);

  // Cmd/Ctrl+K → command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdOpen(true); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Availability toggle (editor)
  const toggleAvailability = async () => {
    if (stats.type !== "editor") return;
    const next = !stats.isAvailable;
    setStats((s) => ({ ...s, isAvailable: next }));
    const res = await fetch("/api/editor/availability", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: next }),
    });
    if (!res.ok) setStats((s) => ({ ...s, isAvailable: !next }));
  };

  const unreadCount = stats.unreadNotifications ?? 0;

  return (
    <>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />

      <header className="sticky top-0 z-20 hidden md:flex items-center justify-between h-14 px-5 bg-white border-b border-gray-100 shrink-0 gap-4">

        {/* ── Left: breadcrumb + context chips ── */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 shrink-0">{portalLabel}</span>
          <span className="text-gray-200 text-[10px] shrink-0">/</span>
          <h1 className="text-[14px] font-bold text-gray-900 truncate">{title}</h1>

          {/* Client: active orders chip */}
          {stats.type === "client" && (stats.activeOrders ?? 0) > 0 && (
            <Link
              href="/client/orders"
              className="ml-1 flex items-center gap-1.5 bg-sky-50 text-[#0EA5E9] text-[11px] px-2.5 py-1 rounded-full font-semibold border border-sky-100 hover:bg-sky-100 transition-colors shrink-0"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#0EA5E9] animate-pulse" />
              {stats.activeOrders} active
            </Link>
          )}

          {/* Editor: availability toggle */}
          {stats.type === "editor" && (
            <button
              onClick={toggleAvailability}
              title={stats.isAvailable ? "Click to go busy" : "Click to go available"}
              className={cn(
                "ml-1 flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold border transition-colors shrink-0",
                stats.isAvailable
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
                  : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", stats.isAvailable ? "bg-emerald-500 animate-pulse" : "bg-gray-400")} />
              {stats.isAvailable ? "Available" : "Busy"}
            </button>
          )}

          {/* Editor: month earnings */}
          {stats.type === "editor" && (stats.monthEarnings ?? 0) > 0 && (
            <span className="hidden lg:flex items-center gap-1 text-[11px] text-gray-500 shrink-0 ml-0.5">
              <Zap className="w-3 h-3 text-amber-400" />
              ₹{Math.round((stats.monthEarnings ?? 0) / 100).toLocaleString("en-IN")} this month
            </span>
          )}

          {/* Admin: KYC pending */}
          {stats.type === "admin" && (stats.pendingKyc ?? 0) > 0 && (
            <Link
              href="/admin/kyc"
              className="ml-1 flex items-center gap-1.5 bg-amber-50 text-amber-700 text-[11px] px-2.5 py-1 rounded-full font-semibold border border-amber-100 hover:bg-amber-100 transition-colors shrink-0"
            >
              <ShieldCheck className="w-3 h-3" />
              {stats.pendingKyc} KYC
            </Link>
          )}

          {/* Admin: open disputes */}
          {stats.type === "admin" && (stats.openDisputes ?? 0) > 0 && (
            <Link
              href="/admin/disputes"
              className="flex items-center gap-1.5 bg-red-50 text-red-600 text-[11px] px-2.5 py-1 rounded-full font-semibold border border-red-100 hover:bg-red-100 transition-colors shrink-0"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {stats.openDisputes} disputes
            </Link>
          )}
        </div>

        {/* ── Right: search · quick action · bell · user ── */}
        <div className="flex items-center gap-1.5 shrink-0">

          {/* Search / command palette trigger */}
          <button
            onClick={() => setCmdOpen(true)}
            className="hidden lg:flex items-center gap-2 h-8 px-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-400 text-[12px] hover:border-gray-300 hover:bg-white transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
            <kbd className="ml-1 text-[10px] bg-white border border-gray-200 rounded px-1 py-px font-mono">⌘K</kbd>
          </button>

          {/* Quick action — client only */}
          {pathname.startsWith("/client") && (
            <Link
              href="/find-editor"
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#0EA5E9] text-white text-[12px] font-semibold hover:bg-sky-600 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">New Order</span>
            </Link>
          )}

          {/* Notifications bell */}
          <Link
            href={notifHref}
            aria-label="Notifications"
            className="relative w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-[3px] leading-none">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>

          <div className="w-px h-5 bg-gray-100 mx-0.5" />

          {/* User menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2 pl-1 pr-2 h-8 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div
                className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                style={{ background: userImage ? "transparent" : avatarColor }}
              >
                {userImage
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={userImage} alt={userName} className="w-full h-full object-cover" />
                  : initials}
              </div>
              <span className="hidden xl:block text-[13px] font-semibold text-gray-800 max-w-[120px] truncate">
                {userName || "User"}
              </span>
              <ChevronDown className={cn("w-3.5 h-3.5 text-gray-400 transition-transform duration-150", userMenuOpen && "rotate-180")} />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50">
                {/* User info header */}
                <div className="px-3 py-2 border-b border-gray-100 mb-1">
                  <p className="text-[13px] font-semibold text-gray-900 truncate">{userName || "User"}</p>
                  <p className="text-[11px] text-gray-400 truncate">{portalLabel}</p>
                </div>

                <Link
                  href={`${portalPrefix}/profile`}
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-gray-400" /> My Profile
                </Link>
                <Link
                  href={`${portalPrefix}/settings`}
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-gray-400" /> Settings
                </Link>
                <Link
                  href={notifHref}
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Bell className="w-3.5 h-3.5 text-gray-400" />
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-auto text-[10px] font-bold bg-red-100 text-red-600 rounded-full px-1.5 py-px">
                      {unreadCount}
                    </span>
                  )}
                </Link>

                <div className="h-px bg-gray-100 my-1" />

                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

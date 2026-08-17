"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Plus, LogOut, Settings, User, Search, ChevronDown, Zap, ShieldCheck, Crown, X, ArrowLeft, Home } from "lucide-react";
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
  "/admin/editors":              "Editors",
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
  return "#000000";
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

// ── Notification row (used in bell dropdown) ──────────────────────────────────

function NotifRow({ n }: { n: { title: string; body: string | null; isRead: boolean; createdAt: string } }) {
  const ago = (() => {
    const diff = Date.now() - new Date(n.createdAt).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 2) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  })();
  return (
    <div className="flex items-start gap-2.5">
      {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-[#1e40af] shrink-0 mt-1.5" />}
      <div className={cn("flex-1 min-w-0", n.isRead && "pl-4")}>
        <p className="text-xs font-bold text-neutral-900 leading-snug truncate">{n.title}</p>
        {n.body && <p className="text-[10px] text-neutral-400 font-semibold leading-relaxed mt-0.5 line-clamp-2">{n.body}</p>}
        <p className="text-[9px] text-neutral-400 font-bold mt-1">{ago}</p>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface DashboardHeaderProps {
  userName: string;
  userImage: string | null;
}

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

export function DashboardHeader({ userName, userImage }: DashboardHeaderProps) {
  const pathname = usePathname();
  const [stats, setStats] = useState<HeaderStats>({ type: "unknown" });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

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
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch notifications when bell opens (client & editor portals)
  useEffect(() => {
    if (!bellOpen) return;
    if (!pathname.startsWith("/client") && !pathname.startsWith("/editor")) return;
    setNotifLoading(true);
    fetch("/api/client/notifications?limit=8")
      .then(r => r.ok ? r.json() : [])
      .then(d => setNotifs(d as Notification[]))
      .catch(() => {})
      .finally(() => setNotifLoading(false));
  }, [bellOpen, pathname]);

  const markAllRead = async () => {
    await fetch("/api/client/notifications", { method: "PATCH" }).catch(() => {});
    setNotifs(n => n.map(x => ({ ...x, isRead: true })));
    setStats(s => ({ ...s, unreadNotifications: 0 }));
  };

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

      <header className="sticky top-0 z-20 hidden md:flex items-center justify-between h-14 px-5 bg-white border-b border-neutral-200/60 shrink-0 gap-4">

        {/* ── Left: breadcrumb + context chips ── */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="text-[9px] font-black uppercase tracking-[0.18em] text-neutral-400 shrink-0">{portalLabel}</span>
          <span className="text-neutral-300 text-[10px] shrink-0">/</span>
          <h1 className="text-sm font-black text-black tracking-tight truncate">{title}</h1>

          {/* Client: active orders chip */}
          {stats.type === "client" && (stats.activeOrders ?? 0) > 0 && (
            <Link
              href="/client/orders"
              className="ml-1 flex items-center gap-1.5 bg-neutral-100 text-black text-[9px] px-2.5 py-1 rounded-full font-mono font-bold uppercase tracking-wider border border-neutral-200 hover:bg-neutral-200 transition-colors shrink-0"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
              {stats.activeOrders} active
            </Link>
          )}

          {/* Editor: availability toggle */}
          {stats.type === "editor" && (
            <button
              onClick={toggleAvailability}
              title={stats.isAvailable ? "Click to go busy" : "Click to go available"}
              className={cn(
                "ml-1 flex items-center gap-1.5 text-[9px] px-2.5 py-1 rounded-full font-mono font-bold uppercase tracking-wider border transition-colors shrink-0",
                stats.isAvailable
                  ? "bg-black text-white border-black hover:bg-neutral-900"
                  : "bg-neutral-50 text-neutral-400 border-neutral-200 hover:bg-neutral-100"
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", stats.isAvailable ? "bg-emerald-500 animate-pulse" : "bg-neutral-300")} />
              {stats.isAvailable ? "Available" : "Busy"}
            </button>
          )}

          {/* Editor: month earnings */}
          {stats.type === "editor" && (stats.monthEarnings ?? 0) > 0 && (
            <span className="hidden lg:flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 shrink-0 ml-0.5 font-mono">
              <Zap className="w-3 h-3 text-amber-500" />
              ₹{Math.round((stats.monthEarnings ?? 0) / 100).toLocaleString("en-IN")} this month
            </span>
          )}

          {/* Admin: KYC pending */}
          {stats.type === "admin" && (stats.pendingKyc ?? 0) > 0 && (
            <Link
              href="/admin/kyc"
              className="ml-1 flex items-center gap-1.5 bg-neutral-100 text-black text-[9px] px-2.5 py-1 rounded-full font-mono font-bold uppercase tracking-wider border border-neutral-200 hover:bg-neutral-200 transition-colors shrink-0"
            >
              <ShieldCheck className="w-3 h-3 text-neutral-800" />
              {stats.pendingKyc} KYC
            </Link>
          )}

          {/* Admin: open disputes */}
          {stats.type === "admin" && (stats.openDisputes ?? 0) > 0 && (
            <Link
              href="/admin/disputes"
              className="flex items-center gap-1.5 bg-red-50 text-red-600 text-[9px] px-2.5 py-1 rounded-full font-mono font-bold uppercase tracking-wider border border-red-200 hover:bg-red-100 transition-colors shrink-0"
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
            className="hidden lg:flex items-center gap-2 h-8 px-3 rounded-full bg-neutral-50/50 border border-neutral-200 text-neutral-400 text-[11px] font-medium hover:border-neutral-300 hover:bg-white transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
            <kbd className="ml-1 text-[9px] bg-white border border-neutral-200 rounded px-1.5 py-px font-mono">⌘K</kbd>
          </button>

          {/* Quick action — client only */}
          {pathname.startsWith("/client") && (
            <Link
              href="/browse"
              className="flex items-center gap-1.5 h-8 px-4 rounded-full bg-black text-white text-[10px] font-bold uppercase tracking-wider hover:bg-neutral-900 transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">New Order</span>
            </Link>
          )}

          {/* Upgrade to Pro — client only */}
          {pathname.startsWith("/client") && (
            <Link
              href="/client/membership"
              className="flex items-center gap-1.5 h-8 px-3.5 rounded-full text-white text-[10px] font-black uppercase tracking-wider transition-all shadow-sm hover:opacity-90 bg-[#1e40af] hover:bg-brand-primary"
            >
              <Crown className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Upgrade</span>
            </Link>
          )}

          {/* Upgrade to Premium — editor only */}
          {pathname.startsWith("/editor") && (
            <Link
              href="/editor/membership"
              className="flex items-center gap-1.5 h-8 px-4 rounded-full text-white text-[10px] font-black uppercase tracking-wider transition-all shadow-sm bg-[#1e40af] hover:bg-brand-primary"
            >
              <Crown className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
              <span>Upgrade</span>
            </Link>
          )}

          {/* Home Link — client, editor & admin portals */}
          {(pathname.startsWith("/client") || pathname.startsWith("/editor") || pathname.startsWith("/admin")) && (
            <Link
              href="/"
              className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-neutral-100 transition-colors"
              title="Go to Homepage"
            >
              <Home className="w-4 h-4 text-neutral-500" />
            </Link>
          )}

          {/* Settings Link — client, editor & admin portals */}
          {(pathname.startsWith("/client") || pathname.startsWith("/editor") || pathname.startsWith("/admin")) && (
            <Link
              href={`${portalPrefix}/settings`}
              className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-neutral-100 transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4 text-neutral-500" />
            </Link>
          )}

          {/* Bell — client & editor portals only */}
          {(pathname.startsWith("/client") || pathname.startsWith("/editor")) && (
            <div className="relative" ref={bellRef}>
              <button
                onClick={() => setBellOpen((v) => !v)}
                className="relative flex items-center justify-center w-8 h-8 rounded-full hover:bg-neutral-100 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4 text-neutral-500" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center leading-none">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-80 bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-neutral-200/60 z-50 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
                    <span className="text-xs font-black text-black uppercase tracking-wider">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-[10px] font-bold text-neutral-400 hover:text-black transition-colors uppercase tracking-wider"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* List */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-neutral-50">
                    {notifLoading ? (
                      <div className="px-4 py-8 text-center text-xs text-neutral-400 font-semibold">Loading…</div>
                    ) : notifs.length === 0 ? (
                      <div className="px-4 py-8 text-center text-xs text-neutral-400 font-semibold">No notifications yet</div>
                    ) : notifs.map((n) => (
                      <Link
                        key={n.id}
                        href={n.link ?? notifHref}
                        onClick={() => setBellOpen(false)}
                        className={cn(
                          "block px-4 py-3 hover:bg-neutral-50 transition-colors",
                          !n.isRead && "bg-blue-50/40"
                        )}
                      >
                        <NotifRow n={n} />
                      </Link>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="border-t border-neutral-100 px-4 py-2.5">
                    <Link
                      href={notifHref}
                      onClick={() => setBellOpen(false)}
                      className="text-[10px] font-bold text-neutral-400 hover:text-black transition-colors uppercase tracking-wider"
                    >
                      View all notifications →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2 pl-1 pr-2 h-8 rounded-full hover:bg-neutral-50 transition-colors"
            >
              <div
                className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-bold text-white shrink-0 bg-black"
              >
                {userImage
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={userImage} alt={userName} className="w-full h-full object-cover" />
                  : initials}
              </div>
              <span className="hidden xl:block text-xs font-bold text-neutral-800 max-w-[120px] truncate">
                {userName || "User"}
              </span>
              <ChevronDown className={cn("w-3.5 h-3.5 text-neutral-400 transition-transform duration-150", userMenuOpen && "rotate-180")} />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-neutral-200/60 p-1.5 z-50">
                {/* User info header */}
                <div className="px-3 py-2 border-b border-neutral-100 mb-1 select-none">
                  <p className="text-xs font-black text-black truncate">{userName || "User"}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 truncate mt-0.5">{portalLabel}</p>
                </div>

                <Link
                  href={`${portalPrefix}/profile`}
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-600 hover:text-black hover:bg-neutral-50 rounded-xl transition-colors font-semibold"
                >
                  <User className="w-3.5 h-3.5 text-neutral-400" /> My Profile
                </Link>



                <div className="h-px bg-neutral-100 my-1" />

                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-500 hover:bg-red-50 rounded-xl transition-colors font-bold"
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

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  // ── Client ──────────────────────────────────────────────────────────────────
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
  // ── Editor ──────────────────────────────────────────────────────────────────
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
  // ── Admin ───────────────────────────────────────────────────────────────────
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
  // Longest-prefix match for sub-routes (e.g. /client/orders/123)
  let bestLen = 0;
  let bestTitle = "Dashboard";
  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(path) && path.length > bestLen) {
      bestLen = path.length;
      bestTitle = title;
    }
  }
  return bestTitle;
}

function getNotificationsHref(pathname: string): string {
  if (pathname.startsWith("/editor")) return "/editor/notifications";
  if (pathname.startsWith("/admin"))  return "/admin/notifications";
  return "/client/notifications";
}

function getPortalLabel(pathname: string): string {
  if (pathname.startsWith("/editor")) return "Editor Portal";
  if (pathname.startsWith("/admin"))  return "Admin Panel";
  return "Client Portal";
}

function getAvatarColor(pathname: string): string {
  if (pathname.startsWith("/editor")) return "var(--brand-editor)";
  if (pathname.startsWith("/admin"))  return "#374151";
  return "var(--brand-client)";
}

interface DashboardHeaderProps {
  userName: string;
  userImage: string | null;
}

export function DashboardHeader({ userName, userImage }: DashboardHeaderProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const notificationsHref = getNotificationsHref(pathname);
  const portalLabel = getPortalLabel(pathname);
  const avatarColor = getAvatarColor(pathname);

  const initials = userName
    .split(" ")
    .filter(Boolean)
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <header className="sticky top-0 z-20 hidden md:flex items-center justify-between h-14 px-6 bg-white border-b border-gray-100 shrink-0">
      {/* Left: page context */}
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-[10.5px] font-bold uppercase tracking-widest text-gray-400 shrink-0">
          {portalLabel}
        </span>
        <span className="text-gray-200 text-[10px]">/</span>
        <h1 className="text-[14px] font-bold text-gray-900 truncate">{title}</h1>
      </div>

      {/* Right: actions + user */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Notifications */}
        <Link
          href={notificationsHref}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
        </Link>

        <div className="w-px h-5 bg-gray-100 mx-1" />

        {/* User */}
        <div className="flex items-center gap-2.5 pl-0.5">
          <div
            className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-[11px] font-bold text-white shrink-0"
            style={{ background: userImage ? "transparent" : avatarColor }}
          >
            {userImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={userImage} alt={userName} className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <span className="text-[13px] font-semibold text-gray-800 max-w-[140px] truncate">
            {userName || "User"}
          </span>
        </div>
      </div>
    </header>
  );
}

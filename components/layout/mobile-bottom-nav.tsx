"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import {
  Home,
  Compass,
  Newspaper,
  MoreHorizontal,
  LayoutDashboard,
  ShoppingBag,
  MessageCircle,
  Package,
  UserCheck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileNav } from "@/components/layout/mobile-nav";

type Tab =
  | { href: string; label: string; icon: React.ElementType; exact?: boolean; badge?: true; action?: never }
  | { href?: never; label: string; icon: React.ElementType; action: "more" };

const PUBLIC_TABS: Tab[] = [
  { href: "/",       label: "Home",   icon: Home,          exact: true },
  { href: "/browse", label: "Browse", icon: Compass },
  { href: "/feed",   label: "Feed",   icon: Newspaper },
  {                  label: "More",   icon: MoreHorizontal, action: "more" },
];

const CLIENT_TABS: Tab[] = [
  { href: "/client/dashboard", label: "Home",     icon: LayoutDashboard },
  { href: "/client/orders",    label: "Orders",   icon: ShoppingBag },
  { href: "/client/messages",  label: "Messages", icon: MessageCircle, badge: true },
  { href: "/browse",           label: "Browse",   icon: Compass },
  {                            label: "More",     icon: MoreHorizontal, action: "more" },
];

const EDITOR_TABS: Tab[] = [
  { href: "/editor/dashboard", label: "Home",     icon: LayoutDashboard },
  { href: "/editor/orders",    label: "Orders",   icon: Package },
  { href: "/editor/messages",  label: "Messages", icon: MessageCircle },
  { href: "/feed",             label: "Feed",     icon: Newspaper },
  {                            label: "More",     icon: MoreHorizontal, action: "more" },
];

const ADMIN_TABS: Tab[] = [
  { href: "/admin/dashboard", label: "Home",     icon: LayoutDashboard },
  { href: "/admin/orders",    label: "Orders",   icon: ShoppingBag },
  { href: "/admin/kyc",       label: "KYC",      icon: UserCheck },
  { href: "/admin/disputes",  label: "Disputes", icon: MessageCircle },
  {                           label: "More",     icon: MoreHorizontal, action: "more" },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const handleClose = useCallback(() => setDrawerOpen(false), []);

  const role = session?.user?.role;
  const isAdmin = role === "admin" || (typeof role === "string" && role.startsWith("staff_"));

  const tabs =
    role === "editor" ? EDITOR_TABS
    : isAdmin         ? ADMIN_TABS
    : role === "client" || session ? CLIENT_TABS
    : PUBLIC_TABS;

  useEffect(() => {
    if (!session || role !== "client") return;
    fetch("/api/client/unread-count")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setUnreadMessages(d.count ?? 0); })
      .catch(() => {});
  }, [session, role]);

  const tabHrefs = tabs.flatMap((t) => (t.href ? [t.href] : []));

  function isActive(tab: Tab) {
    if (!tab.href) return drawerOpen;
    if (tab.exact) return pathname === tab.href;
    return pathname === tab.href || pathname.startsWith(tab.href + "/");
  }

  return (
    <>
      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-neutral-200"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-stretch h-14">
          {tabs.map((tab) => {
            const active = isActive(tab);
            const shared = cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-1.5 transition-colors",
              active ? "text-[#1e40af]" : "text-neutral-400"
            );

            if (tab.action === "more") {
              const MenuIcon = drawerOpen ? X : MoreHorizontal;
              return (
                <button
                  key="more"
                  onClick={() => setDrawerOpen(!drawerOpen)}
                  aria-label={drawerOpen ? "Close menu" : "Open menu"}
                  aria-expanded={drawerOpen}
                  aria-haspopup="dialog"
                  className={shared}
                >
                  <div className="relative">
                    <MenuIcon className="w-5 h-5 shrink-0 transition-transform duration-200" />
                    {active && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1e40af]" />
                    )}
                  </div>
                  <span className="text-[10px] font-bold leading-none mt-1">{drawerOpen ? "Close" : "More"}</span>
                </button>
              );
            }

            const count = tab.badge ? unreadMessages : 0;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={shared}
                aria-current={active ? "page" : undefined}
              >
                <div className="relative">
                  <tab.icon className="w-5 h-5 shrink-0" />
                  {count > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[14px] h-3.5 px-0.5 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center leading-none">
                      {count > 9 ? "9+" : count}
                    </span>
                  )}
                  {active && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1e40af]" />
                  )}
                </div>
                <span className="text-[10px] font-bold leading-none mt-1">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <MobileNav open={drawerOpen} onClose={handleClose} excludeHrefs={tabHrefs} />
    </>
  );
}

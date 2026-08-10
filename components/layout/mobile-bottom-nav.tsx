"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import {
  Home,
  Compass,
  Newspaper,
  UserPlus,
  MoreHorizontal,
  LayoutDashboard,
  ShoppingBag,
  MessageCircle,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileNav } from "@/components/layout/mobile-nav";

type Tab =
  | { href: string; label: string; icon: React.ElementType; exact?: boolean; action?: never }
  | { href?: never; label: string; icon: React.ElementType; action: "more" };

const PUBLIC_TABS: Tab[] = [
  { href: "/",       label: "Home",   icon: Home,          exact: true },
  { href: "/browse", label: "Browse", icon: Compass },
  { href: "/feed",   label: "Feed",   icon: Newspaper },
  { href: "/signup", label: "Join",   icon: UserPlus },
  {                  label: "More",   icon: MoreHorizontal, action: "more" },
];

const CLIENT_TABS: Tab[] = [
  { href: "/browse",           label: "Browse",    icon: Compass },
  { href: "/client/orders",    label: "Orders",    icon: ShoppingBag },
  { href: "/client/messages",  label: "Messages",  icon: MessageCircle },
  { href: "/client/dashboard", label: "Home",      icon: LayoutDashboard },
  {                            label: "More",      icon: MoreHorizontal, action: "more" },
];

const EDITOR_TABS: Tab[] = [
  { href: "/editor/dashboard", label: "Home",      icon: LayoutDashboard },
  { href: "/editor/orders",    label: "Orders",    icon: Package },
  { href: "/editor/messages",  label: "Messages",  icon: MessageCircle },
  { href: "/feed",             label: "Feed",      icon: Newspaper },
  {                            label: "More",      icon: MoreHorizontal, action: "more" },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const role = session?.user?.role;
  const tabs =
    role === "editor" ? EDITOR_TABS
    : role === "client" ? CLIENT_TABS
    : session ? CLIENT_TABS          // admin / staff — use client tabs as fallback
    : PUBLIC_TABS;

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
            const Icon = tab.icon;
            const shared = cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-1.5 transition-colors",
              active ? "text-black" : "text-neutral-400"
            );

            if (tab.action === "more") {
              return (
                <button
                  key="more"
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Open menu"
                  className={shared}
                >
                  <Icon className={cn("w-5 h-5 shrink-0 transition-transform", drawerOpen && "rotate-90")} />
                  <span className="text-[9px] font-bold uppercase tracking-wider leading-none">
                    More
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={shared}
                aria-current={active ? "page" : undefined}
              >
                <div className="relative">
                  <Icon className="w-5 h-5 shrink-0" />
                  {/* Active dot indicator */}
                  {active && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-black" />
                  )}
                </div>
                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-wider leading-none mt-1",
                  active ? "text-black" : "text-neutral-400"
                )}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <MobileNav open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}

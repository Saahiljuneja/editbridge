"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Search, MessageSquare, Settings,
  Star, Heart, ClipboardList, CreditCard,
  Menu, X, LogOut, Film, Crown
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/client/dashboard", label: "Overview",    icon: LayoutDashboard },
  { href: "/client/orders",    label: "Orders",       icon: ClipboardList },
  { href: "/browse",           label: "Find Editors", icon: Search },
  { href: "/client/messages",      label: "Messages",      icon: MessageSquare, badgeKey: "unread" },
  { href: "/client/transactions",  label: "Payments",      icon: CreditCard },
  { href: "/client/saved", label: "Saved Editors", icon: Heart },
  { href: "/client/reviews", label: "Reviews", icon: Star },
  { href: "/client/settings", label: "Settings", icon: Settings },
];

type BadgeKey = "unread";
type Counts = Record<BadgeKey, number>;

export function ClientSidebar({
  userName: propUserName = "",
  userImage: propUserImage = null,
}: {
  userName?: string;
  userImage?: string | null;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userName = session?.user?.name ?? propUserName;
  const userImage = session?.user?.image ?? propUserImage;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [counts, setCounts] = useState<Counts>({ unread: 0 });

  const initials = userName.split(" ").filter(Boolean).map(n => n[0]).join("").toUpperCase().slice(0, 2) || "C";

  useEffect(() => {
    fetch("/api/client/unread-count")
      .then(r => r.json())
      .then(d => setCounts(p => ({ ...p, unread: d.count ?? 0 })))
      .catch(() => {});
  }, [pathname]);

  const activeItem = (href: string) => {
    return href === "/client/dashboard" ? pathname === href : pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4 bg-white border-b border-neutral-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center">
            <Film className="w-4 h-4 text-white" />
          </div>
          <span className="text-[15px] font-black text-neutral-900 tracking-tight">EditBridge</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="p-2 rounded-xl hover:bg-neutral-50 text-neutral-600 transition-colors">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-72 h-full bg-white flex flex-col justify-between py-6 px-4 shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center">
                    <Film className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[15px] font-black text-neutral-900 tracking-tight">EditBridge</span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-neutral-50 text-neutral-500">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <nav className="space-y-1">
                {NAV_ITEMS.map(item => {
                  const active = activeItem(item.href);
                  const Icon = item.icon;
                  const count = item.badgeKey ? counts[item.badgeKey as BadgeKey] : 0;
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
                        active
                          ? "bg-violet-600 text-white shadow-sm"
                          : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {count > 0 && (
                        <span className={cn("text-[10px] font-bold rounded-full px-2 py-0.5", active ? "bg-white text-violet-700" : "bg-violet-100 text-violet-700")}>
                          {count}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="border-t border-neutral-100 pt-4">
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-full bg-white border-r border-neutral-200/60 flex-shrink-0 justify-between select-none">
        <div className="flex flex-col">
          {/* Logo */}
          <div className="px-6 py-6 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center">
              <Film className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-lg font-black text-neutral-900 tracking-tight">EditBridge</span>
          </div>

          {/* Navigation */}
          <nav className="px-3 space-y-1">
            {NAV_ITEMS.map(item => {
              const active = activeItem(item.href);
              const Icon = item.icon;
              const count = item.badgeKey ? counts[item.badgeKey as BadgeKey] : 0;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all",
                    active
                      ? "bg-violet-600 text-white shadow-sm shadow-violet-600/10"
                      : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {count > 0 && (
                    <span className={cn("text-[10px] font-bold rounded-full px-2 py-0.5 leading-none", active ? "bg-white text-violet-700" : "bg-violet-100 text-violet-700")}>
                      {count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Upgrade Card + Logout */}
        <div className="px-4 pb-6 flex flex-col gap-4 shrink-0">
          {/* Upgrade Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1342] to-[#09041a] p-5 text-white shadow-lg flex flex-col items-center text-center">
            {/* Ambient subtle blur */}
            <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-violet-500/20 blur-xl pointer-events-none" />
            
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-3">
              <Crown className="w-5 h-5 text-amber-400 fill-amber-400" />
            </div>
            
            <p className="font-extrabold text-sm mb-1 tracking-tight">Upgrade to Pro</p>
            <p className="text-[10px] text-white/60 mb-4 leading-relaxed max-w-[160px]">
              Unlock more features and priority support.
            </p>
            
            <Link
              href="/client/rewards"
              className="w-full text-center py-2 rounded-xl text-xs font-black bg-violet-600 hover:bg-violet-700 text-white transition-all shadow-md shadow-violet-900/50"
            >
              Upgrade Now
            </Link>
          </div>

          {/* User Profile Summary */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center bg-violet-100 text-violet-700 text-xs font-bold shrink-0">
              {userImage ? (
                <img src={userImage} alt={userName} className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-neutral-800 truncate leading-tight">{userName}</p>
              <p className="text-[10px] text-neutral-400 truncate mt-0.5">Client</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

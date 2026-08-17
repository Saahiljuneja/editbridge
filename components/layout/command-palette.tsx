"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, LayoutDashboard, ShoppingBag, MessageSquare, FileQuestion, DollarSign, AlertTriangle, User, Package, BarChart2, Bell, Settings, HelpCircle, Gift, Bookmark, CreditCard, Calendar, Star, Users, Flag, Zap, Megaphone, Radio, ClipboardList, Activity, CalendarClock, Film, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Page {
  href: string;
  label: string;
  icon: React.ElementType;
  group?: string;
}

const CLIENT_PAGES: Page[] = [
  { href: "/client/dashboard",        label: "Dashboard",         icon: LayoutDashboard, group: "Main" },
  { href: "/client/orders",           label: "My Orders",         icon: ShoppingBag,     group: "Main" },
  { href: "/client/messages",         label: "Messages",          icon: MessageSquare,   group: "Main" },
  { href: "/client/quotes",           label: "Quote Requests",    icon: FileQuestion,    group: "Main" },
  { href: "/client/calendar",         label: "Calendar",          icon: Calendar,        group: "Main" },
  { href: "/client/disputes",         label: "Disputes",          icon: AlertTriangle,   group: "Main" },
  { href: "/client/profile",          label: "My Profile",        icon: User,            group: "Account" },
  { href: "/client/reviews",          label: "My Reviews",        icon: Star,            group: "Account" },
  { href: "/client/analytics",        label: "Analytics",         icon: BarChart2,       group: "Account" },
  { href: "/client/transactions",     label: "Transactions",      icon: DollarSign,      group: "Account" },
  { href: "/client/payment-methods",  label: "Payment Methods",   icon: CreditCard,      group: "Account" },
  { href: "/client/saved-portfolio",  label: "Saved Portfolio",   icon: Bookmark,        group: "Account" },
  { href: "/client/saved",            label: "Saved Editors",     icon: Users,           group: "Account" },
  { href: "/client/rewards",          label: "Rewards & XP",      icon: Zap,             group: "Perks" },
  { href: "/client/xp-store",         label: "XP Store",          icon: Gift,            group: "Perks" },
  { href: "/client/referrals",        label: "Refer & Earn",      icon: Gift,            group: "Perks" },
  { href: "/client/settings",         label: "Settings",          icon: Settings,        group: "Settings" },
  { href: "/client/help",             label: "Help & FAQ",        icon: HelpCircle,      group: "Settings" },
  { href: "/browse",                  label: "Find an Editor",    icon: Film,            group: "Actions" },
];

const EDITOR_PAGES: Page[] = [
  { href: "/editor/dashboard",        label: "Dashboard",         icon: LayoutDashboard, group: "Work" },
  { href: "/editor/availability",     label: "Availability",      icon: CalendarClock,   group: "Work" },
  { href: "/editor/orders",           label: "Orders",            icon: ShoppingBag,     group: "Work" },
  { href: "/editor/quotes",           label: "Quotes",            icon: FileQuestion,    group: "Work" },
  { href: "/editor/questions",        label: "Pre-order Q&A",     icon: HelpCircle,      group: "Work" },
  { href: "/editor/messages",         label: "Messages",          icon: MessageSquare,   group: "Work" },
  { href: "/editor/payments",         label: "Payments",          icon: DollarSign,      group: "Work" },
  { href: "/editor/disputes",         label: "Disputes",          icon: AlertTriangle,   group: "Work" },
  { href: "/editor/profile",          label: "My Profile",        icon: User,            group: "Profile" },
  { href: "/editor/packages",         label: "Services",          icon: Package,         group: "Profile" },
  { href: "/editor/reviews",          label: "Reviews",           icon: Star,            group: "Profile" },
  { href: "/editor/clients",          label: "Clients",           icon: Users,           group: "Profile" },
  { href: "/editor/analytics",        label: "Analytics",         icon: BarChart2,       group: "Profile" },
  { href: "/editor/featured",         label: "Featured",          icon: Zap,             group: "Growth" },
  { href: "/editor/membership",       label: "Membership",        icon: CreditCard,      group: "Growth" },
  { href: "/editor/rewards",          label: "Rewards & XP",      icon: Zap,             group: "Growth" },
  { href: "/editor/xp-shop",          label: "XP Shop",           icon: Gift,            group: "Growth" },
  { href: "/editor/referrals",        label: "Refer & Earn",      icon: Gift,            group: "Growth" },
  { href: "/editor/settings",         label: "Settings",          icon: Settings,        group: "Settings" },
];

const ADMIN_PAGES: Page[] = [
  { href: "/admin/dashboard",         label: "Dashboard",         icon: LayoutDashboard, group: "Overview" },
  { href: "/admin/orders",            label: "Orders",            icon: ShoppingBag,     group: "Overview" },
  { href: "/admin/users",             label: "Users",             icon: Users,           group: "Overview" },
  { href: "/admin/analytics",         label: "Analytics",         icon: BarChart2,       group: "Overview" },
  { href: "/admin/kyc",               label: "KYC Queue",         icon: ClipboardList,   group: "Moderation" },
  { href: "/admin/disputes",          label: "Disputes",          icon: AlertTriangle,   group: "Moderation" },
  { href: "/admin/payouts",           label: "Payouts",           icon: DollarSign,      group: "Moderation" },
  { href: "/admin/editor-performance",label: "Editor Performance",icon: BarChart2,       group: "Insights" },
  { href: "/admin/referrals",         label: "Referral Analytics",icon: Gift,            group: "Insights" },
  { href: "/admin/commission",        label: "Commission",        icon: DollarSign,      group: "Insights" },
  { href: "/admin/blog",              label: "Blog",              icon: FileQuestion,    group: "Content" },
  { href: "/admin/announcements",     label: "Announcements",     icon: Megaphone,       group: "Content" },
  { href: "/admin/broadcast",         label: "Broadcast",         icon: Radio,           group: "Content" },
  { href: "/admin/settings",          label: "Settings",          icon: Settings,        group: "System" },
  { href: "/admin/feature-flags",     label: "Feature Flags",     icon: Flag,            group: "System" },
  { href: "/admin/platform-health",   label: "Platform Health",   icon: Activity,        group: "System" },
  { href: "/admin/audit-log",         label: "Audit Log",         icon: ClipboardList,   group: "System" },
  { href: "/admin/notifications",     label: "Notifications",     icon: Bell,            group: "System" },
];

function getPages(pathname: string): Page[] {
  if (pathname.startsWith("/editor")) return EDITOR_PAGES;
  if (pathname.startsWith("/admin"))  return ADMIN_PAGES;
  return CLIENT_PAGES;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const pages = getPages(pathname);
  const filtered = query.trim()
    ? pages.filter((p) => p.label.toLowerCase().includes(query.toLowerCase()))
    : pages;

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => { setActiveIndex(0); }, [query]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
      if (e.key === "Enter" && filtered[activeIndex]) {
        router.push(filtered[activeIndex].href);
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, filtered, activeIndex, router, onClose]);

  if (!open) return null;

  // Group results when no query
  const groups: Record<string, Page[]> = {};
  filtered.forEach((p) => {
    const g = p.group ?? "Other";
    if (!groups[g]) groups[g] = [];
    groups[g].push(p);
  });
  const flatFiltered = filtered; // for keyboard index tracking

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[18vh]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />

      {/* Panel */}
      <div className="relative w-full max-w-[520px] mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages and actions…"
            className="flex-1 text-[14px] text-gray-800 placeholder:text-gray-400 outline-none bg-transparent"
          />
          <kbd className="text-[10px] text-gray-400 border border-gray-200 rounded px-1.5 py-0.5 font-mono shrink-0">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto py-1.5">
          {filtered.length === 0 ? (
            <p className="text-center text-[13px] text-gray-400 py-8">No results for &ldquo;{query}&rdquo;</p>
          ) : query.trim() ? (
            // Flat list when searching
            flatFiltered.map((page, i) => {
              const Icon = page.icon;
              return (
                <button
                  key={page.href}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => { router.push(page.href); onClose(); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                    i === activeIndex ? "bg-gray-50" : "hover:bg-gray-50"
                  )}
                >
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                    i === activeIndex ? "bg-[#1e40af]/10" : "bg-gray-100")}>
                    <Icon className={cn("w-3.5 h-3.5", i === activeIndex ? "text-[#1e40af]" : "text-gray-500")} />
                  </div>
                  <span className="text-[13px] font-medium text-gray-700 flex-1">{page.label}</span>
                  {i === activeIndex && <ArrowRight className="w-3.5 h-3.5 text-gray-400" />}
                </button>
              );
            })
          ) : (
            // Grouped when no query
            Object.entries(groups).map(([group, items]) => (
              <div key={group}>
                <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">{group}</p>
                {items.map((page) => {
                  const globalIndex = flatFiltered.indexOf(page);
                  const Icon = page.icon;
                  return (
                    <button
                      key={page.href}
                      onMouseEnter={() => setActiveIndex(globalIndex)}
                      onClick={() => { router.push(page.href); onClose(); }}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2 text-left transition-colors",
                        globalIndex === activeIndex ? "bg-gray-50" : "hover:bg-gray-50"
                      )}
                    >
                      <div className={cn("w-6 h-6 rounded-md flex items-center justify-center shrink-0",
                        globalIndex === activeIndex ? "bg-[#1e40af]/10" : "bg-gray-100")}>
                        <Icon className={cn("w-3.5 h-3.5", globalIndex === activeIndex ? "text-[#1e40af]" : "text-gray-400")} />
                      </div>
                      <span className="text-[13px] text-gray-700 flex-1">{page.label}</span>
                      {globalIndex === activeIndex && <ArrowRight className="w-3.5 h-3.5 text-gray-400" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2.5 border-t border-gray-100 flex items-center gap-3 text-[11px] text-gray-400">
          <span><kbd className="font-mono border border-gray-200 rounded px-1">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono border border-gray-200 rounded px-1">↵</kbd> open</span>
          <span><kbd className="font-mono border border-gray-200 rounded px-1">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}

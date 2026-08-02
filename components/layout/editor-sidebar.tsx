"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

import {
  LayoutDashboard, User, Package, ShoppingBag, DollarSign,
  MessageSquare, Settings, Star, BarChart2, AlertTriangle,
  Bell, Users, Zap, Sparkles, HelpCircle, Bookmark,
  FileQuestion, Gift, Film, Menu, X, LogOut, ArrowLeft,
  ChevronDown, ChevronUp, Briefcase, CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";

const ACCENT = "var(--brand-editor)";
const BG     = "#080512";

const NAV_GROUPS: { label: string; icon: React.ElementType; items: { href: string; label: string; icon: React.ElementType; badgeKey?: "messages" | "notifications"; flag?: string }[] }[] = [
  {
    label: "Work", icon: Briefcase,
    items: [
      { href: "/editor/dashboard",       label: "Dashboard",     icon: LayoutDashboard },
      { href: "/editor/availability",    label: "Availability",  icon: CalendarClock },
      { href: "/editor/orders",          label: "Orders",        icon: ShoppingBag },
      { href: "/editor/quotes",          label: "Quotes",        icon: FileQuestion },
      { href: "/editor/questions",       label: "Pre-order Q&A", icon: HelpCircle },
      { href: "/editor/messages",        label: "Messages",      icon: MessageSquare, badgeKey: "messages" as const },
      { href: "/editor/payouts",         label: "Payouts",       icon: DollarSign },
      { href: "/editor/disputes",        label: "Disputes",      icon: AlertTriangle },
    ],
  },
  {
    label: "Profile", icon: User,
    items: [
      { href: "/editor/profile",         label: "My Profile",    icon: User },
      { href: "/editor/saved-portfolio", label: "Saved",         icon: Bookmark },
      { href: "/editor/packages",        label: "Services",      icon: Package },
      { href: "/editor/reviews",         label: "Reviews",       icon: Star },
      { href: "/editor/clients",         label: "Clients",       icon: Users },
    ],
  },
  {
    label: "Grow", icon: BarChart2,
    items: [
      { href: "/editor/analytics",       label: "Analytics",     icon: BarChart2 },
      { href: "/editor/featured",        label: "Featured",      icon: Sparkles, flag: "featuredPlacementEnabled" },
      { href: "/editor/membership",      label: "Membership",    icon: DollarSign, flag: "editorMembershipPricingEnabled" },
      { href: "/editor/rewards",         label: "Rewards & XP",  icon: Zap },
      { href: "/editor/xp-shop",         label: "XP Shop",       icon: Sparkles },
      { href: "/editor/referrals",       label: "Refer & Earn",  icon: Gift },
    ],
  },
  {
    label: "Account", icon: Settings,
    items: [
      { href: "/editor/notifications",   label: "Notifications", icon: Bell, badgeKey: "notifications" as const },
      { href: "/editor/settings",        label: "Settings",      icon: Settings },
    ],
  },
];

const LEVEL_META: Record<string, { label: string; color: string; bg: string }> = {
  bronze:   { label: "Bronze",   color: "#B45309", bg: "#78350F40" },
  silver:   { label: "Silver",   color: "#9CA3AF", bg: "#6B728030" },
  gold:     { label: "Gold",     color: "#CA8A04", bg: "#78350F40" },
  platinum: { label: "Platinum", color: "#A78BFA", bg: "#4F46E540" },
};

type BadgeKey = "messages" | "notifications";
type Counts   = Record<BadgeKey, number>;

function isActive(href: string, pathname: string) {
  return href === "/editor/dashboard" ? pathname === href : pathname.startsWith(href);
}

function findActiveGroup(pathname: string): string | null {
  for (const g of NAV_GROUPS)
    for (const it of g.items)
      if (isActive(it.href, pathname)) return g.label;
  return null;
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function RailTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative w-full" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 z-[200] pointer-events-none flex items-center">
          <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-r-[5px] border-r-gray-800" />
          <div className="bg-gray-800 border border-white/10 text-white text-[11.5px] font-medium px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
            {label}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

function Panel({ pathname, counts, flags, onNavigate, userName, userImage, initials, xpLevel, editorId, activePanel, onActiveGroupChange }: {
  pathname: string; counts: Counts; flags: Record<string, boolean>; onNavigate?: () => void;
  userName: string; userImage: string | null; initials: string;
  xpLevel: string; editorId: string | null;
  activePanel: string | null; onActiveGroupChange: (label: string) => void;
}) {
  const navRef = useRef<HTMLDivElement>(null);
  const [showTopFade,    setShowTopFade]    = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function checkScroll() {
    const el = navRef.current;
    if (!el) return;
    setShowTopFade(el.scrollTop > 8);
    setShowBottomFade(el.scrollTop < el.scrollHeight - el.clientHeight - 8);
  }

  // Scroll to activePanel when it changes (due to clicking a Rail icon)
  useEffect(() => {
    if (activePanel) {
      const el = document.getElementById(`group-${activePanel}`);
      if (el && navRef.current) {
        isScrollingRef.current = true;
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        
        const targetOffset = el.offsetTop - 12; // offset from top
        navRef.current.scrollTo({ top: targetOffset, behavior: "smooth" });

        scrollTimeoutRef.current = setTimeout(() => {
          isScrollingRef.current = false;
        }, 800); // block observer updates during smooth scroll
      }
    }
  }, [activePanel]);

  // Intersection observer for scrollspy active icon highlight
  useEffect(() => {
    const container = navRef.current;
    if (!container) return;

    const options = {
      root: container,
      rootMargin: "-10px 0px -75% 0px", // triggers when section is near top
      threshold: 0,
    };

    const observer = new IntersectionObserver((entries) => {
      if (isScrollingRef.current) return; // ignore during click scroll
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const label = entry.target.id.replace("group-", "");
          onActiveGroupChange(label);
        }
      });
    }, options);

    NAV_GROUPS.forEach((g) => {
      const el = document.getElementById(`group-${g.label}`);
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [onActiveGroupChange]);

  const lm = LEVEL_META[xpLevel] ?? LEVEL_META.bronze;

  function itemLink(href: string, label: string, badgeKey: BadgeKey | undefined, ItemIcon: React.ElementType) {
    const active = isActive(href, pathname);
    const count  = badgeKey ? (counts[badgeKey] ?? 0) : 0;
    return (
      <Link key={href} href={href} onClick={onNavigate}
        className={cn(
          "flex items-center justify-between px-2.5 py-[10px] rounded-lg text-[12.5px] font-medium transition-all mb-0.5 group",
          active ? "bg-white/[0.08] text-white" : "text-white/55 hover:text-white hover:bg-white/[0.05]"
        )}>
        <span className="flex items-center gap-2.5 min-w-0">
          <span className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-colors",
            active ? "bg-white/10" : "bg-white/[0.04] group-hover:bg-white/[0.07]")}
            style={active ? { background: ACCENT + "28" } : {}}>
            <ItemIcon className="w-3.5 h-3.5" style={active ? { color: ACCENT } : {}} />
          </span>
          <span className="truncate">{label}</span>
        </span>
        {count > 0 && (
          <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none ml-1 shrink-0"
            style={{ background: active ? ACCENT : "rgba(255,255,255,0.1)", color: "white" }}>
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
    );
  }

  let activeItemLabel = "";
  for (const g of NAV_GROUPS) {
    const visibleItems = g.items.filter(it => !it.flag || flags[it.flag]);
    const found = visibleItems.find(it => isActive(it.href, pathname));
    if (found) {
      activeItemLabel = found.label;
      break;
    }
  }

  return (
    <div className="w-[240px] h-full flex flex-col border-r border-white/[0.05]"
      style={{ background: "rgba(255,255,255,0.028)" }}>
      <style>{`
        .sb-scroll::-webkit-scrollbar{width:3px}
        .sb-scroll::-webkit-scrollbar-track{background:transparent}
        .sb-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:99px}
        .sb-scroll::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,.28)}
      `}</style>

      {/* Header */}
      <div className="px-4 pt-5 pb-4 shrink-0">
        <p className="text-[10.5px] font-semibold uppercase tracking-widest mb-1" style={{ color: ACCENT + "99" }}>Editor Portal</p>
        <p className="text-[17px] font-bold text-white tracking-tight leading-tight">{activePanel ?? "Navigation"}</p>
        {activeItemLabel && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full mt-2"
            style={{ background: ACCENT + "20", color: ACCENT }}>
            {activeItemLabel}
          </span>
        )}
      </div>

      {/* Items */}
      <div className="relative flex-1 min-h-0">
        <div className={cn("absolute top-0 inset-x-0 h-4 z-10 pointer-events-none transition-opacity", showTopFade ? "opacity-100" : "opacity-0")}
          style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.028), transparent)" }} />
        <div ref={navRef} onScroll={checkScroll} className="h-full overflow-y-auto sb-scroll px-2 pb-4 scroll-smooth">
          {NAV_GROUPS.map(g => {
            const visibleItems = g.items.filter(it => !it.flag || flags[it.flag]);
            if (visibleItems.length === 0) return null;
            return (
              <div key={g.label} id={`group-${g.label}`} className="scroll-mt-3 mb-6 last:mb-2">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-white/30 px-2.5 mb-2">
                  {g.label}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map(it => itemLink(it.href, it.label, it.badgeKey, it.icon))}
                </div>
              </div>
            );
          })}
        </div>
        <div className={cn("absolute bottom-0 inset-x-0 h-4 z-10 pointer-events-none transition-opacity", showBottomFade ? "opacity-100" : "opacity-0")}
          style={{ background: "linear-gradient(to top, rgba(255,255,255,0.028), transparent)" }} />
      </div>

      {/* Quick actions */}
      <div className="shrink-0 border-t border-white/[0.06] px-3 pt-2.5 pb-1">
        <Link href="/"
          className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-[12.5px] font-medium text-white/45 hover:text-white hover:bg-white/[0.05] transition-colors mb-0.5">
          <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
          Back to website
        </Link>
      </div>

      {/* User footer */}
      <div className="shrink-0 border-t border-white/[0.06] px-3 py-3">
        <div className="flex items-center gap-2.5 px-1">
          <div className="relative shrink-0">
            <div className="relative w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-white text-[11px] font-bold"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, #0EA5E9)` }}>
              {userImage
                ? <img src={userImage} alt={userName} className="w-full h-full object-cover" />
                : initials}
            </div>
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border-2"
              style={{ borderColor: BG }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-semibold text-white truncate leading-tight">{userName || "Editor"}</p>
            <span className="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ color: lm.color, background: lm.bg }}>
              {lm.label}
            </span>
          </div>
          {editorId ? (
            <Link href={`/editor/${editorId}`} target="_blank" title="View public profile"
              className="shrink-0 p-1.5 rounded-lg text-white/25 hover:text-[var(--brand-client)] hover:bg-[var(--brand-client)]/10 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          ) : (
            <button onClick={() => signOut({ callbackUrl: "/" })} title="Sign out"
              className="shrink-0 p-1.5 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-400/10 transition-colors">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {editorId && (
          <div className="mt-2 px-1">
            <button onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11.5px] text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-colors">
              <LogOut className="w-3 h-3 shrink-0" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Rail ─────────────────────────────────────────────────────────────────────

function Rail({ pathname, counts, activePanel, onTogglePanel, progress }: {
  pathname: string; counts: Counts;
  activePanel: string | null; onTogglePanel: (label: string) => void;
  progress: number;
}) {
  const groupRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function railIconCls(active: boolean) {
    return cn(
      "relative flex items-center justify-center w-10 h-10 rounded-xl mx-auto transition-all duration-150",
      active ? "text-white" : "text-white/40 hover:text-white/80 hover:bg-white/[0.06]"
    );
  }

  return (
    <div className="w-14 flex-shrink-0 flex flex-col h-full relative">
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] z-30 overflow-hidden pointer-events-none">
        <div className="h-full transition-[width] ease-out"
          style={{ width: `${progress}%`, background: ACCENT, transitionDuration: progress === 0 ? "0ms" : progress === 100 ? "200ms" : "300ms" }} />
      </div>

      {/* Logo */}
      <div className="flex items-center justify-center pt-4 pb-3 shrink-0">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: ACCENT }}>
          <Film className="w-4 h-4 text-white" />
        </div>
      </div>

      <div className="mx-3 my-2 h-px bg-white/[0.06]" />

      {/* Group icons */}
      <div className="px-2 space-y-0.5">
        {NAV_GROUPS.map((group, idx) => {
          const Icon      = group.icon;
          const panelOpen = activePanel === group.label;
          const anyActive = group.items.some(it => isActive(it.href, pathname));
          const active    = panelOpen || anyActive;
          const hasBadge  = group.items.some(it => it.badgeKey && (counts[it.badgeKey] ?? 0) > 0);

          return (
            <RailTooltip key={group.label} label={group.label}>
              <button
                ref={el => { groupRefs.current[idx] = el; }}
                onClick={() => onTogglePanel(group.label)}
                onKeyDown={e => {
                  if (e.key === "ArrowDown") { e.preventDefault(); groupRefs.current[(idx + 1) % NAV_GROUPS.length]?.focus(); }
                  if (e.key === "ArrowUp")   { e.preventDefault(); groupRefs.current[(idx - 1 + NAV_GROUPS.length) % NAV_GROUPS.length]?.focus(); }
                  if (e.key === "Escape" && activePanel) onTogglePanel(activePanel);
                }}
                className={railIconCls(active)}
                style={panelOpen ? { background: ACCENT + "22" } : anyActive ? { background: "rgba(255,255,255,0.07)" } : {}}>
                <Icon className="w-4 h-4" style={active ? { color: ACCENT } : {}} />
                {hasBadge && (
                  <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full border-[2.5px]"
                    style={{ background: ACCENT, borderColor: BG }} />
                )}
                {panelOpen && (
                  <span className="absolute -right-2 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full"
                    style={{ background: ACCENT }} />
                )}
              </button>
            </RailTooltip>
          );
        })}
      </div>

      <div className="flex-1" />
    </div>
  );
}

// ─── Mobile drawer ────────────────────────────────────────────────────────────

function MobileDrawer({ pathname, counts, flags, onClose }: {
  pathname: string; counts: Counts; flags: Record<string, boolean>; onClose: () => void;
}) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const active = NAV_GROUPS.find(g => g.items.some(it => isActive(it.href, pathname)));
    return active ? new Set([active.label]) : new Set();
  });
  const toggleGroup = (label: string) =>
    setOpenGroups(prev => { const n = new Set(prev); n.has(label) ? n.delete(label) : n.add(label); return n; });

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: BG }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: ACCENT }}>
            <Film className="w-4 h-4 text-white" />
          </div>
          <span className="text-[15px] font-bold text-white">EditBridge</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.05] transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {NAV_GROUPS.map(group => {
          const Icon         = group.icon;
          const isOpen       = openGroups.has(group.label);
          const anyActive    = group.items.some(it => isActive(it.href, pathname));
          const visibleItems = group.items.filter(it => !it.flag || flags[it.flag]);
          const groupBadgeCount = visibleItems.reduce((sum, it) =>
            sum + (it.badgeKey ? (counts[it.badgeKey] ?? 0) : 0), 0);
          return (
            <div key={group.label} className="mb-1">
              <button onClick={() => toggleGroup(group.label)}
                className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors",
                  anyActive ? "text-white" : "text-white/60 hover:text-white hover:bg-white/[0.05]")}>
                <Icon className={cn("w-4 h-4 shrink-0", anyActive ? "text-white" : "text-white/40")} />
                <span className="flex-1 text-left">{group.label}</span>
                {groupBadgeCount > 0 && (
                  <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none mr-0.5"
                    style={{ background: ACCENT, color: "white" }}>
                    {groupBadgeCount > 99 ? "99+" : groupBadgeCount}
                  </span>
                )}
                {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-white/40" /> : <ChevronDown className="w-3.5 h-3.5 text-white/40" />}
              </button>
              {isOpen && (
                <div className="ml-7 mt-0.5">
                  {visibleItems.map(it => {
                    const active = isActive(it.href, pathname);
                    const count  = it.badgeKey ? (counts[it.badgeKey] ?? 0) : 0;
                    return (
                      <Link key={it.href} href={it.href} onClick={onClose}
                        className={cn("flex items-center justify-between px-4 py-2.5 text-[13px] font-medium transition-colors",
                          active ? "text-white" : "text-white/60 hover:text-white")}>
                        <span className="flex items-center gap-2">
                          {active && <span className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} />}
                          {it.label}
                        </span>
                        {count > 0 && (
                          <span className="text-[10.5px] font-bold rounded-full px-1.5 py-0.5 leading-none"
                            style={{ background: active ? ACCENT : "rgba(255,255,255,0.1)", color: "white" }}>
                            {count}
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

      <div className="px-4 py-3 border-t border-white/[0.06] shrink-0">
        <Link href="/editor/settings" onClick={onClose}
          className="flex items-center gap-2.5 text-[13px] text-white/60 hover:text-white transition-colors py-2">
          <Settings className="w-4 h-4" /> Settings
        </Link>
        <button onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-2.5 text-[13px] text-white/60 hover:text-red-400 transition-colors py-2 w-full">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </div>
  );
}

// ─── EditorSidebar ────────────────────────────────────────────────────────────

interface EditorSidebarProps {
  featuredPlacementEnabled?: boolean;
  editorMembershipPricingEnabled?: boolean;
  userName?: string;
  userImage?: string | null;
  xpLevel?: string;
  editorId?: string | null;
  userId?: string | null;
}

export function EditorSidebar({
  featuredPlacementEnabled = true,
  editorMembershipPricingEnabled = false,
  userName: propUserName = "",
  userImage: propUserImage = null,
  xpLevel = "bronze",
  editorId = null,
  userId = null,
}: EditorSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userName = session?.user?.name ?? propUserName;
  const userImage = session?.user?.image ?? propUserImage;

  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [counts,      setCounts]      = useState<Counts>({ messages: 0, notifications: 0 });
  const [progress,    setProgress]    = useState(0);
  const transitioning  = useRef(false);
  const progressTimer  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flags    = { featuredPlacementEnabled, editorMembershipPricingEnabled };
  const initials = userName.split(" ").filter(Boolean).map(n => n[0]).join("").toUpperCase().slice(0, 2) || "E";

  // Init panel
  useEffect(() => {
    const groupLabel = findActiveGroup(pathname);
    setActivePanel(groupLabel ?? NAV_GROUPS[0].label);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-switch panel on navigation
  useEffect(() => {
    const groupLabel = findActiveGroup(pathname);
    if (groupLabel) setActivePanel(groupLabel);
  }, [pathname]);

  // Badge counts
  useEffect(() => {
    fetch("/api/editor/unread-count")
      .then(r => r.json())
      .then(d => setCounts({ messages: d.count ?? 0, notifications: d.notifications ?? 0 }))
      .catch(() => {});
  }, [pathname]);

  // Pusher real-time
  useEffect(() => {
    if (!userId) return;
    let client: import("pusher-js").default | null = null;
    import("pusher-js").then(mod => {
      const PusherClient = mod.default;
      client = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        authEndpoint: "/api/chat/pusher-auth",
      });
      const ch = client.subscribe(`private-user-${userId}`);
      ch.bind("notification", () => setCounts(prev => ({ ...prev, notifications: prev.notifications + 1 })));
    });
    return () => { client?.unsubscribe(`private-user-${userId}`); };
  }, [userId]);

  // Progress bar
  useEffect(() => {
    if (transitioning.current) {
      transitioning.current = false;
      clearTimeout(progressTimer.current);
      setProgress(100);
      progressTimer.current = setTimeout(() => setProgress(0), 380);
    }
  }, [pathname]);

  // Mobile swipe
  useEffect(() => {
    let sx = 0, sy = 0;
    const onStart = (e: TouchEvent) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; };
    const onEnd   = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = Math.abs(e.changedTouches[0].clientY - sy);
      if (!mobileOpen && sx <= 24 && dx > 60 && dy < 80) setMobileOpen(true);
      if (mobileOpen  && dx < -60 && dy < 80)            setMobileOpen(false);
    };
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend",   onEnd,   { passive: true });
    return () => { document.removeEventListener("touchstart", onStart); document.removeEventListener("touchend", onEnd); };
  }, [mobileOpen]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  function handleNavigate() {
    setMobileOpen(false);
    transitioning.current = true;
    setProgress(18);
    clearTimeout(progressTimer.current);
    progressTimer.current = setTimeout(() => { if (transitioning.current) setProgress(68); }, 90);
  }

  function handleTogglePanel(label: string) {
    setActivePanel(prev => prev === label ? null : label);
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center gap-3 px-4 border-b border-white/[0.06]"
        style={{ background: BG }}>
        <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg text-white hover:bg-white/[0.05] transition-colors">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: ACCENT }}>
            <Film className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[14px] font-bold text-white tracking-tight">EditBridge</span>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-72 h-full shadow-2xl">
            <MobileDrawer pathname={pathname} counts={counts} flags={flags} onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.06]"
        style={{ background: BG }}>
        <div className="flex h-14">
          {NAV_GROUPS.slice(0, 3).map(group => {
            const Icon      = group.icon;
            const firstHref = group.items[0].href;
            const groupActive = group.items.some(it => isActive(it.href, pathname));
            const hasBadge  = group.items.some(it => it.badgeKey && (counts[it.badgeKey] ?? 0) > 0);
            return (
              <Link key={group.label} href={firstHref}
                className={cn("flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors",
                  groupActive ? "text-white" : "text-white/40")}>
                {groupActive && (
                  <span className="absolute top-0 inset-x-3 h-[2px] rounded-full" style={{ background: ACCENT }} />
                )}
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {hasBadge && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border-[2px]"
                      style={{ background: ACCENT, borderColor: BG }} />
                  )}
                </div>
                <span className="text-[9.5px] font-medium">{group.label}</span>
              </Link>
            );
          })}
          <button onClick={() => setMobileOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-white/40 transition-colors">
            <Menu className="w-5 h-5" />
            <span className="text-[9.5px] font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex h-full flex-shrink-0 border-r border-white/[0.06] transition-[width] duration-250 ease-in-out overflow-hidden"
        style={{ width: activePanel !== null ? 56 + 240 : 56, background: BG }}>
        <Rail pathname={pathname} counts={counts} activePanel={activePanel}
          onTogglePanel={handleTogglePanel} progress={progress} />
        <div className={cn("overflow-hidden transition-[width,opacity] duration-250 ease-in-out flex-shrink-0",
          activePanel !== null ? "opacity-100" : "opacity-0 pointer-events-none")}
          style={{ width: activePanel !== null ? 240 : 0 }}>
          {activePanel !== null && (
            <Panel pathname={pathname} counts={counts} flags={flags} onNavigate={handleNavigate}
              userName={userName} userImage={userImage} initials={initials} xpLevel={xpLevel} editorId={editorId}
              activePanel={activePanel} onActiveGroupChange={setActivePanel} />
          )}
        </div>
      </aside>
    </>
  );
}

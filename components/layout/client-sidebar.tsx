"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard, Search, MessageSquare, Settings,
  Star, Heart, ClipboardList, CreditCard, Wallet,
  Menu, X, LogOut, Film,
  ShieldAlert, Zap, User, HelpCircle, Crown,
  Briefcase, DollarSign, ChevronDown, ChevronUp, ArrowLeft, BarChart2,
  Bell, Gift, Store
} from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";

const ACCENT = "#1e40af"; // sky-500
const BG     = "#ffffff";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  badgeKey?: "unread";
};

type NavGroup = {
  label: string;
  icon: React.ElementType;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Work",
    icon: Briefcase,
    items: [
      { href: "/client/dashboard", label: "Overview",    icon: LayoutDashboard },
      { href: "/client/analytics", label: "Analytics",   icon: BarChart2 },
      { href: "/client/orders",    label: "Orders",       icon: ClipboardList },
      { href: "/browse",           label: "Find Editors", icon: Search },
      { href: "/client/messages",  label: "Messages",     icon: MessageSquare, badgeKey: "unread" },
      { href: "/client/disputes",  label: "Disputes",     icon: ShieldAlert },
    ],
  },
  {
    label: "Financial",
    icon: DollarSign,
    items: [
      { href: "/client/transactions", label: "Payments",     icon: CreditCard },
      { href: "/client/wallet",       label: "My Wallet",    icon: Wallet },
      { href: "/client/rewards",      label: "Rewards & XP", icon: Zap },
      { href: "/client/xp-shop",      label: "XP Shop",      icon: Store },
      { href: "/client/membership",   label: "Membership",   icon: Crown },
      { href: "/client/referral",     label: "Refer & Earn", icon: Gift },
    ],
  },
  {
    label: "Account",
    icon: User,
    items: [
      { href: "/client/profile",        label: "My Profile",     icon: User },
      { href: "/client/saved",          label: "Saved Editors",  icon: Heart },
      { href: "/client/reviews",        label: "Reviews",        icon: Star },
      { href: "/client/notifications",  label: "Notifications",  icon: Bell },
      { href: "/client/help",           label: "Help & Support", icon: HelpCircle },
      { href: "/client/settings",       label: "Settings",       icon: Settings },
    ],
  },
];

type Counts = Record<"unread", number>;

function isActive(href: string, pathname: string) {
  return href === "/client/dashboard" || href === "/browse"
    ? pathname === href
    : pathname.startsWith(href);
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
          <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-r-[5px] border-r-neutral-800" />
          <div className="bg-neutral-800 border border-neutral-700 text-white text-[11.5px] font-medium px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
            {label}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

function Panel({ pathname, counts, onNavigate, userName, userImage, initials, activePanel, onActiveGroupChange }: {
  pathname: string; counts: Counts; onNavigate?: () => void;
  userName: string; userImage: string | null; initials: string;
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

  function itemLink(href: string, label: string, badgeKey: "unread" | undefined, ItemIcon: React.ElementType) {
    const active = isActive(href, pathname);
    const count  = badgeKey ? (counts[badgeKey] ?? 0) : 0;
    return (
      <Link key={href} href={href} onClick={onNavigate}
        className={cn(
          "flex items-center justify-between px-3.5 py-[9px] rounded-xl text-[12.5px] font-bold transition-all mb-0.5 group",
          active ? "bg-blue-50 text-blue-900 shadow-sm shadow-blue-800/5" : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
        )}>
        <span className="flex items-center gap-2.5 min-w-0">
          <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
            active ? "bg-blue-100" : "bg-neutral-100 group-hover:bg-neutral-200/50")}>
            <ItemIcon className="w-3.5 h-3.5" style={active ? { color: ACCENT } : {}} />
          </span>
          <span className="truncate">{label}</span>
        </span>
        {count > 0 && (
          <span className="text-[10px] font-bold rounded-full px-2 py-0.5 leading-none ml-1 shrink-0 bg-blue-100 text-blue-900">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
    );
  }

  let activeItemLabel = "";
  for (const g of NAV_GROUPS) {
    const found = g.items.find(it => isActive(it.href, pathname));
    if (found) {
      activeItemLabel = found.label;
      break;
    }
  }

  return (
    <div className="w-[240px] h-full flex flex-col border-r border-neutral-200/60 bg-white">
      <style>{`
        .sb-scroll::-webkit-scrollbar{width:3px}
        .sb-scroll::-webkit-scrollbar-track{background:transparent}
        .sb-scroll::-webkit-scrollbar-thumb{background:rgba(0,0,0,.08);border-radius:99px}
        .sb-scroll::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.15)}
      `}</style>

      {/* Header */}
      <div className="px-4 pt-5 pb-4 shrink-0">
        <p className="text-[10.5px] font-black uppercase tracking-widest mb-1 text-brand-primary">Client Portal</p>
        <p className="text-[17px] font-black text-neutral-850 tracking-tight leading-tight">{activePanel ?? "Navigation"}</p>
        {activeItemLabel && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full mt-2 bg-blue-50 text-blue-900 border border-blue-100">
            {activeItemLabel}
          </span>
        )}
      </div>

      {/* Items */}
      <div className="relative flex-1 min-h-0">
        <div className={cn("absolute top-0 inset-x-0 h-4 z-10 pointer-events-none transition-opacity", showTopFade ? "opacity-100" : "opacity-0")}
          style={{ background: "linear-gradient(to bottom, #ffffff, transparent)" }} />
        <div ref={navRef} onScroll={checkScroll} className="h-full overflow-y-auto sb-scroll px-2 pb-4 scroll-smooth">
          {NAV_GROUPS.map(g => (
            <div key={g.label} id={`group-${g.label}`} className="scroll-mt-3 mb-6 last:mb-2">
              <p className="text-[10.5px] font-black uppercase tracking-wider text-neutral-400 px-2.5 mb-2">
                {g.label}
              </p>
              <div className="space-y-0.5">
                {g.items.map(it => itemLink(it.href, it.label, it.badgeKey, it.icon))}
              </div>
            </div>
          ))}
        </div>
        <div className={cn("absolute bottom-0 inset-x-0 h-4 z-10 pointer-events-none transition-opacity", showBottomFade ? "opacity-100" : "opacity-0")}
          style={{ background: "linear-gradient(to top, #ffffff, transparent)" }} />
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
      active ? "text-blue-900 bg-blue-50" : "text-neutral-400 hover:text-neutral-850 hover:bg-neutral-100/50"
    );
  }

  return (
    <div className="w-14 flex-shrink-0 flex flex-col h-full bg-neutral-50/50 border-r border-neutral-200/50 relative">
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] z-30 overflow-hidden pointer-events-none">
        <div className="h-full transition-[width] ease-out"
          style={{ width: `${progress}%`, background: ACCENT, transitionDuration: progress === 0 ? "0ms" : progress === 100 ? "200ms" : "300ms" }} />
      </div>

      {/* Logo */}
      <div className="flex items-center justify-center pt-4 pb-3 shrink-0">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-brand-primary">
          <Film className="w-4 h-4 text-white" />
        </div>
      </div>

      <div className="mx-3 my-2 h-px bg-neutral-200/60" />

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
                style={panelOpen ? { background: "rgba(30, 64, 175, 0.08)" } : anyActive ? { background: "rgba(30, 64, 175, 0.04)" } : {}}>
                <Icon className="w-4.5 h-4.5" style={active ? { color: ACCENT } : {}} />
                {hasBadge && (
                  <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full border-[2px] border-white bg-brand-primary" />
                )}
                {panelOpen && (
                  <span className="absolute -right-2 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-brand-primary" />
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

function MobileDrawer({ pathname, counts, onClose }: {
  pathname: string; counts: Counts; onClose: () => void;
}) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const active = NAV_GROUPS.find(g => g.items.some(it => isActive(it.href, pathname)));
    return active ? new Set([active.label]) : new Set();
  });
  const toggleGroup = (label: string) =>
    setOpenGroups(prev => { const n = new Set(prev); n.has(label) ? n.delete(label) : n.add(label); return n; });

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-brand-primary">
            <Film className="w-4 h-4 text-white" />
          </div>
          <span className="text-[15px] font-black text-neutral-850">EditBridge</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-neutral-450 hover:bg-neutral-50 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {NAV_GROUPS.map(group => {
          const Icon         = group.icon;
          const isOpen       = openGroups.has(group.label);
          const anyActive    = group.items.some(it => isActive(it.href, pathname));
          const visibleItems = group.items;
          const groupBadgeCount = visibleItems.reduce((sum, it) =>
            sum + (it.badgeKey ? (counts[it.badgeKey] ?? 0) : 0), 0);
          return (
            <div key={group.label} className="mb-1">
              <button onClick={() => toggleGroup(group.label)}
                className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold transition-colors",
                  anyActive ? "text-blue-900 bg-blue-50/40" : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50")}>
                <Icon className={cn("w-4 h-4 shrink-0", anyActive ? "text-brand-primary" : "text-neutral-450")} />
                <span className="flex-1 text-left">{group.label}</span>
                {groupBadgeCount > 0 && (
                  <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none mr-0.5 bg-blue-100 text-blue-900">
                    {groupBadgeCount > 99 ? "99+" : groupBadgeCount}
                  </span>
                )}
                {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />}
              </button>
              {isOpen && (
                <div className="ml-7 mt-0.5">
                  {visibleItems.map(it => {
                    const active = isActive(it.href, pathname);
                    const count  = it.badgeKey ? (counts[it.badgeKey] ?? 0) : 0;
                    return (
                      <Link key={it.href} href={it.href} onClick={onClose}
                        className={cn("flex items-center justify-between px-4 py-2.5 text-[13px] font-bold transition-colors",
                          active ? "text-blue-900 font-extrabold" : "text-neutral-500 hover:text-neutral-800")}>
                        <span className="flex items-center gap-2">
                          {active && <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />}
                          {it.label}
                        </span>
                        {count > 0 && (
                          <span className="text-[10.5px] font-bold rounded-full px-1.5 py-0.5 leading-none bg-blue-100 text-blue-900">
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

      <div className="px-4 py-3 border-t border-neutral-100 shrink-0">
        <Link href="/client/settings" onClick={onClose}
          className="flex items-center gap-2.5 text-[13px] text-neutral-500 hover:text-neutral-800 transition-colors py-2 font-bold">
          <Settings className="w-4 h-4" /> Settings
        </Link>
        <button onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2.5 text-[13px] text-neutral-500 hover:text-red-500 transition-colors py-2 w-full font-bold">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </div>
  );
}

// ─── ClientSidebar ────────────────────────────────────────────────────────────

interface ClientSidebarProps {
  userName?: string;
  userImage?: string | null;
}

export function ClientSidebar({
  userName: propUserName = "",
  userImage: propUserImage = null,
}: ClientSidebarProps) {
  const pathname = usePathname();
  const userName = propUserName;
  const userImage = propUserImage;

  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [counts,      setCounts]      = useState<Counts>({ unread: 0 });
  const [progress,    setProgress]    = useState(0);
  const transitioning  = useRef(false);
  const progressTimer  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const initials = userName.split(" ").filter(Boolean).map(n => n[0]).join("").toUpperCase().slice(0, 2) || "C";

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
    fetch("/api/client/unread-count")
      .then(r => r.json())
      .then(d => setCounts({ unread: d.count ?? 0 }))
      .catch(() => {});
  }, [pathname]);

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
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center gap-3 px-4 border-b border-neutral-200 bg-white">
        <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-brand-primary">
            <Film className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[14px] font-black text-neutral-850 tracking-tight">EditBridge</span>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-72 h-full shadow-2xl">
            <MobileDrawer pathname={pathname} counts={counts} onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white">
        <div className="flex h-14">
          {NAV_GROUPS.slice(0, 3).map(group => {
            const Icon      = group.icon;
            const firstHref = group.items[0].href;
            const groupActive = group.items.some(it => isActive(it.href, pathname));
            const hasBadge  = group.items.some(it => it.badgeKey && (counts[it.badgeKey] ?? 0) > 0);
            return (
              <Link key={group.label} href={firstHref}
                className={cn("flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors",
                  groupActive ? "text-brand-primary font-bold" : "text-neutral-450")}>
                {groupActive && (
                  <span className="absolute top-0 inset-x-3 h-[2px] rounded-full bg-brand-primary" />
                )}
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {hasBadge && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border-[2px] border-white bg-brand-primary" />
                  )}
                </div>
                <span className="text-[9.5px] font-bold">{group.label}</span>
              </Link>
            );
          })}
          <button onClick={() => setMobileOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-neutral-450 transition-colors">
            <Menu className="w-5 h-5" />
            <span className="text-[9.5px] font-bold">More</span>
          </button>
        </div>
      </nav>

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex h-full flex-shrink-0 border-r border-neutral-200/60 transition-[width] duration-250 ease-in-out overflow-hidden"
        style={{ width: activePanel !== null ? 56 + 240 : 56, background: BG }}>
        <Rail pathname={pathname} counts={counts} activePanel={activePanel}
          onTogglePanel={handleTogglePanel} progress={progress} />
        <div className={cn("overflow-hidden transition-[width,opacity] duration-250 ease-in-out flex-shrink-0",
          activePanel !== null ? "opacity-100" : "opacity-0 pointer-events-none")}
          style={{ width: activePanel !== null ? 240 : 0 }}>
          {activePanel !== null && (
            <Panel pathname={pathname} counts={counts} onNavigate={handleNavigate}
              userName={userName} userImage={userImage} initials={initials}
              activePanel={activePanel} onActiveGroupChange={setActivePanel} />
          )}
        </div>
      </aside>
    </>
  );
}

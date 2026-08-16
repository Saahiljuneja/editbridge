"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  LayoutDashboard, ShoppingBag, Users, MessageSquare, UserCheck, Scale,
  Wallet, TrendingUp, DollarSign, CreditCard, RefreshCw, RotateCcw,
  Shield, Eye, Flag, AlertTriangle, BookOpen, Award, Bell, Radio,
  Server, Settings, UserCog, List, Activity, Percent, ToggleLeft, Paintbrush,
  Search, Film, X, LogOut, ExternalLink, Menu, Copy, Check, Pin,
  ChevronUp, ChevronDown, Award as PinnedAward, Briefcase, Mail, Newspaper, ArrowLeft,
  BarChart2, Share2
} from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";
import { AdminGlobalSearch } from "./admin-global-search";
import { toast } from "sonner";

// ─── Theme ───────────────────────────────────────────────────────────────────

type SidebarThemeId = "gray" | "navy" | "forest" | "violet" | "slate";
const SIDEBAR_THEMES: { id: SidebarThemeId; label: string; bg: string; accent: string }[] = [
  { id: "navy",   label: "Default", bg: "#ffffff", accent: "#1e40af" },
  { id: "gray",   label: "Rose",    bg: "#ffffff", accent: "#f43f5e" },
  { id: "forest", label: "Forest",  bg: "#ffffff", accent: "#22c55e" },
  { id: "violet", label: "Violet",  bg: "#ffffff", accent: "#a855f7" },
  { id: "slate",  label: "Slate",   bg: "#ffffff", accent: "#1e40af" },
];

type UserRole = "admin" | "staff_kyc" | "staff_support" | "staff_dispute" | "staff_moderation";

// ─── Nav data ─────────────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: "Operations", icon: Briefcase,
    roles: ["admin","staff_kyc","staff_support","staff_dispute","staff_moderation"],
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, section: null, roles: ["admin","staff_kyc","staff_support","staff_dispute","staff_moderation"], badgeKey: null },
      { href: "/admin/orders",   label: "Orders",    icon: ShoppingBag, section: null, roles: ["admin","staff_support","staff_dispute"],                   badgeKey: null },
      { href: "/admin/users",    label: "Users",     icon: Users,       section: null, roles: ["admin","staff_support","staff_dispute","staff_moderation"], badgeKey: null },
      { href: "/admin/editors",  label: "Editors",   icon: Film,        section: null, roles: ["admin","staff_kyc","staff_support","staff_dispute"],         badgeKey: null },
      { href: "/admin/support",  label: "Support Tickets", icon: MessageSquare, section: null, roles: ["admin","staff_support"],                             badgeKey: null },
      { href: "/admin/kyc",      label: "KYC Queue", icon: UserCheck,   section: null, roles: ["admin","staff_kyc"],                                       badgeKey: "pendingKyc"     as const },
      { href: "/admin/disputes", label: "Disputes",  icon: Scale,       section: null, roles: ["admin","staff_dispute"],                                   badgeKey: "openDisputes"   as const },
      { href: "/admin/payouts",  label: "Payouts",   icon: Wallet,      section: null, roles: ["admin"],                                                   badgeKey: "pendingPayouts" as const },
    ],
  },
  {
    label: "Analytics", icon: TrendingUp, roles: ["admin"],
    items: [
      { href: "/admin/analytics",          label: "Analytics",          icon: BarChart2,  section: null, roles: ["admin"], badgeKey: null },
      { href: "/admin/editor-performance", label: "Editor Performance", icon: Award,      section: null, roles: ["admin"], badgeKey: null },
      { href: "/admin/referrals",          label: "Referral Analytics", icon: Share2,     section: null, roles: ["admin"], badgeKey: null },
    ],
  },
  {
    label: "Finance", icon: DollarSign, roles: ["admin"],
    items: [
      { href: "/admin/revenue",     label: "Revenue",     icon: TrendingUp,  section: null, roles: ["admin"], badgeKey: null },
      { href: "/admin/payments",    label: "Payments",    icon: CreditCard,  section: null, roles: ["admin"], badgeKey: null },
      { href: "/admin/chargebacks", label: "Chargebacks", icon: RefreshCw,   section: null, roles: ["admin"], badgeKey: null },
      { href: "/admin/refunds",     label: "Refunds",     icon: RotateCcw,   section: null, roles: ["admin"], badgeKey: null },
    ],
  },
  {
    label: "Moderation", icon: Shield,
    roles: ["admin","staff_support","staff_dispute","staff_moderation"],
    items: [
      { href: "/admin/chat",       label: "Chat",            icon: MessageSquare, section: null, roles: ["admin","staff_support","staff_dispute"],    badgeKey: null },
      { href: "/admin/moderation", label: "Moderation",      icon: Shield,        section: null, roles: ["admin","staff_moderation"],                badgeKey: null },
      { href: "/admin/watchlist",  label: "Watch List",      icon: Eye,           section: null, roles: ["admin","staff_moderation","staff_support"], badgeKey: null },
      { href: "/admin/flagged",    label: "Flagged Users",   icon: Flag,          section: null, roles: ["admin","staff_moderation","staff_support"], badgeKey: null },
      { href: "/admin/abuse",      label: "Abuse Detection", icon: AlertTriangle, section: null, roles: ["admin","staff_moderation"],                badgeKey: null },
    ],
  },
  {
    label: "Content", icon: Newspaper,
    roles: ["admin","staff_moderation"],
    items: [
      { href: "/admin/blog",            label: "Blog",               icon: BookOpen,  section: null, roles: ["admin","staff_moderation"],                 badgeKey: null },
      { href: "/admin/showcase",        label: "Showcase",           icon: Award,     section: null, roles: ["admin","staff_moderation"],                 badgeKey: null },
      { href: "/admin/announcements",   label: "Announcements",      icon: Bell,      section: null, roles: ["admin","staff_moderation"],                 badgeKey: null },
      { href: "/admin/broadcast",       label: "Broadcast",          icon: Radio,     section: null, roles: ["admin","staff_moderation","staff_support"], badgeKey: null },
      { href: "/admin/push",            label: "Push Notifications", icon: Bell,      section: null, roles: ["admin"],                                    badgeKey: null },
      { href: "/admin/email-templates", label: "Email Templates",    icon: Mail,      section: null, roles: ["admin"],                                    badgeKey: null },
    ],
  },
  {
    label: "System", icon: Server, roles: ["admin"],
    items: [
      { href: "/admin/settings",      label: "Platform Settings", icon: Settings,   section: null, roles: ["admin"], badgeKey: null },
      { href: "/admin/staff",         label: "Staff",             icon: UserCog,    section: null, roles: ["admin"], badgeKey: null },
      { href: "/admin/audit",         label: "Audit Log",         icon: List,       section: null, roles: ["admin"], badgeKey: null },
      { href: "/admin/system",        label: "System Health",     icon: Activity,   section: null, roles: ["admin"], badgeKey: null },
      { href: "/admin/commission",    label: "Commission & Fees", icon: Percent,    section: null, roles: ["admin"], badgeKey: null },
      { href: "/admin/feature-flags", label: "Feature Flags",     icon: ToggleLeft, section: null, roles: ["admin"], badgeKey: null },
      { href: "/admin/theme",         label: "Site Theme",        icon: Paintbrush, section: null, roles: ["admin"], badgeKey: null },
    ],
  },
];

const ROLE_LABELS: Partial<Record<UserRole, string>> = {
  admin: "Super Admin", staff_kyc: "KYC Staff",
  staff_support: "Support Staff", staff_dispute: "Dispute Staff",
  staff_moderation: "Moderation Staff",
};

type Counts      = { pendingKyc: number; openDisputes: number; pendingPayouts: number };
type BadgeKey    = "pendingKyc" | "openDisputes" | "pendingPayouts";
type CtxMenu     = { x: number; y: number; href: string; label: string } | null;
type HealthStatus = "ok" | "degraded" | "critical" | null;

function findActiveGroup(pathname: string): string | null {
  for (const g of NAV_GROUPS)
    for (const it of g.items)
      if (pathname.startsWith(it.href)) return g.label;
  return null;
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function RailTooltip({ label, children, accent }: { label: string; children: React.ReactNode; accent: string }) {
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

// ─── Context menu portal ──────────────────────────────────────────────────────

function ContextMenuPortal({ menu, isPinned, copied, onOpenTab, onCopy, onPin, onClose }: {
  menu: NonNullable<CtxMenu>; isPinned: boolean; copied: boolean;
  onOpenTab: () => void; onCopy: () => void; onPin: () => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDown(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [onClose]);
  const left = Math.min(menu.x, window.innerWidth  - 184);
  const top  = Math.min(menu.y, window.innerHeight - 130);
  return createPortal(
    <div ref={ref} style={{ top, left }} className="fixed z-[9999] w-44 bg-white border border-neutral-200 shadow-xl rounded-xl py-1.5 select-none">
      <button onClick={onOpenTab} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12.5px] text-neutral-700 hover:bg-neutral-50 transition-colors text-left font-bold">
        <ExternalLink className="w-3.5 h-3.5 shrink-0 text-neutral-450" /> Open in new tab
      </button>
      <button onClick={onCopy} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12.5px] text-neutral-700 hover:bg-neutral-50 transition-colors text-left font-bold">
        {copied ? <Check className="w-3.5 h-3.5 shrink-0 text-green-600" /> : <Copy className="w-3.5 h-3.5 shrink-0 text-neutral-455" />}
        {copied ? "Copied!" : "Copy link"}
      </button>
      <div className="border-t border-neutral-100 my-1" />
      <button onClick={onPin} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12.5px] text-neutral-700 hover:bg-neutral-50 transition-colors text-left font-bold">
        <Pin className={cn("w-3.5 h-3.5 shrink-0", isPinned ? "text-amber-500" : "text-neutral-455")} />
        {isPinned ? "Unpin" : "Pin to panel"}
      </button>
    </div>,
    document.body
  );
}

// ─── Panel (fly-out) ──────────────────────────────────────────────────────────

function Panel({ group, pathname, role, counts, pulsing, pinned, onPin, onContextMenu, onNavigate, theme, themeId, onThemeChange, userName, userImage, initials, roleLabel }: {
  group: (typeof NAV_GROUPS)[0];
  pathname: string; role: UserRole; counts: Counts; pulsing: Set<string>;
  pinned: string[]; onPin: (href: string, label: string) => void;
  onContextMenu: (e: React.MouseEvent, href: string, label: string) => void;
  onNavigate?: () => void;
  theme: (typeof SIDEBAR_THEMES)[0];
  themeId: SidebarThemeId; onThemeChange: (id: SidebarThemeId) => void;
  userName: string; userImage: string | null; initials: string; roleLabel: string;
}) {
  const navRef = useRef<HTMLDivElement>(null);
  const [showTopFade,    setShowTopFade]    = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);

  function checkScroll() {
    const el = navRef.current;
    if (!el) return;
    setShowTopFade(el.scrollTop > 8);
    setShowBottomFade(el.scrollTop < el.scrollHeight - el.clientHeight - 8);
  }
  useEffect(() => { checkScroll(); }, [group, pinned.length]);

  const visibleItems = group.items.filter(it => it.roles.includes(role));

  // Pinned items for this group
  const groupPinned = pinned
    .filter(href => group.items.some(it => it.href === href))
    .map(href => group.items.find(it => it.href === href)!)
    .filter(Boolean);

  function itemLink(href: string, label: string, badgeKey: string | null, ItemIcon?: React.ElementType) {
    const active = pathname.startsWith(href);
    const count  = badgeKey ? counts[badgeKey as BadgeKey] : 0;
    return (
      <Link key={href} href={href} onClick={onNavigate}
        onContextMenu={e => { e.preventDefault(); onContextMenu(e, href, label); }}
        className={cn(
          "flex items-center justify-between px-3 py-[9px] rounded-xl text-[12.5px] font-bold transition-all mb-0.5 group",
          active ? "bg-neutral-100 text-neutral-900" : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
        )}>
        <span className="flex items-center gap-2.5 min-w-0">
          {ItemIcon && (
            <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
              active ? "bg-neutral-200/50" : "bg-neutral-100 group-hover:bg-neutral-200/50")}
              style={active ? { color: theme.accent } : {}}>
              <ItemIcon className="w-3.5 h-3.5" style={active ? { color: theme.accent } : {}} />
            </span>
          )}
          <span className="truncate">{label}</span>
        </span>
        {count > 0 && (
          <span className={cn("text-[10px] font-bold rounded-full px-2 py-0.5 leading-none ml-1 shrink-0",
            active ? "text-white" : "bg-neutral-100 text-neutral-700",
            badgeKey && pulsing.has(badgeKey) && "badge-pop")}
            style={active ? { background: theme.accent } : {}}>
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
    );
  }

  return (
    <div className="w-[240px] h-full flex flex-col border-r border-neutral-200/60 bg-white select-none">
      <style>{`
        @keyframes badge-pop{0%{transform:scale(1)}35%{transform:scale(1.55)}65%{transform:scale(.88)}100%{transform:scale(1)}}
        .badge-pop{animation:badge-pop .55s cubic-bezier(.36,.07,.19,.97) both}
        .sb-scroll::-webkit-scrollbar{width:3px}
        .sb-scroll::-webkit-scrollbar-track{background:transparent}
        .sb-scroll::-webkit-scrollbar-thumb{background:rgba(0,0,0,.08);border-radius:99px}
        .sb-scroll::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.15)}
      `}</style>

      {/* Header */}
      <div className="px-4 pt-5 pb-4 shrink-0">
        <p className="text-[10.5px] font-black uppercase tracking-widest mb-1" style={{ color: theme.accent }}>Admin Desk</p>
        <p className="text-[17px] font-black text-neutral-800 tracking-tight leading-tight">{group.label}</p>
        {(() => {
          const active = group.items.find(it => pathname.startsWith(it.href));
          return active ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full mt-2 border"
              style={{ background: theme.accent + "12", color: theme.accent, borderColor: theme.accent + "20" }}>
              {active.label}
            </span>
          ) : null;
        })()}
      </div>

      {/* Items */}
      <div className="relative flex-1 min-h-0">
        <div className={cn("absolute top-0 inset-x-0 h-4 z-10 pointer-events-none transition-opacity", showTopFade ? "opacity-100" : "opacity-0")}
          style={{ background: "linear-gradient(to bottom, #ffffff, transparent)" }} />

        <div ref={navRef} onScroll={checkScroll} className="h-full overflow-y-auto sb-scroll px-2 pb-3">
          {/* Pinned items */}
          {groupPinned.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400 px-3 pb-1.5 pt-1">Pinned</p>
              {groupPinned.map(it => itemLink(it.href, it.label, it.badgeKey, it.icon))}
              <div className="mx-3 my-2 h-px bg-neutral-100" />
            </div>
          )}

          {visibleItems.map(it => itemLink(it.href, it.label, it.badgeKey, it.icon))}
        </div>

        <div className={cn("absolute bottom-0 inset-x-0 h-4 z-10 pointer-events-none transition-opacity", showBottomFade ? "opacity-100" : "opacity-0")}
          style={{ background: "linear-gradient(to top, #ffffff, transparent)" }} />
      </div>

      {/* Quick actions */}
      <div className="shrink-0 border-t border-neutral-100 px-3 pt-2.5 pb-1">
        <Link href="/admin/settings"
          className={cn("flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[12.5px] font-bold transition-colors mb-0.5",
            pathname.startsWith("/admin/settings") ? "text-neutral-900 bg-neutral-100" : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50")}>
          <Settings className="w-3.5 h-3.5 shrink-0 text-neutral-450" />
          Settings
        </Link>
        <Link href="/" target="_blank"
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[12.5px] font-bold text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 transition-colors mb-0.5">
          <ExternalLink className="w-3.5 h-3.5 shrink-0 text-neutral-450" />
          Open website
        </Link>
        <div className="flex items-center gap-2.5 px-2.5 py-2 mb-0.5 select-none">
          <div className="w-3.5 h-3.5 rounded-full shrink-0 border border-neutral-200" style={{ background: theme.accent }} />
          <span className="text-[12.5px] font-bold text-neutral-500 mr-auto">Theme</span>
          <div className="flex items-center gap-1.5">
            {SIDEBAR_THEMES.map(t => (
              <button key={t.id} title={t.label}
                className={cn("w-3.5 h-3.5 rounded-full border transition-transform hover:scale-110",
                  themeId === t.id ? "border-neutral-400 scale-110" : "border-transparent")}
                style={{ background: t.accent }}
                onClick={() => { try { localStorage.setItem("admin-sidebar-theme", t.id); } catch {} onThemeChange(t.id); }} />
            ))}
          </div>
        </div>
      </div>

      {/* User footer */}
      <div className="shrink-0 border-t border-neutral-100 px-3 py-3">
        <div className="flex items-center gap-2.5 px-1">
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-white text-[11px] font-bold"
              style={{ background: `linear-gradient(135deg, ${theme.accent}, #f97316)` }}>
              {userImage ? <img src={userImage} alt={userName} className="w-full h-full object-cover" /> : initials}
            </div>
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border-2 border-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-black text-neutral-800 truncate leading-tight">{userName || "Admin"}</p>
            <p className="text-[10.5px] text-neutral-450 truncate leading-tight">{roleLabel}</p>
          </div>
          <button onClick={() => signOut({ callbackUrl: "/login" })} title="Sign out"
            className="shrink-0 p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Rail ─────────────────────────────────────────────────────────────────────

function Rail({ pathname, role, counts, pulsing, activePanel, onTogglePanel,
  themeId, onThemeChange, health, sessionWarning, onExtendSession,
  progress, userName, userImage, initials, roleLabel, onContextMenu,
}: {
  pathname: string; role: UserRole; counts: Counts; pulsing: Set<string>;
  activePanel: string | null; onTogglePanel: (label: string) => void;
  themeId: SidebarThemeId; onThemeChange: (id: SidebarThemeId) => void;
  health: HealthStatus; sessionWarning: boolean; onExtendSession: () => void;
  progress: number; userName: string; userImage: string | null; initials: string; roleLabel: string;
  onContextMenu: (e: React.MouseEvent, href: string, label: string) => void;
}) {
  const theme = SIDEBAR_THEMES.find(t => t.id === themeId) ?? SIDEBAR_THEMES[0];
  const groupRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function railIconCls(active: boolean) {
    return cn(
      "relative flex items-center justify-center w-10 h-10 rounded-xl mx-auto transition-all duration-150",
      active ? "text-neutral-800 bg-neutral-100" : "text-neutral-400 hover:text-neutral-850 hover:bg-neutral-100/50"
    );
  }

  return (
    <div className="w-14 flex-shrink-0 flex flex-col h-full bg-neutral-50/50 border-r border-neutral-200/50 relative select-none">
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] z-30 overflow-hidden pointer-events-none">
        <div className="h-full transition-[width] ease-out"
          style={{ width: `${progress}%`, background: theme.accent, transitionDuration: progress === 0 ? "0ms" : progress === 100 ? "200ms" : "300ms" }} />
      </div>

      {/* Logo */}
      <div className="flex items-center justify-center pt-4 pb-3 shrink-0">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: theme.accent }}>
          <Film className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Search trigger */}
      <div className="px-2 pb-2 shrink-0">
        <RailTooltip label="Search  ⌘K" accent={theme.accent}>
          <button onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }))}
            className={railIconCls(false)}>
            <Search className="w-4.5 h-4.5" />
          </button>
        </RailTooltip>
      </div>

      <div className="mx-3 my-2 h-px bg-neutral-200/60" />

      {/* Group icons */}
      <div className="px-2 space-y-0.5">
        {NAV_GROUPS.filter(g => g.roles.includes(role)).map((group, idx, filteredGroups) => {
          const Icon      = group.icon;
          const panelOpen = activePanel === group.label;
          const anyActive = group.items.some(it => pathname.startsWith(it.href));
          const isSystem  = group.label === "System";
          const active    = panelOpen || anyActive;
          const hasBadge  = group.items.some(it => it.badgeKey && counts[it.badgeKey as BadgeKey] > 0);

          return (
            <RailTooltip key={group.label} label={group.label} accent={theme.accent}>
              <button
                ref={el => { groupRefs.current[idx] = el; }}
                onClick={() => onTogglePanel(group.label)}
                onKeyDown={e => {
                  if (e.key === "ArrowDown") { e.preventDefault(); groupRefs.current[(idx + 1) % filteredGroups.length]?.focus(); }
                  if (e.key === "ArrowUp")   { e.preventDefault(); groupRefs.current[(idx - 1 + filteredGroups.length) % filteredGroups.length]?.focus(); }
                  if (e.key === "Escape" && activePanel) onTogglePanel(activePanel);
                }}
                className={railIconCls(active)}
                style={panelOpen ? { background: "rgba(0,0,0,0.04)" } : anyActive ? { background: "rgba(0,0,0,0.02)" } : {}}>
                <Icon className="w-4.5 h-4.5" style={active ? { color: theme.accent } : {}} />
                {isSystem && health && health !== "ok" && (
                  <span className={cn("absolute top-1 right-1 w-1.5 h-1.5 rounded-full",
                    health === "critical" ? "bg-red-500 animate-pulse" : "bg-amber-500")} />
                )}
                {!isSystem && hasBadge && (
                  <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full border-[2px] border-white"
                    style={{ background: theme.accent }} />
                )}
                {panelOpen && (
                  <span className="absolute -right-2 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full"
                    style={{ background: theme.accent }} />
                )}
              </button>
            </RailTooltip>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Session warning (kept — urgent notification) */}
      {sessionWarning && (
        <div className="px-2 pb-2 shrink-0">
          <RailTooltip label="Session expiring — click to extend" accent={theme.accent}>
            <button onClick={onExtendSession} className="relative flex items-center justify-center w-10 h-10 rounded-xl mx-auto text-amber-500 hover:bg-amber-550/10 transition-all">
              <AlertTriangle className="w-[15px] h-[15px]" />
            </button>
          </RailTooltip>
        </div>
      )}
    </div>
  );
}

// ─── Mobile drawer ────────────────────────────────────────────────────────────

function MobileDrawer({ pathname, role, counts, pulsing, pinned, onPin, onContextMenu,
  theme, onClose,
}: {
  pathname: string; role: UserRole; counts: Counts; pulsing: Set<string>;
  pinned: string[]; onPin: (href: string, label: string) => void;
  onContextMenu: (e: React.MouseEvent, href: string, label: string) => void;
  theme: (typeof SIDEBAR_THEMES)[0]; onClose: () => void;
}) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const active = NAV_GROUPS.find(g => g.items.some(it => pathname.startsWith(it.href)));
    return active ? new Set([active.label]) : new Set();
  });
  const toggleGroup = (label: string) =>
    setOpenGroups(prev => { const n = new Set(prev); n.has(label) ? n.delete(label) : n.add(label); return n; });

  function navLink(href: string, label: string, badgeKey: string | null) {
    const active = pathname === href || (href !== "/admin/dashboard" && pathname.startsWith(href));
    const count  = badgeKey ? counts[badgeKey as BadgeKey] : 0;
    return (
      <Link key={href} href={href} onClick={onClose}
        onContextMenu={e => { e.preventDefault(); onContextMenu(e, href, label); }}
        className={cn("flex items-center justify-between px-4 py-2.5 text-[13px] font-bold transition-colors",
          active ? "text-neutral-900 font-extrabold" : "text-neutral-500 hover:text-neutral-800")}>
        <span className="flex items-center gap-2">
          {active && <span className="w-1.5 h-1.5 rounded-full" style={{ background: theme.accent }} />}
          {label}
        </span>
        {count > 0 && (
          <span className={cn("text-[10.5px] font-bold rounded-full px-1.5 py-0.5 leading-none",
            badgeKey && pulsing.has(badgeKey) && "badge-pop")}
            style={{ background: active ? theme.accent : "rgba(0,0,0,0.06)", color: active ? "white" : "#4b5563" }}>
            {count}
          </span>
        )}
      </Link>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white select-none">
      <style>{`@keyframes badge-pop{0%{transform:scale(1)}35%{transform:scale(1.55)}65%{transform:scale(.88)}100%{transform:scale(1)}}.badge-pop{animation:badge-pop .55s cubic-bezier(.36,.07,.19,.97) both}`}</style>
      <div className="flex items-center justify-between px-4 pt-5 pb-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: theme.accent }}>
            <Film className="w-4 h-4 text-white" />
          </div>
          <span className="text-[15px] font-black text-neutral-850">EditBridge</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-neutral-450 hover:bg-neutral-50 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {NAV_GROUPS.filter(g => g.roles.includes(role)).map(group => {
          const Icon         = group.icon;
          const isOpen       = openGroups.has(group.label);
          const anyActive    = group.items.some(it => pathname.startsWith(it.href));
          const visibleItems = group.items.filter(it => it.roles.includes(role));
          const groupBadgeCount = visibleItems.reduce((sum, it) =>
            sum + (it.badgeKey ? counts[it.badgeKey as BadgeKey] : 0), 0);
          return (
            <div key={group.label} className="mb-1">
              <button onClick={() => toggleGroup(group.label)}
                className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold transition-colors",
                  anyActive ? "text-neutral-900 bg-neutral-50" : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50")}>
                <Icon className={cn("w-4 h-4 shrink-0", anyActive ? "" : "text-neutral-450")} style={anyActive ? { color: theme.accent } : {}} />
                <span className="flex-1 text-left">{group.label}</span>
                {groupBadgeCount > 0 && (
                  <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none mr-0.5 text-white" style={{ background: theme.accent }}>
                    {groupBadgeCount > 99 ? "99+" : groupBadgeCount}
                  </span>
                )}
                {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />}
              </button>
              {isOpen && (
                <div className="ml-7 mt-0.5">
                  {visibleItems.map(it => navLink(it.href, it.label, it.badgeKey))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-4 py-3 border-t border-neutral-100 shrink-0">
        <Link href="/admin/settings" onClick={onClose}
          className="flex items-center gap-2.5 text-[13px] text-neutral-500 hover:text-neutral-850 transition-colors py-2 font-bold">
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

// ─── AdminSidebar ─────────────────────────────────────────────────────────────

interface AdminSidebarProps {
  userName?: string;
  userImage?: string | null;
}

export function AdminSidebar({
  userName: propUserName = "",
  userImage: propUserImage = null,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const { data: session, status, update } = useSession();
  const role = (session?.user?.role ?? "admin") as UserRole;
  const userName = session?.user?.name ?? propUserName;
  const userImage = session?.user?.image ?? propUserImage;

  const [mobileOpen,        setMobileOpen]        = useState(false);
  const [activePanel,       setActivePanel]       = useState<string | null>(null);
  const [counts,            setCounts]            = useState<Counts>({ pendingKyc: 0, openDisputes: 0, pendingPayouts: 0 });
  const [pulsing,           setPulsing]           = useState<Set<string>>(new Set());
  const [pinned,            setPinned]            = useState<string[]>([]);
  const [themeId,           setThemeId]           = useState<SidebarThemeId>("navy");
  const [contextMenu,       setContextMenu]       = useState<CtxMenu>(null);
  const [ctxCopied,         setCtxCopied]         = useState(false);
  const [health,            setHealth]            = useState<HealthStatus>(null);
  const [sessionWarning,    setSessionWarning]    = useState(false);
  const [progress,          setProgress]          = useState(0);
  const [mounted,           setMounted]           = useState(false);
  const transitioning = useRef(false);
  const progressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const currentTheme = SIDEBAR_THEMES.find(t => t.id === themeId) ?? SIDEBAR_THEMES[0];
  const activePanelGroup = NAV_GROUPS.find(g => g.label === activePanel);
  const initials = userName.split(" ").filter(Boolean).map(n => n[0]).join("").toUpperCase().slice(0, 2) || "A";
  const roleLabel = ROLE_LABELS[role] ?? "Staff member";

  useEffect(() => { setMounted(true); }, []);

  // Init theme & pinned
  useEffect(() => {
    try {
      let stored = localStorage.getItem("admin-sidebar-theme") as SidebarThemeId;
      if (stored === "gray") {
        stored = "navy";
        localStorage.setItem("admin-sidebar-theme", "navy");
      }
      if (stored && SIDEBAR_THEMES.some(t => t.id === stored)) setThemeId(stored);
      const storedPinned = localStorage.getItem("admin-pinned");
      if (storedPinned) setPinned(JSON.parse(storedPinned));
    } catch {}
  }, []);

  // Init panel group on load
  useEffect(() => {
    const groupLabel = findActiveGroup(pathname);
    setActivePanel(groupLabel ?? NAV_GROUPS[0].label);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-switch panel on navigation
  useEffect(() => {
    const groupLabel = findActiveGroup(pathname);
    if (groupLabel) setActivePanel(groupLabel);
  }, [pathname]);

  // Loading bar
  useEffect(() => {
    if (transitioning.current) {
      transitioning.current = false;
      clearTimeout(progressTimer.current);
      setProgress(100);
      progressTimer.current = setTimeout(() => setProgress(0), 380);
    }
  }, [pathname]);

  function handleNavigate() {
    setMobileOpen(false);
    transitioning.current = true;
    setProgress(18);
    clearTimeout(progressTimer.current);
    progressTimer.current = setTimeout(() => { if (transitioning.current) setProgress(68); }, 90);
  }

  // Extend session helper
  async function extendSession() {
    try {
      await update();
      setSessionWarning(false);
      toast.success("Session extended successfully");
    } catch {
      toast.error("Could not extend session. Please refresh.");
    }
  }

  // Real-time unread/counts
  useEffect(() => {
    function fetch_() {
      fetch("/api/admin/sidebar-counts").then(r => r.json()).then(d => {
        setCounts(prev => {
          const next = {
            pendingKyc: d.pendingKyc ?? 0,
            openDisputes: d.openDisputes ?? 0,
            pendingPayouts: d.pendingPayouts ?? 0,
          };
          const pulse = new Set<string>();
          if (next.pendingKyc > prev.pendingKyc) pulse.add("pendingKyc");
          if (next.openDisputes > prev.openDisputes) pulse.add("openDisputes");
          if (next.pendingPayouts > prev.pendingPayouts) pulse.add("pendingPayouts");
          if (pulse.size > 0) {
            setPulsing(pulse);
            setTimeout(() => setPulsing(new Set()), 1500);
          }
          return next;
        });
      }).catch(() => {});
    }
    fetch_();
    const id = setInterval(fetch_, 30_000);
    return () => clearInterval(id);
  }, []);

  // Health
  useEffect(() => {
    const fetch_ = () => fetch("/api/admin/health").then(r => r.json()).then(d => setHealth(d.status ?? "ok")).catch(() => setHealth("degraded"));
    fetch_();
    const id = setInterval(fetch_, 60_000);
    return () => clearInterval(id);
  }, []);

  // Session expiry
  useEffect(() => {
    if (!session?.expires) return;
    const check = () => { const ms = new Date(session.expires).getTime() - Date.now(); setSessionWarning(ms > 0 && ms < 5 * 60 * 1000); };
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [session?.expires]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useEffect(() => { document.body.style.overflow = mobileOpen ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [mobileOpen]);

  function togglePin(href: string, label: string) {
    setPinned(prev => {
      const next = prev.includes(href) ? prev.filter(h => h !== href) : [...prev, href];
      try { localStorage.setItem("admin-pinned", JSON.stringify(next)); } catch {}
      return next;
    });
    setContextMenu(null);
  }
  function handleThemeChange(id: SidebarThemeId) { setThemeId(id); try { localStorage.setItem("admin-sidebar-theme", id); } catch {} }
  function handleContextMenu(e: React.MouseEvent, href: string, label: string) { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, href, label }); setCtxCopied(false); }
  async function handleCtxCopy() { if (!contextMenu) return; try { await navigator.clipboard.writeText(window.location.origin + contextMenu.href); setCtxCopied(true); setTimeout(() => setCtxCopied(false), 2000); } catch {} }

  function handleTogglePanel(label: string) {
    setActivePanel(prev => prev === label ? null : label);
  }

  const railProps = {
    pathname, role, counts, pulsing, activePanel,
    onTogglePanel: handleTogglePanel,
    themeId, onThemeChange: handleThemeChange,
    health, sessionWarning, onExtendSession: extendSession,
    progress, userName, userImage, initials, roleLabel,
    onContextMenu: handleContextMenu,
  };

  return (
    <>
      {/* Hidden AdminGlobalSearch to keep Cmd+K handler alive */}
      <div className="hidden"><AdminGlobalSearch /></div>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center gap-3 px-4 border-b border-neutral-200 bg-white">
        <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-brand-primary" style={{ background: currentTheme.accent }}>
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
            {status === "loading"
              ? <div className="h-full bg-white" />
              : <MobileDrawer pathname={pathname} role={role} counts={counts} pulsing={pulsing}
                  pinned={pinned} onPin={togglePin} onContextMenu={handleContextMenu}
                  theme={currentTheme} onClose={() => setMobileOpen(false)} />}
          </div>
        </div>
      )}

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white">
        <div className="flex h-14">
          {NAV_GROUPS.filter(g => g.roles.includes(role)).slice(0, 3).map(group => {
            const Icon      = group.icon;
            const firstHref = group.items.find(it => it.roles.includes(role))?.href ?? group.items[0].href;
            const isActive  = group.items.some(it => pathname.startsWith(it.href));
            const hasBadge  = group.items.some(it => it.badgeKey && counts[it.badgeKey as BadgeKey] > 0);
            return (
              <Link key={group.label} href={firstHref}
                className={cn("flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors",
                  isActive ? "text-neutral-900 font-bold" : "text-neutral-450")}>
                {isActive && (
                  <span className="absolute top-0 inset-x-3 h-[2px] rounded-full"
                    style={{ background: currentTheme.accent }} />
                )}
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {hasBadge && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border-[2px] border-white"
                      style={{ background: currentTheme.accent }} />
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
        style={{ width: activePanel !== null ? 56 + 240 : 56, background: currentTheme.bg }}
      >
        {status === "loading" ? (
          <div className="w-14 flex flex-col items-center pt-4 gap-3 bg-neutral-50/50 h-full border-r border-neutral-200/50">
            <div className="w-8 h-8 rounded-xl bg-neutral-200 animate-pulse" />
            {[...Array(8)].map((_, i) => <div key={i} className="w-10 h-10 rounded-xl bg-neutral-100 animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />)}
          </div>
        ) : (
          <>
            <Rail {...railProps} />
            {/* Panel */}
            <div className={cn("overflow-hidden transition-[width,opacity] duration-250 ease-in-out flex-shrink-0",
              activePanelGroup !== null ? "opacity-100" : "opacity-0 pointer-events-none")}
              style={{ width: activePanelGroup !== null ? 240 : 0 }}>
              {activePanelGroup && (
                <Panel group={activePanelGroup} pathname={pathname} role={role}
                  counts={counts} pulsing={pulsing} pinned={pinned} onPin={togglePin}
                  onContextMenu={handleContextMenu} onNavigate={handleNavigate} theme={currentTheme}
                  themeId={themeId} onThemeChange={handleThemeChange}
                  userName={userName} userImage={userImage} initials={initials} roleLabel={roleLabel} />
              )}
            </div>
          </>
        )}
      </aside>

      {/* Context menu */}
      {mounted && contextMenu && (
        <ContextMenuPortal
          menu={contextMenu}
          isPinned={pinned.includes(contextMenu.href)}
          copied={ctxCopied}
          onOpenTab={() => { window.open(contextMenu.href, "_blank"); setContextMenu(null); }}
          onCopy={handleCtxCopy}
          onPin={() => togglePin(contextMenu.href, contextMenu.label)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}

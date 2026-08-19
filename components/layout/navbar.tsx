"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  X, ChevronDown, LayoutDashboard,
  Settings, LogOut, HelpCircle,
  ArrowRight, Sparkles,
  Loader2, AlertTriangle, Wrench, Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/layout/notification-bell";

/* ── data ── */

// Row 2: pure in-app navigation only
const NAV_LINKS: { href: string; label: string; icon?: any; flag?: any }[] = [
  { href: "/browse",      label: "Browse Editors" },
  { href: "/feed",        label: "Feed" },
];

const RESOURCES = [
  { href: "/how-it-works", label: "How It Works"    },
  { href: "/about",        label: "About us"        },
  { href: "/blog",         label: "Blog"            },
  { href: "/showcase",     label: "Showcase"        },
  { href: "/leaderboard",  label: "Top 100 Editors" },
  { href: "/faq",          label: "FAQ"             },
  { href: "/contact",      label: "Contact"         },
  { href: "/compare",      label: "Compare"         },
];


const ROLE_LABELS: Record<string, string> = {
  client:           "Client",
  editor:           "Editor",
  admin:            "Admin",
  staff_kyc:        "Staff · KYC",
  staff_support:    "Staff · Support",
  staff_dispute:    "Staff · Disputes",
  staff_moderation: "Staff · Moderation",
};

export function Navbar({
  logoUrl, platformName,
  themeBannerEnabled, themeBannerText, themeBannerBg, themeBannerTextColor,
}: {
  logoUrl?: string; platformName?: string;
  themeBannerEnabled?: boolean; themeBannerText?: string;
  themeBannerBg?: string; themeBannerTextColor?: string;
} = {}) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const [signingOut,           setSigningOut]           = useState(false);
  const [userOpen,             setUserOpen]             = useState(false);
  const [themeBannerDismissed, setThemeBannerDismissed] = useState(false);
  const userMenuRef        = useRef<HTMLDivElement>(null);
  const userMenuTriggerRef = useRef<HTMLButtonElement>(null);

  type AnnouncementBar = { id: string; title: string; body: string; type: string };
  const [announcements,  setAnnouncements]  = useState<AnnouncementBar[]>([]);
  const [dismissedIds,   setDismissedIds]   = useState<Set<string>>(new Set());
  const [announcementIdx, setAnnouncementIdx] = useState(0);
  const [flags,          setFlags]          = useState<Record<string, boolean>>({});

  useEffect(() => {
    function fetchAnnouncements() {
      fetch("/api/announcements")
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setAnnouncements(data); })
        .catch(() => {});
    }
    fetchAnnouncements();
    const id = setInterval(fetchAnnouncements, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch("/api/feature-flags")
      .then(r => r.json())
      .then(d => setFlags(d.flags ?? {}))
      .catch(() => {});
  }, []);

  const navLinks = NAV_LINKS.filter(l => !("flag" in l) || flags[(l as { flag: string }).flag] !== false);

  const visibleAnnouncements = announcements.filter(a => !dismissedIds.has(a.id));
  const currentAnnouncement  = visibleAnnouncements[announcementIdx] ?? null;

  function dismissAnnouncement(id: string) {
    setDismissedIds(prev => new Set(prev).add(id));
    setAnnouncementIdx(0);
  }

  /* close everything on route change */
  useEffect(() => {
    setUserOpen(false);
  }, [pathname]);

  /* [fix #8] user menu keyboard trap — Escape closes, Tab cycles within */
  useEffect(() => {
    if (!userOpen) return;
    const firstItem = userMenuRef.current?.querySelector<HTMLElement>("a, button");
    firstItem?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setUserOpen(false);
        userMenuTriggerRef.current?.focus();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = Array.from(
        userMenuRef.current?.querySelectorAll<HTMLElement>("a, button") ?? []
      ).filter(el => !el.hasAttribute("disabled"));
      if (!focusables.length) return;
      const first = focusables[0];
      const last  = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [userOpen]);

  const initials = session?.user?.name
    ? session.user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const dashboardHref =
    session?.user?.role === "editor"        ? "/editor/dashboard"
    : session?.user?.role === "admin" || session?.user?.role?.startsWith("staff_")
                                            ? "/admin/dashboard"
    : "/client/dashboard";

  const roleLabel = ROLE_LABELS[session?.user?.role ?? ""] ?? "Member";
  const isActive  = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href.split("?")[0]);

  return (
    <>
      {/* ── Theme banner ── */}
      {themeBannerEnabled && themeBannerText && !themeBannerDismissed && (
        <div className="relative px-4 py-2.5 text-center" style={{ background: themeBannerBg }}>
          <p className="text-xs sm:text-sm font-medium pr-8" style={{ color: themeBannerTextColor }}>
            {themeBannerText}
          </p>
          <button
            onClick={() => setThemeBannerDismissed(true)}
            aria-label="Dismiss banner"
            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: themeBannerTextColor }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Announcement bar ── */}
      {currentAnnouncement && (
        <div className={cn(
          "relative px-4 py-2.5 text-center",
          currentAnnouncement.type === "warning"     ? "bg-amber-500"
          : currentAnnouncement.type === "maintenance" ? "bg-red-600"
          : "bg-[#1e40af]"
        )}>
          <p className="text-xs sm:text-sm text-white font-medium pr-8 flex items-center justify-center gap-1.5">
            {currentAnnouncement.type === "warning"     && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
            {currentAnnouncement.type === "maintenance" && <Wrench className="w-3.5 h-3.5 shrink-0" />}
            {currentAnnouncement.type === "info"        && <Megaphone className="w-3.5 h-3.5 shrink-0" />}
            <span className="font-bold">{currentAnnouncement.title}</span>
            {currentAnnouncement.body && (
              <span className="font-normal opacity-90"> — {currentAnnouncement.body}</span>
            )}
          </p>
          {visibleAnnouncements.length > 1 && (
            <button
              onClick={() => setAnnouncementIdx(i => (i + 1) % visibleAnnouncements.length)}
              aria-label={`Announcement ${announcementIdx + 1} of ${visibleAnnouncements.length} — click for next`}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-xs font-bold transition-colors"
            >
              {announcementIdx + 1}/{visibleAnnouncements.length} ›
            </button>
          )}
          <button
            onClick={() => dismissAnnouncement(currentAnnouncement.id)}
            aria-label="Dismiss announcement"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Main navbar ── */}
      <nav
        aria-label="Main navigation"
        className="sticky top-0 z-40 w-full bg-white/98 backdrop-blur-md border-b border-neutral-200/60 shadow-none"
      >
        {/* ── Row 1 ── */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3" style={{ height: 64 }}>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
              {logoUrl ? (
                <Image src={logoUrl} alt={platformName ?? "Logo"} width={140} height={32} unoptimized className="h-8 w-auto max-w-[140px] object-contain" />
              ) : (
                <>
                  <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center transition-all">
                    <span className="text-white font-black text-sm">E</span>
                  </div>
                  <span className="text-[1.15rem] font-black tracking-tight text-black">
                    {platformName ?? <>Edit<span className="text-neutral-500 font-semibold">Bridge</span></>}
                  </span>
                </>
              )}
            </Link>

            {/* ── Right side ── */}
            <div className="flex items-center gap-2 ml-auto">

              {session ? (
                <>
                  <NotificationBell />

                  <Link href={dashboardHref}
                    className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all text-neutral-600 hover:text-black hover:bg-neutral-50">
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Link>

                  {/* User menu */}
                  <div className="relative">
                    <button
                      ref={userMenuTriggerRef}
                      onClick={() => setUserOpen(o => !o)}
                      aria-expanded={userOpen}
                      aria-haspopup="menu"
                      aria-label={`${session.user?.name ?? "User"} — account menu`}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-[14px] border transition-all border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50"
                    >
                      <div className="w-7 h-7 rounded-[8px] bg-black flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
                        {session.user?.image
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={session.user.image} alt="" className="w-full h-full object-cover" />
                          : initials}
                      </div>
                      <div className="hidden sm:block text-left max-w-[90px]">
                        <p className="text-xs font-bold truncate leading-none text-neutral-800">
                          {session.user?.name?.split(" ")[0]}
                        </p>
                        <p className="text-[9px] font-black tracking-wider uppercase leading-none mt-0.5 text-neutral-400">{roleLabel}</p>
                      </div>
                      <ChevronDown className={cn("w-3.5 h-3.5 shrink-0 transition-all text-neutral-400", userOpen && "rotate-180")} />
                    </button>

                    {userOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setUserOpen(false)} />
                        <div
                          ref={userMenuRef}
                          role="menu"
                          className="absolute right-0 top-full mt-2 w-60 rounded-2xl border border-neutral-200/60 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] z-20 overflow-hidden"
                        >
                          <div className="px-4 py-4 border-b border-neutral-100">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center text-white text-sm font-bold shrink-0 overflow-hidden">
                                {session.user?.image
                                  // eslint-disable-next-line @next/next/no-img-element
                                  ? <img src={session.user.image} alt="" className="w-full h-full object-cover" />
                                  : initials}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-black text-black truncate">{session.user?.name}</p>
                                <p className="text-xs text-neutral-400 truncate">{session.user?.email}</p>
                                <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full border border-neutral-200 bg-neutral-50 text-neutral-700 text-[9px] font-mono font-bold tracking-wider">
                                  {roleLabel}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="p-1.5">
                            <DropItem
                              href={dashboardHref}
                              icon={LayoutDashboard}
                              label="Dashboard"
                            />
                            <DropItem
                              href={
                                session?.user?.role === "editor" ? "/editor/settings"
                                : session?.user?.role === "admin" || session?.user?.role?.startsWith("staff_") ? "/admin/settings"
                                : "/settings"
                              }
                              icon={Settings}
                              label="Settings"
                            />
                            <DropItem href="/faq" icon={HelpCircle} label="Help & FAQ" />
                          </div>
                          <div className="border-t border-gray-100 p-1.5">
                            <button
                              onClick={() => {
                                if (signingOut) return;
                                setSigningOut(true);
                                setUserOpen(false);
                                signOut({ callbackUrl: "/" });
                              }}
                              disabled={signingOut}
                              className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors font-medium disabled:opacity-50"
                            >
                              {signingOut
                                ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                                : <LogOut className="w-4 h-4 shrink-0" />}
                              {signingOut ? "Signing out…" : "Sign out"}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Link href="/login"
                    className="hidden sm:flex px-3.5 py-2 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all">
                    Sign in
                  </Link>
                  <Link href="/signup"
                    className="hidden sm:flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-bold text-white transition-all bg-black hover:bg-neutral-800 shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.25)] hover:-translate-y-px">
                    Get started
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <div className="sm:hidden flex items-center gap-1.5">
                    <Link href="/login"
                      className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all">
                      Sign in
                    </Link>
                    <Link href="/signup"
                      className="flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-bold text-white bg-black hover:bg-neutral-800 shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all">
                      Get started
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>

        {/* ── Row 2: in-app nav (desktop) ── */}
        <div className="hidden md:block border-t border-neutral-200/60">
          <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden">
            <div className="flex items-center justify-start lg:justify-center min-w-max lg:min-w-0 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap px-3 py-3 text-xs uppercase tracking-wider border-b-2 transition-colors shrink-0 font-bold",
                    isActive(href)
                      ? "border-black text-black"
                      : "border-transparent text-neutral-400 hover:text-neutral-800 hover:border-neutral-300"
                  )}
                >
                  {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                  {label}
                </Link>
              ))}

              <span className="shrink-0 w-px h-4 bg-neutral-200 mx-2" />

              {RESOURCES.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "whitespace-nowrap px-3 py-3 text-xs uppercase tracking-wider border-b-2 transition-colors shrink-0 font-bold",
                    isActive(href)
                      ? "border-black text-black"
                      : "border-transparent text-neutral-400 hover:text-neutral-800 hover:border-neutral-300"
                  )}
                >
                  {label}
                </Link>
              ))}

            </div>
          </div>
        </div>

      </nav>

    </>
  );
}

function DropItem({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium group"
    >
      <Icon className="w-4 h-4 text-gray-400 group-hover:text-gray-600 shrink-0 transition-colors" />
      {label}
    </Link>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Menu, X, ChevronDown, LayoutDashboard,
  Settings, LogOut, HelpCircle,
  ArrowRight, Sparkles, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NotificationBell } from "@/components/layout/notification-bell";

/* ── data ── */

// Row 2: pure in-app navigation only
const NAV_LINKS = [
  { href: "/browse",      label: "Browse Editors" },
  { href: "/feed",        label: "Feed" },
  { href: "/find-editor", label: "Match Me", icon: Sparkles, flag: "find_editor_quiz" as const },
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

const POPULAR_SEARCHES = [
  "YouTube Editing",
  "Short-form Reels",
  "Wedding Films",
  "Corporate Video",
  "Gaming Edits",
  "Podcast Editing",
  "Motion Graphics",
  "Thumbnail Design",
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
  const router   = useRouter();

  const [mobileOpen,           setMobileOpen]           = useState(false);
  const [userOpen,             setUserOpen]             = useState(false);
  const [themeBannerDismissed, setThemeBannerDismissed] = useState(false);
  const [searchQuery,          setSearchQuery]          = useState("");
  const [searchFocused,        setSearchFocused]        = useState(false);
  const [highlightedIdx,       setHighlightedIdx]       = useState(-1);
  const blurTimer          = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef     = useRef<HTMLInputElement>(null);
  const suggestionRefs     = useRef<(HTMLButtonElement | null)[]>([]);
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

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    setSearchFocused(false);
    setHighlightedIdx(-1);
    router.push(q ? `/browse?q=${encodeURIComponent(q)}` : "/browse");
  }

  /* close everything on route change */
  useEffect(() => {
    setUserOpen(false);
    setMobileOpen(false);
    setSearchFocused(false);
    setHighlightedIdx(-1);
  }, [pathname]);



  /* cleanup blur timer */
  useEffect(() => () => { if (blurTimer.current) clearTimeout(blurTimer.current); }, []);

  /* [fix #2] reset highlighted suggestion when query changes */
  useEffect(() => { setHighlightedIdx(-1); }, [searchQuery]);

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

  function handleSearchFocus() {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setSearchFocused(true);
  }
  function handleSearchBlur() {
    blurTimer.current = setTimeout(() => {
      setSearchFocused(false);
      setHighlightedIdx(-1);
    }, 150);
  }
  function handleSuggestionClick(label: string) {
    setSearchQuery(label);
    setSearchFocused(false);
    setHighlightedIdx(-1);
    router.push(`/browse?q=${encodeURIComponent(label)}`);
  }

  /* [fix #2] keyboard navigation: ArrowDown/Up/Escape in the autocomplete */
  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) return;
    if (e.key === "Escape") {
      e.preventDefault();
      setSearchFocused(false);
      setHighlightedIdx(-1);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.min(highlightedIdx + 1, suggestionCount - 1);
      setHighlightedIdx(next);
      suggestionRefs.current[next]?.focus();
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIdx(-1);
    }
  }

  function handleSuggestionKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, idx: number) {
    if (e.key === "Escape") {
      e.preventDefault();
      setSearchFocused(false);
      setHighlightedIdx(-1);
      searchInputRef.current?.focus();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.min(idx + 1, suggestionCount - 1);
      setHighlightedIdx(next);
      suggestionRefs.current[next]?.focus();
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (idx === 0) {
        setHighlightedIdx(-1);
        searchInputRef.current?.focus();
      } else {
        setHighlightedIdx(idx - 1);
        suggestionRefs.current[idx - 1]?.focus();
      }
    }
  }

  // [fix #6] cap to 5 items
  const allSuggestions   = searchQuery.trim()
    ? POPULAR_SEARCHES.filter(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
    : POPULAR_SEARCHES;
  const shownSuggestions = allSuggestions.slice(0, 5);
  // when no matches we show a fallback "Search for X" — treat as 1 suggestion for keyboard nav
  const suggestionCount  = shownSuggestions.length > 0 ? shownSuggestions.length : (searchQuery.trim() ? 1 : 0);
  const showDropdown     = searchFocused;

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
          : "bg-gradient-to-r from-[var(--brand-client)] to-[#7c6ff7]"
        )}>
          <p className="text-xs sm:text-sm text-white font-medium pr-8">
            {currentAnnouncement.type === "warning"     && "⚠️ "}
            {currentAnnouncement.type === "maintenance" && "🔧 "}
            {currentAnnouncement.type === "info"        && "📢 "}
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
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={platformName ?? "Logo"} className="h-8 w-auto max-w-[140px] object-contain" />
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

            {/* ── Search (desktop) ── */}
            <div className="hidden md:flex flex-1 items-center mx-4 relative max-w-md">
              {/* [fix #4] role="search" + aria-label on the form */}
              <form onSubmit={handleSearch} className="w-full flex items-center relative" role="search" aria-label="Search editors">
                <div className="flex-1 flex items-center gap-2.5 rounded-full border border-neutral-200 px-4 py-2 bg-neutral-50/50 hover:border-neutral-300 focus-within:bg-white focus-within:border-black transition-all">
                  <Search className="w-4 h-4 text-neutral-400 shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onFocus={handleSearchFocus}
                    onBlur={handleSearchBlur}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search editors, niches, styles..."
                    aria-autocomplete="list"
                    aria-expanded={showDropdown}
                    aria-haspopup="listbox"
                    aria-controls={showDropdown ? "search-suggestions" : undefined}
                    aria-activedescendant={highlightedIdx >= 0 ? `suggestion-${highlightedIdx}` : undefined}
                    className="flex-1 min-w-0 text-sm text-neutral-900 placeholder:text-neutral-400 bg-transparent focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(""); searchInputRef.current?.focus(); }}
                      className="text-neutral-400 hover:text-neutral-600 transition-colors shrink-0"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </form>

              {/* ── Autocomplete dropdown ── */}
              {showDropdown && (
                <div
                  id="search-suggestions"
                  role="listbox"
                  aria-label="Search suggestions"
                  className="absolute left-0 right-0 top-[calc(100%+4px)] bg-white rounded-2xl border border-neutral-200 shadow-[0_8px_30px_rgba(0,0,0,0.06)] z-50 overflow-hidden"
                >
                  <div className="px-4 py-2.5 border-b border-neutral-100">
                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.12em]">
                      {searchQuery.trim() ? "Suggestions" : "Popular searches"}
                    </p>
                  </div>
                  <div className="py-1">
                    {shownSuggestions.length > 0 ? shownSuggestions.map((label, idx) => (
                      <button
                        key={label}
                        id={`suggestion-${idx}`}
                        role="option"
                        aria-selected={highlightedIdx === idx}
                        ref={el => { suggestionRefs.current[idx] = el; }}
                        type="button"
                        onMouseDown={() => handleSuggestionClick(label)}
                        onFocus={() => { if (blurTimer.current) clearTimeout(blurTimer.current); setHighlightedIdx(idx); }}
                        onBlur={handleSearchBlur}
                        onKeyDown={e => handleSuggestionKeyDown(e, idx)}
                        className={cn(
                          "flex items-center gap-3 w-full px-4 py-2.5 text-xs transition-colors text-left focus:outline-none font-medium",
                          highlightedIdx === idx
                            ? "bg-neutral-50 text-black font-bold"
                            : "text-neutral-700 hover:bg-neutral-50/50"
                        )}
                      >
                        <Search className={cn("w-3.5 h-3.5 shrink-0 transition-colors", highlightedIdx === idx ? "text-black" : "text-neutral-400")} />
                        {label}
                      </button>
                    )) : searchQuery.trim() ? (
                      <button
                        id="suggestion-0"
                        role="option"
                        aria-selected={highlightedIdx === 0}
                        ref={el => { suggestionRefs.current[0] = el; }}
                        type="button"
                        onMouseDown={() => handleSuggestionClick(searchQuery)}
                        onFocus={() => { if (blurTimer.current) clearTimeout(blurTimer.current); setHighlightedIdx(0); }}
                        onBlur={handleSearchBlur}
                        onKeyDown={e => handleSuggestionKeyDown(e, 0)}
                        className={cn(
                          "flex items-center gap-3 w-full px-4 py-2.5 text-xs transition-colors text-left focus:outline-none font-medium",
                          highlightedIdx === 0
                            ? "bg-neutral-50 text-black font-bold"
                            : "text-neutral-700 hover:bg-neutral-50/50"
                        )}
                      >
                        <Search className={cn("w-3.5 h-3.5 shrink-0", highlightedIdx === 0 ? "text-black" : "text-neutral-400")} />
                        Search for &ldquo;{searchQuery}&rdquo;
                      </button>
                    ) : null}
                  </div>
                </div>
              )}
            </div>

            {/* ── Right side ── */}
            <div className="flex items-center gap-2 ml-auto">

              {/* Mobile search icon */}
              <Link href="/browse" className="md:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors" aria-label="Search editors">
                <Search className="w-5 h-5" />
              </Link>

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
                      aria-haspopup="true"
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
                              onClick={() => { setUserOpen(false); signOut({ callbackUrl: "/" }); }}
                              className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors font-medium"
                            >
                              <LogOut className="w-4 h-4 shrink-0" />
                              Sign out
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
                  {/* [fix #3] mobile-visible compact CTA */}
                  <Link href="/signup"
                    className="sm:hidden flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-bold text-white bg-black hover:bg-neutral-800 shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all">
                    Get started
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </>
              )}

              {/* Mobile hamburger */}
              <button
                className="md:hidden p-2 rounded-xl transition-colors text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Row 2: in-app nav (desktop) ── */}
        <div className="hidden md:block border-t border-neutral-200/60">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center overflow-x-auto [&::-webkit-scrollbar]:hidden">

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

      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
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

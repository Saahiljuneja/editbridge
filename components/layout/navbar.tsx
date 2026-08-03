"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Menu, X, ChevronDown, LayoutDashboard,
  Settings, LogOut, HelpCircle,
  BookOpen, Mail, Users, ArrowRight, Sparkles,
  BarChart2, Trophy, Film, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NotificationBell } from "@/components/layout/notification-bell";

/* ── data ── */
const NAV_LINKS = [
  { href: "/browse",       label: "Browse Editors" },
  { href: "/feed",         label: "Feed" },
  { href: "/find-editor",  label: "Match Me", icon: Sparkles, flag: "find_editor_quiz" as const },
  { href: "/how-it-works", label: "How It Works"   },
  { href: "/pricing",      label: "Pricing"         },
];

const RESOURCES = [
  { href: "/about",       icon: Users,      label: "About us",         desc: "Our story and mission"            },
  { href: "/blog",        icon: BookOpen,   label: "Blog",             desc: "Guides and creator tips"          },
  { href: "/showcase",    icon: Film,       label: "Showcase",         desc: "Hand-picked editor work"          },
  { href: "/leaderboard", icon: Trophy,     label: "Top 100 Editors",  desc: "Best-rated editors on EditBridge" },
  { href: "/faq",         icon: HelpCircle, label: "FAQ",              desc: "Common questions answered"        },
  { href: "/contact",     icon: Mail,       label: "Contact",          desc: "Support and enquiries"            },
  { href: "/compare",     icon: BarChart2,  label: "Compare",          desc: "Side-by-side editor comparison"   },
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
  const router = useRouter();

  const [mobileOpen,           setMobileOpen]           = useState(false);
  const [moreOpen,             setMoreOpen]             = useState(false);
  const [userOpen,             setUserOpen]             = useState(false);
  const [themeBannerDismissed, setThemeBannerDismissed] = useState(false);
  const [searchQuery,          setSearchQuery]          = useState("");
  const [searchFocused,        setSearchFocused]        = useState(false);
  const [row2Visible,          setRow2Visible]          = useState(true);
  const lastScrollY  = useRef(0);
  const blurTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  type AnnouncementBar = { id: string; title: string; body: string; type: string };
  const [announcements, setAnnouncements] = useState<AnnouncementBar[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [announcementIdx, setAnnouncementIdx] = useState(0);
  const [flags, setFlags] = useState<Record<string, boolean>>({});

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

  const navLinks = NAV_LINKS.filter((l) => !("flag" in l) || flags[(l as { flag: string }).flag] !== false);

  const visibleAnnouncements = announcements.filter(a => !dismissedIds.has(a.id));
  const currentAnnouncement = visibleAnnouncements[announcementIdx] ?? null;

  function dismissAnnouncement(id: string) {
    setDismissedIds(prev => new Set(prev).add(id));
    setAnnouncementIdx(0);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    router.push(q ? `/browse?q=${encodeURIComponent(q)}` : "/browse");
  }

  /* close dropdowns on route change */
  useEffect(() => {
    setMoreOpen(false);
    setUserOpen(false);
    setMobileOpen(false);
    setSearchFocused(false);
  }, [pathname]);

  /* hide row 2 on scroll-down, restore on scroll-up / at top */
  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      if (y < 10) {
        setRow2Visible(true);
      } else if (y > lastScrollY.current + 4) {
        setRow2Visible(false);
      } else if (y < lastScrollY.current - 4) {
        setRow2Visible(true);
      }
      lastScrollY.current = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* cleanup blur timer */
  useEffect(() => () => { if (blurTimer.current) clearTimeout(blurTimer.current); }, []);

  function handleSearchFocus() {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setSearchFocused(true);
  }
  function handleSearchBlur() {
    blurTimer.current = setTimeout(() => setSearchFocused(false), 150);
  }
  function handleSuggestionClick(label: string) {
    setSearchQuery(label);
    setSearchFocused(false);
    router.push(`/browse?q=${encodeURIComponent(label)}`);
  }

  const suggestions = searchQuery.trim()
    ? POPULAR_SEARCHES.filter(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
    : POPULAR_SEARCHES;
  const showDropdown = searchFocused;

  const initials = session?.user?.name
    ? session.user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const dashboardHref =
    session?.user?.role === "editor"          ? "/editor/dashboard"
    : session?.user?.role === "admin" || session?.user?.role?.startsWith("staff_")
                                              ? "/admin/dashboard"
    : "/client/dashboard";

  const roleLabel = ROLE_LABELS[session?.user?.role ?? ""] ?? "Member";
  const isActive  = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href.split("?")[0]);

  return (
    <>
      {/* ── Theme banner (platform settings) ── */}
      {themeBannerEnabled && themeBannerText && !themeBannerDismissed && (
        <div className="relative px-4 py-2.5 text-center" style={{ background: themeBannerBg }}>
          <p className="text-xs sm:text-sm font-medium pr-8" style={{ color: themeBannerTextColor }}>
            {themeBannerText}
          </p>
          <button
            onClick={() => setThemeBannerDismissed(true)}
            aria-label="Dismiss"
            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: themeBannerTextColor }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Announcement bar (DB-driven) ── */}
      {currentAnnouncement && (
        <div className={cn(
          "relative px-4 py-2.5 text-center",
          currentAnnouncement.type === "warning"     ? "bg-amber-500"
          : currentAnnouncement.type === "maintenance" ? "bg-red-600"
          : "bg-gradient-to-r from-[var(--brand-client)] to-[#7c6ff7]"
        )}>
          <p className="text-xs sm:text-sm text-white font-medium pr-8">
            {currentAnnouncement.type === "warning" && "⚠️ "}
            {currentAnnouncement.type === "maintenance" && "🔧 "}
            {currentAnnouncement.type === "info" && "📢 "}
            <span className="font-bold">{currentAnnouncement.title}</span>
            {currentAnnouncement.body && (
              <span className="font-normal opacity-90"> — {currentAnnouncement.body}</span>
            )}
          </p>
          {visibleAnnouncements.length > 1 && (
            <button
              onClick={() => setAnnouncementIdx(i => (i + 1) % visibleAnnouncements.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-xs font-bold transition-colors"
            >
              {announcementIdx + 1}/{visibleAnnouncements.length} ›
            </button>
          )}
          <button
            onClick={() => dismissAnnouncement(currentAnnouncement.id)}
            aria-label="Dismiss"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Main navbar ── */}
      <nav className={cn(
        "sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-gray-200 transition-shadow duration-300",
        row2Visible
          ? "shadow-[0_1px_8px_rgba(0,0,0,0.06)]"
          : "shadow-[0_4px_20px_rgba(0,0,0,0.1)]"
      )}>

        {/* ── Row 1: Logo + Search + Right actions ── */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3" style={{ height: 64 }}>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={platformName ?? "Logo"} className="h-8 w-auto max-w-[140px] object-contain" />
              ) : (
                <>
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#7c6ff7] to-[var(--brand-client)] flex items-center justify-center shadow-[0_2px_8px_rgba(74,63,181,0.4)] group-hover:shadow-[0_4px_16px_rgba(74,63,181,0.5)] transition-all">
                    <span className="text-white font-black text-sm">E</span>
                  </div>
                  <span className="text-[1.15rem] font-black tracking-tight text-gray-900">
                    {platformName
                      ? platformName
                      : <>Edit<span className="text-[var(--brand-client)]">Bridge</span></>}
                  </span>
                </>
              )}
            </Link>

            {/* ── Search bar (desktop) ── */}
            <div className="hidden md:flex flex-1 items-center mx-4 relative">
              <form onSubmit={handleSearch} className="w-full flex items-center">
                <div className="flex-1 flex items-center gap-2.5 rounded-l-xl border border-r-0 border-gray-200 px-4 py-2.5 bg-white hover:border-gray-300 focus-within:border-gray-400 transition-all">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onFocus={handleSearchFocus}
                    onBlur={handleSearchBlur}
                    placeholder="What service are you looking for today?"
                    className="flex-1 min-w-0 text-sm text-gray-900 placeholder:text-gray-400 bg-transparent focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="px-4 py-[11px] rounded-r-xl bg-gray-900 text-white hover:bg-gray-700 transition-colors shrink-0 border border-gray-900"
                  aria-label="Search"
                >
                  <Search className="w-4 h-4" />
                </button>
              </form>

              {/* ── Autocomplete dropdown ── */}
              {showDropdown && (
                <div className="absolute left-0 right-0 top-[calc(100%+4px)] bg-white rounded-xl border border-gray-200 shadow-[0_8px_30px_rgba(0,0,0,0.12)] z-50 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-gray-100">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      {searchQuery.trim() ? "Suggestions" : "Popular searches"}
                    </p>
                  </div>
                  <div className="py-1">
                    {suggestions.length > 0 ? suggestions.map((label) => (
                      <button
                        key={label}
                        type="button"
                        onMouseDown={() => handleSuggestionClick(label)}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                      >
                        <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        {label}
                      </button>
                    )) : (
                      <button
                        type="button"
                        onMouseDown={() => handleSuggestionClick(searchQuery)}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                      >
                        <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        Search for &ldquo;{searchQuery}&rdquo;
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Right side ── */}
            <div className="flex items-center gap-2 ml-auto md:ml-0">

              {/* Mobile search icon */}
              <Link href="/browse" className="md:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors" aria-label="Search editors">
                <Search className="w-5 h-5" />
              </Link>

              {session ? (
                <>
                  <NotificationBell />

                  <Link href={dashboardHref}
                    className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Link>

                  {/* User menu */}
                  <div className="relative">
                    <button onClick={() => setUserOpen(o => !o)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-xl border transition-all border-gray-200 bg-gray-50 hover:bg-gray-100">
                      <div className="w-7 h-7 rounded-lg bg-[var(--brand-client)] flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
                        {session.user?.image
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={session.user.image} alt="" className="w-full h-full object-cover" />
                          : initials}
                      </div>
                      <div className="hidden sm:block text-left max-w-[90px]">
                        <p className="text-xs font-semibold truncate leading-none text-gray-800">
                          {session.user?.name?.split(" ")[0]}
                        </p>
                        <p className="text-[10px] leading-none mt-0.5 text-gray-400">
                          {roleLabel}
                        </p>
                      </div>
                      <ChevronDown className={cn("w-3.5 h-3.5 shrink-0 transition-all text-gray-400", userOpen && "rotate-180")} />
                    </button>

                    {userOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setUserOpen(false)} />
                        <div className="absolute right-0 top-full mt-2 w-60 rounded-2xl border border-gray-100 bg-white shadow-[0_8px_40px_rgba(0,0,0,0.12)] z-20 overflow-hidden">
                          <div className="px-4 py-4 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[var(--brand-client)] flex items-center justify-center text-white text-sm font-bold shrink-0 overflow-hidden">
                                {session.user?.image
                                  // eslint-disable-next-line @next/next/no-img-element
                                  ? <img src={session.user.image} alt="" className="w-full h-full object-cover" />
                                  : initials}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-gray-900 truncate">{session.user?.name}</p>
                                <p className="text-xs text-gray-400 truncate">{session.user?.email}</p>
                                <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-[#7c6ff7]/10 text-[#7c6ff7] text-[10px] font-black uppercase tracking-wide">
                                  {roleLabel}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="p-1.5">
                            <DropItem href={dashboardHref} icon={LayoutDashboard} label="Dashboard" />
                            <DropItem href={session?.user?.role === "editor" ? "/editor/settings" : session?.user?.role === "admin" || session?.user?.role?.startsWith("staff_") ? "/admin/settings" : "/settings"} icon={Settings} label="Settings" />
                            <DropItem href="/faq" icon={HelpCircle} label="Help & FAQ" />
                          </div>
                          <div className="border-t border-gray-100 p-1.5">
                            <button
                              onClick={() => { setUserOpen(false); signOut({ callbackUrl: "/" }); }}
                              className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors font-medium">
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
                    className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all bg-[var(--brand-client)] hover:bg-sky-600 shadow-[0_2px_12px_rgba(14,165,233,0.4)] hover:shadow-[0_4px_20px_rgba(14,165,233,0.55)] hover:-translate-y-px">
                    Get started
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </>
              )}

              {/* Mobile hamburger */}
              <button
                className="md:hidden p-2 rounded-xl transition-colors text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Row 2: Nav links (desktop only, hides on scroll-down) ── */}
        <div className={cn(
          "hidden md:block overflow-hidden transition-[max-height,opacity,border-width] duration-300 ease-in-out",
          row2Visible
            ? "max-h-[44px] opacity-100 border-t border-gray-200"
            : "max-h-0 opacity-0 border-t-0"
        )}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">

              {/* Page nav links */}
              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap px-4 py-3 text-sm border-b-[3px] transition-colors shrink-0",
                    isActive(href)
                      ? "border-[var(--brand-client)] text-[var(--brand-client)] font-semibold"
                      : "border-transparent text-gray-600 font-medium hover:text-gray-900 hover:border-gray-300"
                  )}
                >
                  {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                  {label}
                </Link>
              ))}

              {/* Resources dropdown */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setMoreOpen(o => !o)}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap px-4 py-3 text-sm border-b-[3px] transition-colors",
                    moreOpen
                      ? "border-[var(--brand-client)] text-[var(--brand-client)] font-semibold"
                      : "border-transparent text-gray-600 font-medium hover:text-gray-900 hover:border-gray-300"
                  )}
                >
                  Resources
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", moreOpen && "rotate-180")} />
                </button>

                {moreOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMoreOpen(false)} />
                    <div className="absolute left-0 top-full mt-1 w-64 rounded-2xl border border-gray-100 bg-white shadow-[0_8px_40px_rgba(0,0,0,0.12)] z-20 overflow-hidden p-1.5">
                      {RESOURCES.map(({ href, icon: Icon, label, desc }) => (
                        <Link key={href} href={href}
                          className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors group">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-[#7c6ff7]/10 flex items-center justify-center shrink-0 transition-colors">
                            <Icon className="w-4 h-4 text-gray-400 group-hover:text-[#7c6ff7] transition-colors" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{label}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{desc}</p>
                          </div>
                        </Link>
                      ))}
                      <div className="mx-3 my-1.5 border-t border-gray-100" />
                      <Link href="/signup/editor"
                        className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#7c6ff7]/5 transition-colors group">
                        <div className="w-8 h-8 rounded-lg bg-[#7c6ff7]/10 flex items-center justify-center shrink-0">
                          <Sparkles className="w-4 h-4 text-[#7c6ff7]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#7c6ff7]">Become an editor</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">Apply and start earning</p>
                        </div>
                      </Link>
                    </div>
                  </>
                )}
              </div>


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
    <Link href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium group">
      <Icon className="w-4 h-4 text-gray-400 group-hover:text-gray-600 shrink-0 transition-colors" />
      {label}
    </Link>
  );
}

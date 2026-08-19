"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  X, LogOut, Sparkles, ArrowRight,
  Newspaper, Compass, Globe, HelpCircle, Star, Info,
  LayoutDashboard, ShoppingBag, MessageCircle, Bell, Bookmark,
  BookOpen, BarChart2, Gift, Trophy, Wallet, Settings, User,
  Package, CreditCard, Calendar, UserCheck, AlertTriangle, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

const LINK_ICONS: Record<string, LucideIcon> = {
  "/feed":                    Newspaper,
  "/browse":                  Compass,
  "/how-it-works":            Info,
  "/showcase":                Star,
  "/about":                   Globe,
  "/contact":                 MessageCircle,
  "/faq":                     HelpCircle,
  "/client/dashboard":        LayoutDashboard,
  "/client/orders":           ShoppingBag,
  "/client/messages":         MessageCircle,
  "/client/notifications":    Bell,
  "/client/saved":            Bookmark,
  "/client/saved-portfolio":  BookOpen,
  "/client/analytics":        BarChart2,
  "/client/referral":         Gift,
  "/client/rewards":          Trophy,
  "/client/wallet":           Wallet,
  "/client/settings":         Settings,
  "/client/help":             HelpCircle,
  "/editor/dashboard":        LayoutDashboard,
  "/editor/profile":          User,
  "/editor/packages":         Package,
  "/editor/orders":           ShoppingBag,
  "/editor/messages":         MessageCircle,
  "/editor/notifications":    Bell,
  "/editor/analytics":        BarChart2,
  "/editor/featured":         Star,
  "/editor/payments":         CreditCard,
  "/editor/availability":     Calendar,
  "/editor/rewards":          Trophy,
  "/editor/saved-portfolio":  BookOpen,
  "/editor/settings":         Settings,
  "/admin/dashboard":         LayoutDashboard,
  "/admin/kyc":               UserCheck,
  "/admin/orders":            ShoppingBag,
  "/admin/disputes":          AlertTriangle,
  "/admin/users":             Users,
};

const publicLinks = [
  { href: "/feed",          label: "Feed" },
  { href: "/browse",        label: "Browse Editors" },
  { href: "/how-it-works",  label: "How It Works" },
  { href: "/showcase",      label: "Showcase" },
  { href: "/about",         label: "About Us" },
  { href: "/contact",       label: "Contact & Support" },
];

const clientLinks = [
  { href: "/client/dashboard",       label: "Dashboard" },
  { href: "/feed",                   label: "Feed" },
  { href: "/browse",                 label: "Browse Editors" },
  { href: "/client/orders",          label: "My Orders" },
  { href: "/client/messages",        label: "Messages" },
  { href: "/client/notifications",   label: "Notifications" },
  { href: "/client/saved",           label: "Saved Editors" },
  { href: "/client/saved-portfolio", label: "Saved Portfolio" },
  { href: "/client/analytics",       label: "Analytics" },
  { href: "/client/referral",        label: "Refer & Earn" },
  { href: "/client/rewards",         label: "Rewards & XP" },
  { href: "/client/wallet",          label: "My Wallet" },
  { href: "/client/settings",        label: "Settings" },
  { href: "/client/help",            label: "Help & FAQ" },
];

const editorLinks = [
  { href: "/editor/dashboard",       label: "Dashboard" },
  { href: "/feed",                   label: "Feed" },
  { href: "/editor/profile",         label: "My Profile" },
  { href: "/editor/packages",        label: "Packages" },
  { href: "/editor/orders",          label: "Orders" },
  { href: "/editor/messages",        label: "Messages" },
  { href: "/editor/notifications",   label: "Notifications" },
  { href: "/editor/analytics",       label: "Analytics" },
  { href: "/editor/featured",        label: "Featured Placement", flag: "featured_placement" as const },
  { href: "/editor/payments",        label: "Payments" },
  { href: "/editor/availability",    label: "Availability" },
  { href: "/editor/rewards",         label: "Rewards & XP" },
  { href: "/editor/saved-portfolio", label: "Saved Portfolio" },
  { href: "/editor/settings",        label: "Settings" },
  { href: "/faq",                    label: "Help & FAQ" },
];

const adminLinks = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/kyc",       label: "KYC Queue" },
  { href: "/admin/orders",    label: "Orders" },
  { href: "/admin/disputes",  label: "Disputes" },
  { href: "/admin/users",     label: "Users" },
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

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    fetch("/api/feature-flags")
      .then((r) => r.json())
      .then((d) => setFlags(d.flags ?? {}))
      .catch(() => {});
  }, []);

  // Escape key to close
  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open, onClose]);

  // Scroll lock + focus management
  useEffect(() => {
    if (open) {
      prevFocusRef.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";
      // Defer focus so transition has started
      requestAnimationFrame(() => closeButtonRef.current?.focus());
    } else {
      document.body.style.overflow = "";
      prevFocusRef.current?.focus();
      prevFocusRef.current = null;
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const isAdmin = role === "admin" || (typeof role === "string" && role.startsWith("staff_"));
  const allLinks = role === "editor"  ? editorLinks
    : isAdmin                          ? adminLinks
    : session                          ? clientLinks
    : publicLinks;

  const links = allLinks.filter((l) => !("flag" in l) || flags[(l as { flag: string }).flag] !== false);

  const roleLabel = ROLE_LABELS[role ?? ""] ?? "Member";

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (delta > 80) onClose();
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-40 transition-all duration-300",
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={cn(
          "absolute inset-y-0 right-0 z-50 w-80 max-w-[90vw] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <Link href="/" onClick={onClose} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--brand-client)] flex items-center justify-center">
              <span className="text-white font-extrabold text-xs">E</span>
            </div>
            <span className="text-lg font-extrabold text-gray-900">
              Edit<span className="text-[var(--brand-client)]">Bridge</span>
            </span>
          </Link>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close menu"
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User strip (when signed in) */}
        {session && (
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--brand-client)] flex items-center justify-center text-white text-sm font-bold shrink-0 overflow-hidden">
              {session.user?.image ? (
                <Image
                  src={session.user.image}
                  alt=""
                  width={36}
                  height={36}
                  unoptimized
                  className="w-full h-full object-cover"
                />
              ) : (
                (session.user?.name ?? "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 truncate">{session.user?.name}</p>
              <p className="text-xs text-gray-400 truncate">{session.user?.email}</p>
            </div>
            <span className="shrink-0 text-[10px] font-bold text-[var(--brand-client)] bg-[var(--brand-client)]/10 px-2 py-0.5 rounded-full uppercase tracking-wide">
              {roleLabel}
            </span>
          </div>
        )}

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {links.map(({ href, label }) => {
            const active = href === "/client/dashboard" || href === "/editor/dashboard" || href === "/admin/dashboard"
              ? pathname === href
              : pathname.startsWith(href);
            const NavIcon = LINK_ICONS[href] ?? Globe;
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                  active
                    ? "bg-[var(--brand-client)]/10 text-[var(--brand-client)]"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <NavIcon className={cn("w-4 h-4 shrink-0", active ? "text-[var(--brand-client)]" : "text-gray-400")} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-gray-100 space-y-2">
          {session ? (
            <button
              onClick={() => { onClose(); signOut({ callbackUrl: "/" }); }}
              className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          ) : (
            <>
              <Link
                href="/signup/editor"
                onClick={onClose}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-[var(--brand-client)] border border-[var(--brand-client)]/25 bg-[var(--brand-client)]/5 hover:bg-[var(--brand-client)]/10 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Become an Editor
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors text-center"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  onClick={onClose}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-bold bg-black text-white hover:bg-neutral-800 shadow-[0_2px_12px_rgba(0,0,0,0.15)] transition-colors text-center"
                >
                  Get started
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { X, LogOut, Sparkles, ExternalLink, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

const publicLinks = [
  { href: "/feed",          label: "Feed" },
  { href: "/browse",        label: "Browse Editors" },
  { href: "/find-editor",   label: "Find an Editor", flag: "find_editor_quiz" as const },
  { href: "/how-it-works",  label: "How It Works" },
  { href: "/showcase",      label: "Showcase" },
  { href: "/about",         label: "About Us" },
  { href: "/contact",       label: "Contact & Support" },
];

const clientLinks = [
  { href: "/client/dashboard",       label: "Dashboard" },
  { href: "/feed",            label: "Feed" },
  { href: "/client/browse",          label: "Browse Editors" },
  { href: "/find-editor",     label: "Find an Editor", flag: "find_editor_quiz" as const },
  { href: "/client/orders",          label: "My Orders" },
  { href: "/client/messages",        label: "Messages" },
  { href: "/client/saved",            label: "Saved Editors" },
  { href: "/client/saved-portfolio",  label: "Saved Portfolio" },
  { href: "/client/analytics",       label: "Analytics" },
  { href: "/client/notifications",   label: "Notifications" },
  { href: "/client/settings",        label: "Settings" },
  { href: "/client/help",            label: "Help & FAQ" },
];

const editorLinks = [
  { href: "/editor/dashboard",    label: "Dashboard" },
  { href: "/feed",                label: "Feed" },
  { href: "/editor/profile",      label: "My Profile" },
  { href: "/editor/packages",     label: "Packages" },
  { href: "/editor/orders",       label: "Orders" },
  { href: "/editor/messages",     label: "Messages" },
  { href: "/editor/analytics",    label: "Analytics" },
  { href: "/editor/featured",     label: "Featured Placement", flag: "featured_placement" as const },
  { href: "/editor/payouts",      label: "Payouts" },
  { href: "/editor/availability",    label: "Availability" },
  { href: "/editor/saved-portfolio", label: "Saved Portfolio" },
  { href: "/editor/settings",     label: "Settings" },
  { href: "/faq",                 label: "Help & FAQ" },
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

  useEffect(() => {
    fetch("/api/feature-flags")
      .then((r) => r.json())
      .then((d) => setFlags(d.flags ?? {}))
      .catch(() => {});
  }, []);

  const allLinks = role === "editor"
    ? editorLinks
    : role === "admin" || role?.startsWith("staff_")
      ? adminLinks
      : session
        ? clientLinks
        : publicLinks;

  // A link with a `flag` is hidden entirely (not shown as disabled) while
  // that flag is off — mirrors EditorSidebar's behaviour.
  const links = allLinks.filter((l) => !("flag" in l) || flags[(l as { flag: string }).flag] !== false);

  if (!open) return null;

  const roleLabel = ROLE_LABELS[role ?? ""] ?? "Member";

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-80 max-w-[90vw] bg-white shadow-2xl flex flex-col">
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
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User strip (when signed in) */}
        {session && (
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--brand-client)] flex items-center justify-center text-white text-sm font-bold shrink-0 overflow-hidden">
              {session.user?.image
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={session.user.image} alt="" className="w-full h-full object-cover" />
                : (session.user?.name ?? "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
              }
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
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  "flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                  active
                    ? "bg-[var(--brand-client)]/10 text-[var(--brand-client)]"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <span>{label}</span>
                {href === "/contact" && <ExternalLink className="w-3.5 h-3.5 text-gray-300" />}
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
    </>
  );
}

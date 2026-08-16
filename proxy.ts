import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const { auth } = NextAuth(authConfig);

const ADMIN_ROLES = new Set([
  "admin",
  "staff_kyc",
  "staff_support",
  "staff_dispute",
  "staff_moderation",
]);

async function isMaintenanceOn(origin: string): Promise<boolean> {
  try {
    const res = await fetch(`${origin}/api/maintenance-check`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return false;
    const data = await res.json() as { on?: boolean };
    return data.on === true;
  } catch {
    return false;
  }
}

// Paths that require any authenticated session (client routes).
const CLIENT_PROTECTED_PREFIXES = [
  "/client/dashboard",
  "/client/orders",
  "/client/messages",
  "/client/calendar",
  "/client/disputes",
  "/client/help",
  "/client/notifications",
  "/client/payment-methods",
  "/client/quotes",
  "/client/referrals",
  "/client/reorder",
  "/client/reviews",
  "/client/rewards",
  "/client/saved",
  "/client/saved-portfolio",
  "/client/settings",
  "/client/membership",
  "/client/transactions",
  "/client/analytics",
  "/client/brief-templates",
  "/checkout",
];

export default auth(async (req: NextRequest & { auth: { user?: { role?: string; editorId?: string | null; needsOnboarding?: boolean; twoFactorPending?: boolean } } | null }) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const role = session?.user?.role;

  // ── Maintenance mode ─────────────────────────────────────────────────────────
  // We MUST bypass both /maintenance and the api endpoint /api/maintenance-check itself
  // to avoid infinite redirection loops and middleware recursion.
  if (
    !pathname.startsWith("/maintenance") &&
    !pathname.startsWith("/api/maintenance-check") &&
    role !== "admin"
  ) {
    const maintenance = await isMaintenanceOn(req.nextUrl.origin);
    if (maintenance) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Service Unavailable: Platform is undergoing maintenance." },
          { status: 503 }
        );
      }
      return NextResponse.redirect(new URL("/maintenance", req.url));
    }
  }

  // ── 2FA — redirect incomplete sessions to /2fa before any other check ────────
  if (session?.user?.twoFactorPending && pathname !== "/2fa" && !pathname.startsWith("/api/")) {
    return NextResponse.redirect(new URL("/2fa", req.url));
  }

  // ── Redirect already-logged-in users away from auth pages ───────────────────
  if (session && !session.user?.twoFactorPending) {
    if (pathname === "/login" || pathname === "/signup") {
      const dest = ADMIN_ROLES.has(role ?? "") ? "/admin/dashboard"
                 : role === "editor"            ? "/editor/dashboard"
                 : "/client/dashboard";
      return NextResponse.redirect(new URL(dest, req.url));
    }
  }

  // ── Smart dashboard redirect ──
  if (pathname === "/dashboard") {
    if (!session) {
      return NextResponse.redirect(new URL("/login?next=%2Fclient%2Fdashboard", req.url));
    }
    const dest = ADMIN_ROLES.has(role ?? "") ? "/admin/dashboard"
               : role === "editor"            ? "/editor/dashboard"
               : "/client/dashboard";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // ── Admin / staff routes ────────────────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    if (!session) {
      return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(pathname)}`, req.url));
    }
    if (!ADMIN_ROLES.has(role ?? "")) {
      return NextResponse.redirect(new URL("/client/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // ── Public editor profile pages: /editor/[uuid] ─────────────────────────────
  const isPublicEditorProfile = /^\/editor\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(pathname);
  if (isPublicEditorProfile) {
    return NextResponse.next();
  }

  // ── Editor portal routes: /editor/dashboard, /editor/kyc, etc. ──────────────
  if (pathname === "/editor" || pathname.startsWith("/editor/")) {
    if (!session) {
      return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(pathname)}`, req.url));
    }
    if (role !== "editor") {
      return NextResponse.redirect(new URL("/client/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // ── Client-side protected paths ──────────────────────────────────────────────
  if (CLIENT_PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    if (!session) {
      return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(pathname)}`, req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js)$).*)",
  ],
};

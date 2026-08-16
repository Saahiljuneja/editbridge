import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { platformSettings } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import {
  readMaintenanceCache,
  writeMaintenanceCache,
  isWithinMaintenanceWindow,
} from "@/lib/maintenance-cache";

const { auth } = NextAuth(authConfig);

const ADMIN_ROLES = new Set([
  "admin",
  "staff_kyc",
  "staff_support",
  "staff_dispute",
  "staff_moderation",
]);

async function isMaintenanceOn(): Promise<boolean> {
  let state = readMaintenanceCache();

  if (!state) {
    try {
      const rows = await db
        .select({ key: platformSettings.key, value: platformSettings.value })
        .from(platformSettings)
        .where(inArray(platformSettings.key, ["maintenance_mode", "maintenance_start", "maintenance_end"]));

      const map: Record<string, string> = {};
      for (const row of rows) map[row.key] = row.value;

      state = {
        manualOn: map.maintenance_mode === "true",
        windowStart: map.maintenance_start ?? "",
        windowEnd: map.maintenance_end ?? "",
      };
      writeMaintenanceCache(state);
    } catch (err) {
      console.warn("[middleware] Failed to read platform maintenance settings from database, assuming off:", err);
      return false;
    }
  }

  const windowActive = isWithinMaintenanceWindow(state.windowStart, state.windowEnd);
  return state.manualOn || windowActive;
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
    const maintenance = await isMaintenanceOn();
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

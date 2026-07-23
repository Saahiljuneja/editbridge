import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const { auth } = NextAuth(authConfig);

const STAFF_ROLES = [
  "staff_kyc",
  "staff_support",
  "staff_dispute",
  "staff_moderation",
];

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

export default auth(async (req: NextRequest & { auth: { user?: { role?: string; editorId?: string | null; needsOnboarding?: boolean } } | null }) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const role = session?.user?.role;

  // ── Maintenance mode ─────────────────────────────────────────────────────────
  // Skip the check for maintenance page itself and for admins
  if (!pathname.startsWith("/maintenance") && role !== "admin") {
    const maintenance = await isMaintenanceOn(req.nextUrl.origin);
    if (maintenance) {
      return NextResponse.redirect(new URL("/maintenance", req.url));
    }
  }

  // ── Onboarding redirect for first-time Google users ─────────────────────────
  if (session?.user?.needsOnboarding && pathname !== "/onboarding") {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  // ── Smart dashboard redirect — editors land on /editor/dashboard ─────────────
  if (pathname === "/dashboard" && role === "editor") {
    return NextResponse.redirect(new URL("/editor/dashboard", req.url));
  }

  // ── Admin / staff routes ────────────────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (role !== "admin" && !STAFF_ROLES.includes(role ?? "")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // ── Public editor profile pages: /editor/[uuid] ─────────────────────────────
  const isPublicEditorProfile = /^\/editor\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(pathname);
  if (isPublicEditorProfile) {
    return NextResponse.next();
  }

  // ── Editor portal routes: /editor/dashboard, /editor/kyc, etc. ──────────────
  // NOTE: must not match "/editors/*" (public category SEO landing pages).
  if (pathname === "/editor" || pathname.startsWith("/editor/")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (role !== "editor") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // ── Authenticated routes (any role) ─────────────────────────────────────────
  const authRequired = [
    "/dashboard",
    "/orders",
    "/checkout",
    "/messages",
    "/settings",
  ];

  if (authRequired.some((path) => pathname.startsWith(path))) {
    if (!session) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};

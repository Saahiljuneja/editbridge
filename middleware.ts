import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth(async (req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const user = req.auth?.user;
  const path = nextUrl.pathname;

  // 1. Skip middleware for static assets, public API routes, NextAuth paths, and the maintenance page itself
  if (
    path.startsWith("/_next") ||
    path.startsWith("/api/auth") ||
    path.startsWith("/api/maintenance-check") ||
    path === "/favicon.ico" ||
    path === "/maintenance"
  ) {
    return NextResponse.next();
  }

  // 2. Perform Maintenance Check
  try {
    const isAdminUser = user?.role === "admin";
    if (!isAdminUser) {
      const origin = nextUrl.origin;
      const res = await fetch(`${origin}/api/maintenance-check`, {
        next: { revalidate: 15 },
      });
      if (res.ok) {
        const { on } = await res.json();
        if (on) {
          return NextResponse.redirect(new URL("/maintenance", req.url));
        }
      }
    }
  } catch (error) {
    console.error("Middleware maintenance check failed", error);
  }

  // 3. Route Access Protections (role checks)
  const isClientPath = path.startsWith("/client");
  const isEditorPath = path.startsWith("/editor");
  const isAdminPath = path.startsWith("/admin");

  if (isAdminPath && user?.role !== "admin" && user?.role !== "staff_support" && user?.role !== "staff_dispute" && user?.role !== "staff_kyc") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (isEditorPath && user?.role !== "editor") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (isClientPath && user?.role !== "client") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

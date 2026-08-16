import type { Metadata } from "next";
import { Rubik, DM_Sans } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";
import { getPlatformSettings } from "@/lib/platform-settings";

const rubik = Rubik({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { name } = await getPlatformSettings();
  return {
    title: `${name} — Video Editing & Thumbnail Design Marketplace`,
    description:
      "Hire verified video editors and thumbnail designers. Fast, reliable, escrow-protected.",
  };
}

import { cookies } from "next/headers";
import { StickyImpersonationBar } from "@/components/admin/sticky-impersonation-bar";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { siteDarkMode, brandClient, brandEditor, brandTeal, customCss } = await getPlatformSettings();
  const themeClass = siteDarkMode === "dark" ? "dark" : "";
  const platformCss = `:root{--brand-client:${brandClient};--brand-editor:${brandEditor};--brand-teal:${brandTeal};}${customCss ? `\n${customCss}` : ""}`;
  
  const cookieStore = await cookies();
  const isSecure = process.env.NODE_ENV === "production";
  const hasOriginalAdmin = cookieStore.has(`${isSecure ? "__Secure-" : ""}authjs.original-admin-token`);

  return (
    <html lang="en" className={`${rubik.variable} ${dmSans.variable} ${GeistMono.variable} h-full antialiased${themeClass ? ` ${themeClass}` : ""}`}>
      <body className="min-h-full flex flex-col">
        {/* React 19 hoists <style precedence> to <head> automatically */}
        <style href="platform-vars" precedence="high" dangerouslySetInnerHTML={{ __html: platformCss }} />
        <Providers>
          {hasOriginalAdmin && <StickyImpersonationBar />}
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}

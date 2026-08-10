import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { AnnouncementBanner } from "@/components/layout/announcement-banner";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { getPlatformSettings } from "@/lib/platform-settings";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const { announcementEnabled, announcementText, announcementBg, announcementTextColor } =
    await getPlatformSettings();

  return (
    <>
      {announcementEnabled && announcementText && (
        <AnnouncementBanner
          text={announcementText}
          bg={announcementBg}
          textColor={announcementTextColor}
        />
      )}
      <Navbar />
      <main className="min-h-screen">{children}</main>
      <Footer />
      {/* Spacer so footer content clears the fixed bottom nav on mobile */}
      <div className="h-14 md:hidden" aria-hidden="true" />
      <MobileBottomNav />
    </>
  );
}

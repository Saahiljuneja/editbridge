import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { AnnouncementBanner } from "@/components/layout/announcement-banner";
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
    </>
  );
}

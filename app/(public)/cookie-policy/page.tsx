import { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/public/page-animations";

export const metadata: Metadata = {
  title: "Cookie Policy — EditBridge",
  description: "How EditBridge uses cookies and similar tracking technologies.",
};

const SECTIONS = [
  {
    num: "1",
    title: "What Are Cookies",
    body: `Cookies are small text files stored on your device when you visit a website. They allow the website to remember your preferences, keep you logged in, and understand how you use the site. Some cookies are essential for the site to work; others are optional.`,
  },
  {
    num: "2",
    title: "Cookies We Use",
    items: [
      {
        name: "Session cookies (essential)",
        desc: "Keep you logged in while you browse. Deleted automatically when you close your browser. Required for the platform to function.",
      },
      {
        name: "Authentication cookies (essential)",
        desc: "Store your session token after login so you don't have to sign in on every page. Set by NextAuth and expire after 30 days of inactivity.",
      },
      {
        name: "Preference cookies",
        desc: "Remember your interface preferences (e.g., sidebar state). These are stored in localStorage and are not sent to our servers.",
      },
      {
        name: "Analytics cookies (optional)",
        desc: "Help us understand which pages are visited and how users navigate the site. We use privacy-respecting analytics that do not track individuals across the web.",
      },
    ],
  },
  {
    num: "3",
    title: "Third-Party Cookies",
    body: `EditBridge integrates with Razorpay for payment processing. Razorpay may set its own cookies during the checkout flow to detect fraud and process transactions securely. We do not control these cookies — refer to Razorpay's privacy policy for details. We do not use Google Ads, Facebook Pixel, or other advertising trackers.`,
  },
  {
    num: "4",
    title: "How to Control Cookies",
    body: `You can control and delete cookies through your browser settings. Most browsers allow you to block third-party cookies while allowing essential ones. Note that disabling essential cookies will break login and core platform features. You can also clear all cookies at any time — you will be signed out of your account when you do.`,
  },
  {
    num: "5",
    title: "Do We Track You Across Other Sites?",
    body: `No. EditBridge does not use cross-site tracking, retargeting pixels, or fingerprinting. Our analytics are limited to activity on editbridge.com and do not follow you anywhere else on the internet.`,
  },
  {
    num: "6",
    title: "Changes to This Policy",
    body: `We may update this Cookie Policy from time to time. When we do, we will update the date at the top of this page. Continued use of EditBridge after changes are posted constitutes acceptance of the updated policy.`,
  },
  {
    num: "7",
    title: "Contact",
    body: `Questions about our use of cookies? Email privacy@editbridge.in.`,
  },
];

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <PageHero
        badge="Legal"
        title="Cookie Policy"
        subtitle="Last updated: June 2025"
        accentColor="var(--brand-client)"
      />

      {/* Content */}
      <div className="px-8 py-6 space-y-10">
        {SECTIONS.map((s) => (
          <section key={s.num}>
            <h2 className="text-base font-bold text-gray-900 mb-2">
              {s.num}. {s.title}
            </h2>
            {"body" in s && (
              <p className="text-sm text-gray-500 leading-relaxed">{s.body}</p>
            )}
            {"items" in s && (
              <div className="space-y-3 mt-3">
                {(s as { items: { name: string; desc: string }[] }).items.map((item) => (
                  <div key={item.name} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-sm font-semibold text-gray-800 mb-1">{item.name}</p>
                    <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}

        {/* Footer links */}
        <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-400">
          <Link href="/privacy" className="hover:text-[var(--brand-client)]">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-[var(--brand-client)]">Terms of Service</Link>
          <Link href="/contact" className="hover:text-[var(--brand-client)]">Contact Us</Link>
        </div>
      </div>
    </div>
  );
}
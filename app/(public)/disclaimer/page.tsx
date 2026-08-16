import { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/public/page-animations";

export const metadata: Metadata = {
  title: "Disclaimer — EditBridge",
  description: "Disclaimer of warranties and limitation of liability for EditBridge.",
};

const SECTIONS = [
  {
    num: "1",
    title: "Platform as Marketplace",
    body: `EditBridge is a marketplace that connects clients with independent video editors. EditBridge itself does not produce, edit, or deliver any video content. All editing services are provided by independent editors who are solely responsible for the quality and timeliness of their work.`,
  },
  {
    num: "2",
    title: "No Warranty on Editor Work",
    body: `EditBridge makes no warranties, express or implied, regarding the quality, accuracy, fitness for purpose, or completeness of any work delivered by editors on the platform. Client satisfaction depends on the editor's skills, the clarity of the brief provided, and the revision process. EditBridge recommends reviewing editor portfolios, ratings, and reviews before placing an order.`,
  },
  {
    num: "3",
    title: "No Warranty on Platform Availability",
    body: `EditBridge is provided "as is" and "as available." We do not guarantee that the platform will be available at all times, error-free, or free from interruptions. We may perform maintenance, upgrades, or experience downtime outside our control. We are not liable for any loss arising from platform unavailability.`,
  },
  {
    num: "4",
    title: "Limitation of Liability",
    body: `To the maximum extent permitted by applicable law, EditBridge, its directors, employees, and affiliates shall not be liable for any indirect, incidental, consequential, or punitive damages arising from your use of the platform or any services obtained through it — including but not limited to loss of revenue, loss of data, or dissatisfaction with editor deliverables. EditBridge's total aggregate liability to any user for any claim arising from the use of the platform shall not exceed the total amount paid by that user through the platform in the 3 months preceding the claim.`,
  },
  {
    num: "5",
    title: "Third-Party Links and Services",
    body: `The platform may contain links to third-party websites or integrate with third-party services (e.g., Razorpay for payments). EditBridge is not responsible for the content, privacy practices, or terms of any third-party service. Use of third-party services is at your own risk.`,
  },
  {
    num: "6",
    title: "Copyright and Intellectual Property",
    body: `Upon full payment and order completion, intellectual property in the delivered work transfers to the client, unless otherwise agreed in writing between the client and editor. EditBridge does not claim any ownership over editor deliverables. Editors are responsible for ensuring their work does not infringe on third-party copyrights (e.g., music, stock footage).`,
  },
  {
    num: "7",
    title: "Accuracy of Information",
    body: `EditBridge endeavours to keep information on the platform accurate and up to date but does not guarantee the accuracy, completeness, or timeliness of any content, including editor profiles, package descriptions, and pricing. Editors are responsible for maintaining accurate profiles.`,
  },
  {
    num: "8",
    title: "Governing Law",
    body: `This disclaimer and any disputes arising from it are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts of Delhi, India.`,
  },
];

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-white">
      <PageHero
        badge="Legal"
        title="Disclaimer"
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
            <p className="text-sm text-gray-500 leading-relaxed">{s.body}</p>
          </section>
        ))}

        {/* Footer links */}
        <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-400">
          <Link href="/terms" className="hover:text-[var(--brand-client)]">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-[var(--brand-client)]">Privacy Policy</Link>
          <Link href="/refund" className="hover:text-[var(--brand-client)]">Refund Policy</Link>
          <Link href="/contact" className="hover:text-[var(--brand-client)]">Contact Us</Link>
        </div>
      </div>
    </div>
  );
}
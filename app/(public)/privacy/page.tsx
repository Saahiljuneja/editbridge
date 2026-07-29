import { PageHero } from "@/components/public/page-animations";

const SECTIONS = [
  {
    num: "1",
    title: "Information We Collect",
    items: [
      "Account information (name, email address, password)",
      "Profile information (bio, skills, portfolio items)",
      "KYC documents (government ID and selfie photograph — editors only)",
      "Payment information (processed securely; EditBridge does not store card details)",
      "Communications sent through the platform chat system",
      "Usage data: pages visited, features used, and device/browser information",
    ],
    note: null,
  },
  {
    num: "2",
    title: "How We Use Your Information",
    items: [
      "To operate the marketplace and process transactions",
      "To verify editor identities through the KYC process",
      "To facilitate communication between clients and editors",
      "To send transactional emails (order updates, payment notifications)",
      "To resolve disputes and enforce our Terms of Service",
      "To improve the Platform and prevent fraud",
    ],
    note: null,
  },
  {
    num: "3",
    title: "Chat Oversight Disclosure",
    items: [],
    note: "All messages sent through the EditBridge platform chat system are stored and may be reviewed by EditBridge staff for the purposes of dispute resolution, moderation, and safety enforcement. Automated systems scan messages for contact information to enforce our off-platform communication policy. By using the chat system, you consent to this monitoring.",
  },
  {
    num: "4",
    title: "KYC Data",
    items: [],
    note: "KYC documents (government IDs and selfie photographs) are stored securely with restricted access. This data is accessible only to authorised EditBridge KYC reviewers and is retained for the duration of the editor's account plus 5 years as required by applicable regulations. KYC data is never shared with clients or third parties except as required by law.",
  },
  {
    num: "5",
    title: "Information Sharing",
    items: [
      "Payment processor — for payment processing and escrow management",
      "Email provider — for transactional email delivery",
      "Cloud storage — for secure file storage",
      "Database provider — for database hosting",
      "Hosting provider — for application hosting",
    ],
    note: "We do not sell your personal information to third parties. We do not share your information for advertising purposes.",
  },
  {
    num: "6",
    title: "Display Names",
    items: [],
    note: 'Your legal name is never displayed publicly. The Platform displays names in "First L." format (e.g., "Rahul K.") to protect your privacy while maintaining accountability.',
  },
  {
    num: "7",
    title: "Data Retention",
    items: [],
    note: "We retain your account data for the lifetime of your account. After account deletion, we retain certain data for up to 5 years as required for legal and financial compliance. Delivery files are retained for 1 year after order completion unless deleted by the editor.",
  },
  {
    num: "8",
    title: "Your Rights",
    items: [],
    note: "You have the right to access, correct, or request deletion of your personal data. To exercise these rights, contact us at support@editbridge.in. Note that some data may be retained for legal compliance even after a deletion request.",
  },
  {
    num: "9",
    title: "Cookies",
    items: [],
    note: "EditBridge uses session cookies for authentication and functional purposes only. We do not use tracking cookies or third-party advertising cookies.",
  },
  {
    num: "10",
    title: "Changes to This Policy",
    items: [],
    note: "We may update this Privacy Policy periodically. We will notify users of material changes via email. Continued use of the Platform after notification constitutes acceptance of the updated policy.",
  },
  {
    num: "11",
    title: "Contact",
    items: [],
    note: "For privacy-related questions or requests, contact us at: support@editbridge.in",
  },
];

export default function PrivacyPage() {
  return (
    <div className="flex flex-col">
      <PageHero
        badge="Legal"
        title="Privacy Policy"
        subtitle="Last updated: July 2026"
        accentColor="var(--brand-teal)"
      />

      <div className="px-8 py-6 w-full">
        <div className="space-y-6">
          {SECTIONS.map(({ num, title, items, note }) => (
            <section
              key={num}
              className="rounded-xl border border-gray-100 bg-white p-6"
            >
              <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[var(--brand-teal)]/10 text-[var(--brand-teal)] text-xs font-bold flex items-center justify-center shrink-0">
                  {num}
                </span>
                {title}
              </h2>
              {items.length > 0 && (
                <ul className="space-y-1.5 text-sm text-gray-500 mb-3">
                  {items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--brand-teal)]/40 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
              {note && <p className="text-sm text-gray-500 leading-relaxed">{note}</p>}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
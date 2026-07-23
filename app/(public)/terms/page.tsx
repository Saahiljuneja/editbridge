import { PageHero } from "@/components/public/page-animations";

const SECTIONS = [
  {
    num: "1",
    title: "Acceptance of Terms",
    content:
      'By accessing or using EditBridge ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform. These terms apply to all users, including clients, editors, and administrative staff.',
  },
  {
    num: "2",
    title: "User Accounts",
    content:
      "You must provide accurate information when creating an account. You are responsible for maintaining the confidentiality of your account credentials. You may not create accounts for others without their permission or use another person's account. EditBridge reserves the right to suspend or terminate accounts that violate these terms.",
  },
  {
    num: "3",
    title: "Editor KYC Verification",
    content:
      "Editors are required to complete a Know Your Customer (KYC) verification process before their profiles are made publicly visible. This involves submitting a valid government-issued identity document (Aadhaar, PAN Card, or Passport) and a selfie photograph. EditBridge reserves the right to approve or reject KYC applications at its discretion. Providing false or misleading KYC documents is grounds for immediate and permanent account termination and may be reported to relevant authorities.",
  },
  {
    num: "4",
    title: "Payment and Escrow",
    content:
      "All payments are held in a deferred escrow arrangement. Client funds are not transferred to the editor until the client explicitly approves the delivery or the 7-day auto-approval window expires. EditBridge does not hold funds in its own accounts — all escrow is managed under applicable RBI guidelines.",
  },
  {
    num: "5",
    title: "Commission and Fees",
    content:
      "EditBridge charges a 15% commission on the gross value of each completed order, deducted from the editor's payout. Clients pay a 4% payment processing fee on the total order value at checkout. The commission and processing fee apply only to completed orders. Cancelled orders before delivery are refunded in full with no commission charged. EditBridge reserves the right to change its commission or fee rates with 30 days' notice to affected users.",
  },
  {
    num: "6",
    title: "Delivery and Revisions",
    content:
      "Editors commit to delivering within the timeframe specified in their package. Clients may request revisions up to the limit defined in the purchased package. Revision requests must relate to the original brief and not constitute a change in scope. If an editor fails to deliver within the agreed timeframe, the client may cancel the order for a full refund.",
  },
  {
    num: "7",
    title: "Prohibited Conduct",
    content:
      "Users may not: share personal contact information through the platform chat; attempt to conduct transactions outside the Platform to circumvent the escrow system; upload content that infringes third-party intellectual property rights; engage in harassment, threats, or abusive communication; or create fake reviews or manipulate the rating system.",
  },
  {
    num: "8",
    title: "Disputes",
    content:
      "Either party may open a dispute on a delivered or revision-requested order. Disputes freeze the escrow pending review by EditBridge staff. EditBridge's dispute resolution decision is final and binding. EditBridge may resolve disputes by issuing a full refund, releasing funds to the editor, or splitting the amount at its discretion based on evidence provided by both parties.",
  },
  {
    num: "9",
    title: "Intellectual Property",
    content:
      "Upon full payment and order completion, the client owns the final delivered files. The editor retains the right to display the work in their portfolio unless the client has explicitly requested confidentiality. EditBridge claims no ownership over work created between clients and editors on the Platform.",
  },
  {
    num: "10",
    title: "Limitation of Liability",
    content:
      "EditBridge is a marketplace and is not responsible for the quality, legality, or timeliness of work delivered by editors. Our liability in any dispute is limited to the value of the order in question. We are not liable for indirect, incidental, or consequential damages arising from use of the Platform.",
  },
  {
    num: "11",
    title: "Governing Law",
    content:
      "These Terms are governed by the laws of India. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts of India.",
  },
  {
    num: "12",
    title: "Changes to Terms",
    content:
      "EditBridge may update these Terms at any time. We will notify registered users via email of material changes. Continued use of the Platform after changes constitutes acceptance of the revised Terms.",
  },
];

export default function TermsPage() {
  return (
    <div className="flex flex-col">
      <PageHero
        badge="Legal"
        title="Terms of Service"
        subtitle="Last updated: July 2026"
        accentColor="#0EA5E9"
      />

      <div className="px-8 py-6 w-full">
        <div className="space-y-8">
          {SECTIONS.map(({ num, title, content }) => (
            <section
              key={num}
              className="rounded-xl border border-gray-100 bg-white p-6"
            >
              <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#0EA5E9]/10 text-[#0EA5E9] text-xs font-bold flex items-center justify-center shrink-0">
                  {num}
                </span>
                {title}
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed">{content}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
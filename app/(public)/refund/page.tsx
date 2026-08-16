import { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/public/page-animations";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy — EditBridge",
  description: "EditBridge's refund and cancellation policy for clients and editors.",
};

const SECTIONS = [
  {
    num: "1",
    title: "Overview",
    body: `EditBridge operates an escrow-based marketplace. Client payments are held securely until the order is completed and approved. This policy explains when and how refunds are issued, and the conditions under which orders may be cancelled.`,
  },
  {
    num: "2",
    title: "Cancellation Before Work Begins",
    body: `A client may cancel an order before the editor has started work. In such cases, a full refund of the order amount is issued. The 10% processing fee is non-refundable as it covers payment gateway charges incurred at the time of transaction. Requests must be submitted through the dispute system on the order page.`,
  },
  {
    num: "3",
    title: "Cancellation After Work Has Started",
    body: `If an order is cancelled after the editor has begun work, a partial refund may be issued at EditBridge's discretion based on the extent of work completed. The editor must provide evidence of work done (drafts, project files, or screen recordings). EditBridge's decision in such cases is final. The 10% processing fee is non-refundable.`,
  },
  {
    num: "4",
    title: "Refunds on Delivery Disputes",
    body: `If a client believes the delivered work does not meet the agreed scope, they may raise a dispute through the order page within 7 days of delivery. EditBridge's support team will review the brief, the delivery, and all communications. Depending on the outcome, a full refund, partial refund, or no refund will be issued. Editors are expected to revise work as specified in their package terms before a dispute is raised.`,
  },
  {
    num: "5",
    title: "Auto-Approval & Release",
    body: `If a client does not approve, request revisions, or raise a dispute within 7 days of delivery, the order is automatically marked as complete and the payment is released to the editor. No refund will be issued after auto-approval has occurred, except in cases of verified fraud or platform error.`,
  },
  {
    num: "6",
    title: "Processing Fee",
    body: `A 10% processing fee (calculated on the package price) is charged to the client at the time of placing an order. This fee covers Razorpay payment gateway charges and is non-refundable under any circumstances, including cancellations and dispute outcomes.`,
  },
  {
    num: "7",
    title: "Editor Payouts",
    body: `Editors receive their payout 7 days after the client approves the delivery (or after auto-approval). Payouts are transferred to the editor's registered bank account via NEFT/IMPS. EditBridge deducts its platform commission before disbursing the payout. Payouts cannot be reversed once initiated.`,
  },
  {
    num: "8",
    title: "Fraud & Chargebacks",
    body: `If a client initiates a chargeback with their bank for a completed order without raising a dispute on EditBridge first, the client's account will be suspended pending investigation. EditBridge reserves the right to recover funds and take legal action in cases of fraudulent chargebacks.`,
  },
  {
    num: "9",
    title: "How to Request a Refund",
    body: `All refund and cancellation requests must be submitted through the dispute system inside your order page. Do not email refund requests directly — orders not in the dispute system cannot be processed. Requests are reviewed within 3–5 business days.`,
  },
  {
    num: "10",
    title: "Contact",
    body: `For questions about this policy, email support@editbridge.in. For payment-related issues not covered here, visit our Contact page.`,
  },
];

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <PageHero
        badge="Legal"
        title="Refund & Cancellation Policy"
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

        {/* Quick tip box */}
        <div className="rounded-2xl bg-[var(--brand-client)]/5 border border-[var(--brand-client)]/10 p-6">
          <p className="text-sm font-semibold text-gray-900 mb-1">Need to raise a dispute?</p>
          <p className="text-sm text-gray-500 mb-4">Go to your order page and click "Raise Dispute" — our team reviews all disputes within 3–5 business days.</p>
          <Link href="/orders" className="text-sm font-semibold text-[var(--brand-client)] hover:underline">
            View my orders →
          </Link>
        </div>

        {/* Footer links */}
        <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-400">
          <Link href="/terms" className="hover:text-[var(--brand-client)]">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-[var(--brand-client)]">Privacy Policy</Link>
          <Link href="/contact" className="hover:text-[var(--brand-client)]">Contact Us</Link>
        </div>
      </div>
    </div>
  );
}
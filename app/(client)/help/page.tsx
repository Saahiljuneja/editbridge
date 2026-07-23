import { HelpCircle } from "lucide-react";
import { getPlatformSettings } from "@/lib/platform-settings";

export const dynamic = "force-dynamic";

const faqs = [
  {
    q: "How does EditBridge work?",
    a: "Browse verified editors, choose a package, and pay securely. Your payment is protected and only released to the editor after you approve the delivered work. Once approved, the editor receives their payout minus a 15% platform fee.",
  },
  {
    q: "How do I place an order?",
    a: 'Find an editor on the Browse page, review their packages, and click "Book Now". Complete checkout with Razorpay. You\'ll receive an order confirmation and can track progress from My Orders.',
  },
  {
    q: "Is my payment secure?",
    a: "Yes. Payments are processed by Razorpay and held securely until you approve the delivery. Your payment is fully protected â€” you are never charged if you don't approve the work.",
  },
  {
    q: "What happens if I need revisions?",
    a: "Each package includes a set number of revisions. You can request a revision from the order page. The editor will re-deliver within their stated delivery time.",
  },
  {
    q: "What if I'm unhappy with the work?",
    a: "If revisions don't resolve your issue, you can open a dispute from the order page. Our support team reviews all disputes and may issue a full or partial refund.",
  },
  {
    q: "How do I communicate with my editor?",
    a: "Every order includes a private chat channel accessible from the order detail page or the Messages section. All communication must stay on-platform.",
  },
  {
    q: "Can I cancel an order?",
    a: "Orders can be cancelled before the editor starts work. Once work has begun, cancellation is subject to dispute resolution. Contact support if you're unsure.",
  },
  {
    q: "How long does delivery take?",
    a: "Delivery time depends on the package you selected. You can see the delivery days on each package card. Editors are required to deliver within that timeframe.",
  },
  {
    q: "Are editors verified?",
    a: "Yes. Every editor on EditBridge has been identity-verified through our KYC process and reviewed by our team before their profile goes live.",
  },
  {
    q: "How do I contact support?",
    a: "Use the dispute flow on the order page for issues related to an active order. For general enquiries, email our support team.",
  },
];

export default async function HelpPage() {
  const { supportEmail } = await getPlatformSettings();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Help & FAQ</h1>
            <p className="text-sm text-gray-400 mt-0.5">Answers to common questions about using EditBridge</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[#0EA5E9]/10 flex items-center justify-center">
            <HelpCircle className="w-4 h-4 text-[#0EA5E9]" />
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-3">
        {faqs.map((item, i) => (
          <div key={i} className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
            <p className="font-semibold text-gray-900 text-sm mb-2">{item.q}</p>
            <p className="text-sm text-gray-500 leading-relaxed">{item.a}</p>
          </div>
        ))}

        <div className="rounded-2xl border border-[#0EA5E9]/15 bg-[#0EA5E9]/5 p-5">
          <p className="text-sm font-semibold text-[#0EA5E9] mb-1">Still need help?</p>
          <p className="text-sm text-gray-600">
            Email us at{" "}
            <a href={`mailto:${supportEmail}`} className="underline text-[#0EA5E9] font-medium">
              {supportEmail}
            </a>{" "}
            and we&apos;ll get back to you within 24 hours.
          </p>
        </div>
      </div>
    </div>
  );
}

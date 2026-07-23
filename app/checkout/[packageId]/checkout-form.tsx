import Link from "next/link";
import { CheckCircle2, ArrowRight, Clock, ShieldCheck, MessageSquare } from "lucide-react";

export const metadata = {
  title: "Order Confirmed — EditBridge",
  description: "Your order has been placed successfully.",
};

export default function CheckoutSuccessPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden"
      style={{ background: "#07050f" }}
    >
      {/* Background blobs */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full bg-[#0EA5E9]/12 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-green-500/8 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-lg w-full text-center">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2 mb-12">
          <div className="w-7 h-7 rounded-lg bg-[#0EA5E9] flex items-center justify-center">
            <span className="text-white font-extrabold text-xs">E</span>
          </div>
          <span className="text-lg font-extrabold text-white tracking-tight">
            Edit<span className="text-[#8B7FE8]">Bridge</span>
          </span>
        </Link>

        {/* Success icon */}
        <div className="w-20 h-20 rounded-full bg-green-500/15 border border-green-500/25 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-400" />
        </div>

        <h1 className="text-3xl font-extrabold text-white mb-3">Order placed!</h1>
        <p className="text-white/50 text-sm leading-relaxed mb-10 px-8 py-6">
          Your payment was successful and the editor has been notified. You&apos;ll receive a
          confirmation email shortly.
        </p>

        {/* What happens next */}
        <div className="bg-white/[0.04] border border-white/8 rounded-2xl p-6 mb-8 text-left">
          <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-5">
            What happens next
          </p>
          <div className="space-y-5">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-[#0EA5E9]/20 border border-[#0EA5E9]/30 flex items-center justify-center shrink-0 mt-0.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#8B7FE8]" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold mb-0.5">Editor reviews your brief</p>
                <p className="text-white/40 text-xs leading-relaxed">
                  The editor will read your requirements and start working. Check your messages for
                  any questions.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-[#0EA5E9]/20 border border-[#0EA5E9]/30 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-[#8B7FE8]" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold mb-0.5">Delivery by the deadline</p>
                <p className="text-white/40 text-xs leading-relaxed">
                  You&apos;ll be notified when your edit is ready. You can then review and approve
                  or request revisions.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-[#0EA5E9]/20 border border-[#0EA5E9]/30 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#8B7FE8]" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold mb-0.5">Payment released after 7 days</p>
                <p className="text-white/40 text-xs leading-relaxed">
                  Once you approve the delivery, the editor&apos;s payment is released 7 days later —
                  giving you time to flag any issues.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/orders"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white text-sm transition-colors"
            style={{ background: "#0EA5E9" }}
          >
            View my orders
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/messages"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white text-sm border border-white/15 hover:bg-white/10 transition-colors"
          >
            Open messages
          </Link>
        </div>

        <p className="text-white/20 text-xs mt-8">
          Need help?{" "}
          <Link href="/contact" className="text-[#8B7FE8] hover:text-[#a78bfa] transition-colors">
            Contact support
          </Link>
        </p>
      </div>
    </div>
  );
}
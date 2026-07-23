import Link from "next/link";
import { Mail } from "lucide-react";

export const metadata = { title: "Check your email — EditBridge" };

export default function VerifyEmailSentPage() {
  return (
    <div className="text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#0EA5E9]/10 flex items-center justify-center mx-auto mb-5">
        <Mail className="w-7 h-7 text-[#0EA5E9]" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your inbox</h1>
      <p className="text-sm text-gray-500 leading-relaxed mb-6">
        We&apos;ve sent a verification link to your email address. Click it to activate your account.
      </p>
      <p className="text-xs text-gray-400 mb-8">
        The link expires in 24 hours. Check your spam folder if you don&apos;t see it.
      </p>
      <Link
        href="/login"
        className="text-sm text-[#0EA5E9] font-medium hover:underline"
      >
        Back to sign in
      </Link>
    </div>
  );
}

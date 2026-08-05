import Link from "next/link";

export const metadata = { title: "Check your email — EditBridge" };

export default function VerifyEmailSentPage() {
  return (
    <div className="text-center py-4">
      {/* Star Logo & Heading */}
      <div className="flex flex-col items-center mb-6 text-center">
        <div className="w-[52px] h-[52px] rounded-[16px] bg-[#111827] flex items-center justify-center shadow-[0_6px_16px_rgba(0,0,0,0.12)] mb-4 transition-transform hover:scale-105">
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L14.8 9.2L22 12L14.8 14.8L12 22L9.2 14.8L2 12L9.2 9.2L12 2Z" />
          </svg>
        </div>
        <h1 className="text-2xl font-black text-neutral-900 tracking-tight leading-none mb-3">
          Check your inbox
        </h1>
        <p className="text-[13.5px] text-neutral-500 leading-relaxed mb-4 max-w-[320px]">
          We&apos;ve sent a 6-digit verification code to your email address. Enter it on the next screen to activate your account.
        </p>
        <p className="text-xs text-neutral-400 font-semibold mb-8">
          The code expires in 10 minutes. Check your spam folder if you don&apos;t see it.
        </p>
      </div>

      <Link
        href="/login"
        className="text-sm text-neutral-950 font-bold hover:underline"
      >
        Back to sign in
      </Link>
    </div>
  );
}


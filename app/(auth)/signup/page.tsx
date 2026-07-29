import Link from "next/link";
import { MonitorPlay, PenTool, ArrowRight } from "lucide-react";

export default function SignupPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Join EditBridge</h1>
        <p className="text-sm text-gray-500">How will you use EditBridge?</p>
      </div>

      <div className="space-y-4 mb-8">
        <Link
          href="/signup/client"
          className="group flex items-center gap-4 p-5 rounded-2xl border-2 border-gray-100 hover:border-[var(--brand-client)] bg-white hover:bg-purple-50/50 transition-all duration-200"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-100 group-hover:bg-[var(--brand-client)] flex items-center justify-center shrink-0 transition-colors duration-200">
            <MonitorPlay className="w-6 h-6 text-[var(--brand-client)] group-hover:text-white transition-colors duration-200" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">I need videos edited</p>
            <p className="text-sm text-gray-500 mt-0.5">Hire KYC-verified editors for your content</p>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[var(--brand-client)] group-hover:translate-x-1 transition-all duration-200" />
        </Link>

        <Link
          href="/signup/editor"
          className="group flex items-center gap-4 p-5 rounded-2xl border-2 border-gray-100 hover:border-[var(--brand-client)] bg-white hover:bg-emerald-50/50 transition-all duration-200"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-100 group-hover:bg-[var(--brand-client)] flex items-center justify-center shrink-0 transition-colors duration-200">
            <PenTool className="w-6 h-6 text-[var(--brand-client)] group-hover:text-white transition-colors duration-200" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">I am a video editor</p>
            <p className="text-sm text-gray-500 mt-0.5">Offer your skills and keep 85% of every order</p>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[var(--brand-client)] group-hover:translate-x-1 transition-all duration-200" />
        </Link>
      </div>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-100" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs text-gray-400">already have an account?</span>
        </div>
      </div>

      <Link
        href="/login"
        className="block w-full text-center py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        Sign in instead
      </Link>
    </>
  );
}

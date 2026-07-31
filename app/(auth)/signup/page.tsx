import Link from "next/link";
import { MonitorPlay, PenTool, ArrowRight } from "lucide-react";

export default function SignupPage() {
  return (
    <div className="w-full">
      <div className="mb-7">
        <h1 className="text-[1.9rem] font-black text-white tracking-tight leading-none mb-2">
          Join EditBridge
        </h1>
        <p className="text-[14px] text-white/40">
          How will you use EditBridge?
        </p>
      </div>

      <div className="space-y-3 mb-7">
        <Link
          href="/signup/client"
          className="group flex items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/[0.09] hover:border-sky-400/35 transition-all duration-200"
        >
          <div className="w-12 h-12 rounded-xl bg-sky-500/15 border border-sky-400/20 group-hover:bg-sky-500/25 flex items-center justify-center shrink-0 transition-all duration-200">
            <MonitorPlay className="w-6 h-6 text-sky-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white">I need videos edited</p>
            <p className="text-sm text-white/40 mt-0.5">Hire KYC-verified editors for your content</p>
          </div>
          <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
        </Link>

        <Link
          href="/signup/editor"
          className="group flex items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/[0.09] hover:border-violet-400/35 transition-all duration-200"
        >
          <div className="w-12 h-12 rounded-xl bg-violet-500/15 border border-violet-400/20 group-hover:bg-violet-500/25 flex items-center justify-center shrink-0 transition-all duration-200">
            <PenTool className="w-6 h-6 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white">I am a video editor</p>
            <p className="text-sm text-white/40 mt-0.5">Offer your skills and keep 85% of every order</p>
          </div>
          <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
        </Link>
      </div>

      <div className="relative mb-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/8" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 text-[11px] font-semibold text-white/20 uppercase tracking-widest">
            already have an account?
          </span>
        </div>
      </div>

      <Link
        href="/login"
        className="flex items-center justify-center w-full h-[48px] rounded-2xl text-[14px] font-semibold text-white/50 hover:text-white/85 transition-all bg-white/5 border border-white/10 hover:bg-white/[0.09]"
      >
        Sign in instead
      </Link>
    </div>
  );
}

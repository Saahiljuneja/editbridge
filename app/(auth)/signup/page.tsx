import Link from "next/link";
import { MonitorPlay, PenTool, ArrowRight } from "lucide-react";

import { AuthTabToggle } from "../auth-tab-toggle";

export default function SignupPage() {
  return (
    <div className="w-full">
      {/* Star Logo & Heading */}
      <div className="flex flex-col items-center mb-6 text-center">
        <div className="w-[52px] h-[52px] rounded-[16px] bg-[#111827] flex items-center justify-center shadow-[0_6px_16px_rgba(0,0,0,0.12)] mb-3 transition-transform hover:scale-105">
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L14.8 9.2L22 12L14.8 14.8L12 22L9.2 14.8L2 12L9.2 9.2L12 2Z" />
          </svg>
        </div>
        <h1 className="text-[1.75rem] font-black text-neutral-900 tracking-tight leading-none mb-1">
          Join EditBridge
        </h1>
        <p className="text-[12.5px] text-neutral-400 font-semibold mb-5">
          Connect with top video editors worldwide.
        </p>
        <div className="w-full max-w-[260px] mx-auto">
          <AuthTabToggle />
        </div>
      </div>

      <div className="mb-5 text-center">
        <p className="text-[13.5px] text-neutral-500 font-medium">
          How will you use EditBridge?
        </p>
      </div>

      <div className="space-y-3.5 mb-7">
        <Link
          href="/signup/client"
          className="group flex items-center gap-4 p-5 rounded-2xl bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 hover:border-neutral-300 transition-all duration-200"
        >
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-400/20 group-hover:bg-sky-500/20 flex items-center justify-center shrink-0 transition-all duration-200">
            <MonitorPlay className="w-6 h-6 text-sky-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-neutral-900 text-[14.5px]">I need videos edited</p>
            <p className="text-[12.5px] text-neutral-500 mt-0.5 font-medium">Hire KYC-verified editors for your content</p>
          </div>
          <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
        </Link>

        <Link
          href="/signup/editor"
          className="group flex items-center gap-4 p-5 rounded-2xl bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 hover:border-neutral-300 transition-all duration-200"
        >
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-400/20 group-hover:bg-violet-500/20 flex items-center justify-center shrink-0 transition-all duration-200">
            <PenTool className="w-6 h-6 text-violet-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-neutral-900 text-[14.5px]">I am a video editor</p>
            <p className="text-[12.5px] text-neutral-500 mt-0.5 font-medium">Offer your skills and keep 85% of every order</p>
          </div>
          <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
        </Link>
      </div>

      <div className="relative mb-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-neutral-100" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest bg-white">
            already have an account?
          </span>
        </div>
      </div>

      <Link
        href="/login"
        className="flex items-center justify-center w-full h-[48px] rounded-2xl text-[13.5px] font-bold text-neutral-600 hover:text-neutral-900 transition-all bg-neutral-50 border border-neutral-200 hover:bg-neutral-100"
      >
        Sign in instead
      </Link>
    </div>
  );
}


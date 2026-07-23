"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, MessageSquare } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 text-center relative overflow-hidden"
      style={{ background: "#07050f" }}
    >
      {/* Background blobs */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full bg-red-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 rounded-full bg-[#0EA5E9]/15 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-md w-full">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2 mb-12">
          <div className="w-7 h-7 rounded-lg bg-[#0EA5E9] flex items-center justify-center">
            <span className="text-white font-extrabold text-xs">E</span>
          </div>
          <span className="text-lg font-extrabold text-white tracking-tight">
            Edit<span className="text-[#8B7FE8]">Bridge</span>
          </span>
        </Link>

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">Something went wrong</h1>
        <p className="text-white/50 text-sm leading-relaxed mb-2">
          We hit an unexpected error. This has been logged and our team will look into it.
        </p>
        {error.digest && (
          <p className="text-white/25 text-xs mb-8 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        {!error.digest && <div className="mb-8" />}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white text-sm transition-colors"
            style={{ background: "#0EA5E9" }}
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white text-sm border border-white/15 hover:bg-white/10 transition-colors"
          >
            <Home className="w-4 h-4" />
            Go home
          </Link>
        </div>

        <div className="mt-8 pt-8 border-t border-white/8">
          <p className="text-white/30 text-xs mb-3">Still having issues?</p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-1.5 text-xs text-[#8B7FE8] hover:text-[#a78bfa] transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Contact support
          </Link>
        </div>
      </div>
    </div>
  );
}

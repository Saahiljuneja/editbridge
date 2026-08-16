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
      style={{ background: "#f8fafc" }}
    >
      {/* Background blobs */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full bg-red-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 rounded-full bg-[var(--brand-client)]/5 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-md w-full">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2 mb-12">
          <div className="w-7 h-7 rounded-lg bg-[var(--brand-client)] flex items-center justify-center">
            <span className="text-white font-extrabold text-xs">E</span>
          </div>
          <span className="text-lg font-extrabold text-neutral-900 tracking-tight">
            Edit<span className="text-[#7c6ff7]">Bridge</span>
          </span>
        </Link>

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-red-650" />
        </div>

        <h1 className="text-2xl font-bold text-neutral-900 mb-3">Something went wrong</h1>
        <p className="text-neutral-500 text-sm leading-relaxed mb-2">
          We hit an unexpected error. This has been logged and our team will look into it.
        </p>
        {error.digest && (
          <p className="text-neutral-400 text-xs mb-8 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        {!error.digest && <div className="mb-8" />}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white text-sm transition-colors shadow-sm"
            style={{ background: "var(--brand-client)" }}
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-neutral-600 hover:text-neutral-900 border border-neutral-250 bg-white hover:bg-neutral-50 transition-colors shadow-sm"
          >
            <Home className="w-4 h-4" />
            Go home
          </Link>
        </div>

        <div className="mt-8 pt-8 border-t border-neutral-200/60">
          <p className="text-neutral-450 text-xs mb-3 font-semibold">Still having issues?</p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-1.5 text-xs text-[#7c6ff7] hover:text-[#6a5ef0] transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Contact support
          </Link>
        </div>
      </div>
    </div>
  );
}

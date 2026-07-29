import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 text-center relative overflow-hidden"
      style={{ background: "#07050f" }}
    >
      {/* Background blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[var(--brand-client)]/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-[var(--brand-teal)]/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-md">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2 mb-12">
          <div className="w-7 h-7 rounded-lg bg-[var(--brand-client)] flex items-center justify-center">
            <span className="text-white font-extrabold text-xs">E</span>
          </div>
          <span className="text-lg font-extrabold text-white tracking-tight">
            Edit<span className="text-[#8B7FE8]">Bridge</span>
          </span>
        </Link>

        {/* 404 */}
        <div className="text-8xl font-extrabold text-transparent bg-clip-text mb-4"
          style={{ backgroundImage: "linear-gradient(135deg, #0EA5E9, #8B7FE8)" }}>
          404
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">Page not found</h1>
        <p className="text-white/50 text-sm leading-relaxed mb-10">
          The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white text-sm transition-colors"
            style={{ background: "var(--brand-client)" }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
          <Link
            href="/browse"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white text-sm border border-white/15 hover:bg-white/10 transition-colors"
          >
            <Search className="w-4 h-4" />
            Browse editors
          </Link>
        </div>
      </div>
    </div>
  );
}

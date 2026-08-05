import Link from "next/link";
import { ArrowLeft, FileSearch } from "lucide-react";

export default function BlogNotFound() {
  return (
    <div className="min-h-screen bg-[#07050f] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
          <FileSearch className="w-10 h-10 text-white/30" />
        </div>
        <h1 className="text-3xl font-black text-white mb-3">Post not found</h1>
        <p className="text-white/40 text-sm leading-relaxed mb-8">
          This article doesn&apos;t exist or may have been removed. Head back to the blog to find what you&apos;re looking for.
        </p>
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#8B7FE8] text-white text-sm font-semibold hover:bg-[#7a6fd6] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
        </Link>
      </div>
    </div>
  );
}

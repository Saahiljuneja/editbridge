import Link from "next/link";
import { ArrowLeft, FileSearch } from "lucide-react";

export default function BlogNotFound() {
  return (
    <div className="min-h-screen bg-slate-50/50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-3xl bg-white border border-neutral-200/60 shadow-sm flex items-center justify-center mx-auto mb-6">
          <FileSearch className="w-10 h-10 text-neutral-400" />
        </div>
        <h1 className="text-3xl font-black text-neutral-900 mb-3">Post not found</h1>
        <p className="text-neutral-500 text-sm leading-relaxed mb-8">
          This article doesn&apos;t exist or may have been removed. Head back to the blog to find what you&apos;re looking for.
        </p>
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7c6ff7] text-white text-sm font-semibold hover:bg-[#6a5ef0] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
        </Link>
      </div>
    </div>
  );
}

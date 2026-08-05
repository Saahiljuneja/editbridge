"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="text-center py-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-black text-neutral-900 mb-2">Check your inbox</h2>
        <p className="text-[13.5px] text-neutral-500 leading-relaxed mb-6">
          If an account exists for <strong className="text-neutral-800">{email}</strong>, you&apos;ll receive a
          password reset link within a few minutes.
        </p>
        <Link href="/login" className="text-sm font-bold text-neutral-900 hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Star Logo & Heading */}
      <div className="flex flex-col items-center mb-8 text-center">
        <div className="w-[52px] h-[52px] rounded-[16px] bg-[#111827] flex items-center justify-center shadow-[0_6px_16px_rgba(0,0,0,0.12)] mb-3 transition-transform hover:scale-105">
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L14.8 9.2L22 12L14.8 14.8L12 22L9.2 14.8L2 12L9.2 9.2L12 2Z" />
          </svg>
        </div>
        <h1 className="text-[1.75rem] font-black text-neutral-900 tracking-tight leading-none mb-1">
          Reset password
        </h1>
        <p className="text-[12.5px] text-neutral-400 font-semibold">
          Enter your email and we&apos;ll send a reset link
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email stacked input */}
        <div className="relative rounded-[20px] border border-neutral-200 px-4 py-2.5 bg-[#ffffff] transition-all focus-within:ring-2 focus-within:ring-black/5 focus-within:border-black text-left">
          <label htmlFor="email" className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider select-none">
            Email address
          </label>
          <input
            id="email"
            type="email"
            placeholder="robert.fox@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full bg-transparent text-[14px] text-neutral-900 placeholder-neutral-300 outline-none mt-0.5 h-6"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-[52px] rounded-2xl bg-black text-white hover:bg-neutral-900 text-[14.5px] font-bold transition-all active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          style={{
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <span>Send reset link</span>
          )}
        </button>
      </form>

      {/* Sign-in link */}
      <div className="mt-6 pt-5 border-t border-neutral-100 text-center">
        <p className="text-[13px] text-neutral-400 font-medium">
          Remember your password?{" "}
          <Link href="/login" className="font-bold text-neutral-900 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}


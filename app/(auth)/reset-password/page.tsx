"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  }

  const checks = {
    lowercase: /[a-z]/.test(form.password),
    uppercase: /[A-Z]/.test(form.password),
    number: /[0-9]/.test(form.password),
    special: /[^a-zA-Z0-9]/.test(form.password),
    length: form.password.length >= 8,
  };
  const allChecksPass = Object.values(checks).every(Boolean);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    if (!allChecksPass) {
      setErrors({ password: "Password must meet all requirements." });
      return;
    }
    if (form.password !== form.confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match." });
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: form.password, confirmPassword: form.confirmPassword }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Reset failed. The link may have expired.");
      setLoading(false);
      return;
    }

    toast.success("Password updated! Please sign in.");
    router.push("/login");
  }

  if (!token) {
    return (
      <div className="w-full">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-[52px] h-[52px] rounded-[16px] bg-[#111827] flex items-center justify-center shadow-[0_6px_16px_rgba(0,0,0,0.12)] mb-3 transition-transform hover:scale-105">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L14.8 9.2L22 12L14.8 14.8L12 22L9.2 14.8L2 12L9.2 9.2L12 2Z" />
            </svg>
          </div>
          <h1 className="text-[1.75rem] font-black text-neutral-900 tracking-tight leading-none mb-1">
            Invalid link
          </h1>
          <p className="text-[12.5px] text-neutral-400 font-semibold">
            This password reset link is missing or expired.
          </p>
        </div>
        <p className="text-[13.5px] text-neutral-500 text-center mb-5 leading-relaxed">
          The link may have already been used or expired. Request a new one below.
        </p>
        <Link
          href="/forgot-password"
          className="w-full h-[52px] rounded-2xl bg-black text-white hover:bg-neutral-900 text-[14.5px] font-bold transition-all active:scale-[0.99] flex items-center justify-center gap-2"
          style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
        >
          Request a new link
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
          Set new password
        </h1>
        <p className="text-[12.5px] text-neutral-400 font-semibold">
          Choose a strong password
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Password stacked input */}
        <div className="relative rounded-[20px] border border-neutral-200 px-4 py-2.5 bg-[#ffffff] transition-all focus-within:ring-2 focus-within:ring-black/5 focus-within:border-black text-left">
          <label htmlFor="password" className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider select-none">
            New password
          </label>
          <div className="relative flex items-center">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              className="w-full bg-transparent text-[14px] text-neutral-900 placeholder-neutral-300 outline-none mt-0.5 h-6 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-0 text-neutral-400 hover:text-neutral-600 transition-colors"
              style={{ top: "50%", transform: "translateY(-50%)" }}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
            </button>
          </div>
        </div>
        {errors.password && <p className="text-xs text-red-500 mt-1 pl-1">{errors.password}</p>}

        {/* Password strength checklist */}
        {form.password.length > 0 && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-1 pt-0.5">
            {([
              { key: "lowercase", label: "One lowercase letter" },
              { key: "uppercase", label: "One uppercase letter" },
              { key: "number", label: "One number" },
              { key: "special", label: "One special character" },
              { key: "length", label: "At least 8 characters" },
            ] as { key: keyof typeof checks; label: string }[]).map(({ key, label }) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className={cn(
                  "w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 transition-colors",
                  checks[key] ? "bg-emerald-500" : "bg-neutral-200"
                )}>
                  {checks[key] && <Check className="w-2 h-2 text-white" strokeWidth={3} />}
                </div>
                <span className={cn(
                  "text-[10.5px] font-medium transition-colors",
                  checks[key] ? "text-emerald-600" : "text-neutral-400"
                )}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Confirm password stacked input */}
        <div className="relative rounded-[20px] border border-neutral-200 px-4 py-2.5 bg-[#ffffff] transition-all focus-within:ring-2 focus-within:ring-black/5 focus-within:border-black text-left">
          <label htmlFor="confirmPassword" className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider select-none">
            Confirm new password
          </label>
          <div className="relative flex items-center">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirm ? "text" : "password"}
              placeholder="••••••••••••"
              value={form.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              className="w-full bg-transparent text-[14px] text-neutral-900 placeholder-neutral-300 outline-none mt-0.5 h-6 pr-16"
            />
            <div className="absolute right-0 flex items-center gap-1.5" style={{ top: "50%", transform: "translateY(-50%)" }}>
              {form.confirmPassword.length > 0 && (
                form.confirmPassword === form.password
                  ? <span className="text-[11px] font-bold text-emerald-500 tracking-wide">Matched</span>
                  : <span className="text-[11px] font-bold text-red-400 tracking-wide">No match</span>
              )}
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
              </button>
            </div>
          </div>
        </div>
        {errors.confirmPassword && (
          <p className="text-xs text-red-500 mt-1 pl-1">{errors.confirmPassword}</p>
        )}

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
            <span>Update password</span>
          )}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}


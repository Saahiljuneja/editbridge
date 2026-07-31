"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signupSchema } from "@/lib/validations";
import { toast } from "sonner";
import { allRulesPassed } from "@/components/ui/password-input";
import { Eye, EyeOff, ArrowRight, Loader2, ShieldCheck, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const RULES = [
  { label: "At least 1 lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "At least 1 uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "At least 1 number",           test: (p: string) => /[0-9]/.test(p) },
  { label: "At least 1 special character",test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
  { label: "At least 8 characters",       test: (p: string) => p.length >= 8 },
];

function GoogleIcon() {
  return (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export default function ClientSignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const urlRef = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("ref") : null;
  const [refCode, setRefCode] = useState<string>(urlRef ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const result = signupSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (!allRulesPassed(form.password)) {
      setErrors({ password: "Password does not meet all requirements." });
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...result.data, role: "client", ...(refCode.trim() ? { ref: refCode.trim() } : {}) }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Signup failed. Please try again.");
      setLoading(false);
      return;
    }

    sessionStorage.setItem("eb_pending_signin", JSON.stringify({ email: form.email, password: form.password }));
    router.push(`/verify-email?email=${encodeURIComponent(form.email)}`);
  }

  const inputClass = "w-full h-[52px] rounded-2xl px-4 text-[15px] text-white placeholder-white/25 outline-none transition-all focus:ring-2 focus:ring-sky-400/40"
  const inputStyle = { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)" }
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.background = "rgba(255,255,255,0.10)"; e.currentTarget.style.borderColor = "rgba(14,165,233,0.5)"; }
  const onBlur  = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; }

  return (
    <div className="w-full">
      <div className="mb-7">
        <h1 className="text-[1.9rem] font-black text-white tracking-tight leading-none mb-2">
          Create account
        </h1>
        <p className="text-[14px] text-white/40">
          Find and hire the best video editors
        </p>
      </div>

      {/* Google */}
      <button
        type="button"
        onClick={async () => {
          setGoogleLoading(true);
          await fetch("/api/auth/set-google-role", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "client" }),
          });
          signIn("google", { callbackUrl: "/client/dashboard" });
        }}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-3 h-[52px] rounded-2xl text-[14px] font-semibold text-white/80 transition-all active:scale-[0.99] disabled:opacity-50 mb-4"
        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.11)")}
        onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
      >
        {googleLoading ? <Loader2 className="w-4 h-4 animate-spin text-white/50" /> : <GoogleIcon />}
        {googleLoading ? "Redirecting…" : "Continue with Google"}
      </button>

      {/* Divider */}
      <div className="relative mb-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/8" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 text-[11px] font-semibold text-white/20 uppercase tracking-widest">
            or email
          </span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Name */}
        <div className="space-y-1.5">
          <label htmlFor="name" className="block text-[13px] font-semibold text-white/50">Full name</label>
          <input id="name" name="name" placeholder="Rahul Kumar" value={form.name} onChange={handleChange}
            autoComplete="name" className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
          {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-[13px] font-semibold text-white/50">Email address</label>
          <input id="email" name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange}
            autoComplete="email" className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
          {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-[13px] font-semibold text-white/50">Password</label>
          <div className="relative">
            <input id="password" name="password" type={showPassword ? "text" : "password"}
              placeholder="••••••••" value={form.password} onChange={handleChange}
              autoComplete="new-password" className={cn(inputClass, "pr-12")}
              style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            <button type="button" onClick={() => setShowPassword(v => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
          {form.password.length > 0 && (
            <ul className="space-y-1.5 pt-1">
              {RULES.map(({ label, test }) => {
                const passed = test(form.password);
                return (
                  <li key={label} className="flex items-center gap-2">
                    <Check className={cn("w-3.5 h-3.5 shrink-0", passed ? "text-sky-400" : "text-white/20")} />
                    <span className={cn("text-xs", passed ? "text-sky-400" : "text-white/35")}>{label}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Confirm password */}
        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="block text-[13px] font-semibold text-white/50">Confirm password</label>
          <div className="relative">
            <input id="confirmPassword" name="confirmPassword" type={showConfirm ? "text" : "password"}
              placeholder="••••••••" value={form.confirmPassword} onChange={handleChange}
              autoComplete="new-password" className={cn(inputClass, "pr-12")}
              style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            <button type="button" onClick={() => setShowConfirm(v => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
              aria-label={showConfirm ? "Hide password" : "Show password"}>
              {showConfirm ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="text-xs text-red-400">{errors.confirmPassword}</p>}
        </div>

        {/* Referral code */}
        <div className="space-y-1.5">
          <label htmlFor="refCode" className="block text-[13px] font-semibold text-white/50">
            Referral code <span className="text-white/25 font-normal">(optional)</span>
          </label>
          <input id="refCode" name="refCode" placeholder="Enter referral code" value={refCode}
            onChange={(e) => setRefCode(e.target.value)} autoComplete="off"
            className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className={cn(
            "w-full h-[52px] rounded-2xl text-[15px] font-bold text-white mt-1",
            "flex items-center justify-center gap-2 transition-all active:scale-[0.99]",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          style={{
            background: "linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)",
            boxShadow: "0 4px 32px rgba(14,165,233,0.40), inset 0 1px 0 rgba(255,255,255,0.15)",
          }}
        >
          {loading
            ? <Loader2 className="w-5 h-5 animate-spin" />
            : <><span>Create account</span><ArrowRight className="w-4 h-4" /></>
          }
        </button>
      </form>

      {/* Trust badge */}
      <div className="flex items-center justify-center gap-1.5 mt-4">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/70 shrink-0" />
        <span className="text-[12px] text-white/25 font-medium">256-bit SSL · Your data is always safe</span>
      </div>

      {/* Sign-in link */}
      <div className="mt-6 pt-5 border-t border-white/8 text-center">
        <p className="text-[14px] text-white/35">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-white/80 hover:text-sky-400 transition-colors">
            Sign in →
          </Link>
        </p>
      </div>
    </div>
  );
}

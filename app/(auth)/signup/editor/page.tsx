"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signupSchema } from "@/lib/validations";
import { toast } from "sonner";
import { allRulesPassed } from "@/components/ui/password-input";
import { Eye, EyeOff, Loader2, ShieldCheck, Check, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthTabToggle } from "../../auth-tab-toggle";
import { COUNTRIES } from "../../countries";
import { PhoneInput, type PhoneValue } from "../../phone-input";
import { CountrySelect } from "../../country-select";

const RULES = [
  { label: "At least 1 lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "At least 1 uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "At least 1 number",           test: (p: string) => /[0-9]/.test(p) },
  { label: "At least 1 special character",test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
  { label: "At least 8 characters",       test: (p: string) => p.length >= 8 },
];

export default function EditorSignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState<PhoneValue>({ countryCode: "US", dialCode: "+1", number: "" });
  const [agreed, setAgreed] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    if (!allRulesPassed(form.password)) {
      setErrors({ password: "Password does not meet all requirements." });
      return;
    }

    const result = signupSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (!phone.number.trim()) {
      setErrors({ phone: "Phone number is required." });
      return;
    }

    if (!agreed) {
      setErrors({ terms: "You must agree to the Terms and Privacy Policy." });
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...result.data, role: "editor", country, phone: `${phone.dialCode}${phone.number}` }),
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

  async function handleGoogle() {
    setGoogleLoading(true);
    await fetch("/api/auth/set-google-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "editor" }),
    });
    signIn("google", { callbackUrl: "/editor/dashboard" });
  }

  return (
    <div className="w-full">
      {/* Star Logo & Heading */}
      <div className="flex flex-col items-center mb-4 text-center">
        <div className="w-[52px] h-[52px] rounded-[16px] bg-[#111827] flex items-center justify-center shadow-[0_6px_16px_rgba(0,0,0,0.12)] mb-2.5 transition-transform hover:scale-105">
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L14.8 9.2L22 12L14.8 14.8L12 22L9.2 14.8L2 12L9.2 9.2L12 2Z" />
          </svg>
        </div>
        <h1 className="text-[1.75rem] font-black text-neutral-900 tracking-tight leading-none mb-1">
          Join as an Editor
        </h1>
        <p className="text-[12.5px] text-neutral-400 font-semibold mb-3.5">
          Offer your skills and keep 85% of every order.
        </p>
        <div className="w-full max-w-[260px] mx-auto">
          <AuthTabToggle />
        </div>
      </div>

      {/* Social Icons */}
      <div className="flex items-center justify-center gap-3.5 mb-4.5">
        {/* Apple */}
        <button
          type="button"
          className="w-[42px] h-[42px] rounded-full bg-[#000000] flex items-center justify-center text-white transition-transform active:scale-95 shadow-sm hover:bg-neutral-900"
        >
          <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.54 9.1 1.51 12.06 1.004 1.45 2.188 3.076 3.755 3.014 1.512-.06 2.083-.974 3.909-.974 1.817 0 2.34.974 3.923.94 1.609-.026 2.65-1.468 3.626-2.89 1.127-1.646 1.59-3.237 1.616-3.32-.034-.014-3.1-1.189-3.13-4.757-.025-2.984 2.449-4.417 2.56-4.484-1.4-2.05-3.56-2.285-4.32-2.333-1.983-.162-3.414 1.01-4.292 1.01zm2.34-4.57c.834-1.012 1.393-2.422 1.24-3.826-1.206.05-2.671.803-3.536 1.817-.768.89-1.44 2.324-1.26 3.707 1.347.108 2.72-.686 3.556-1.698z"/>
          </svg>
        </button>
        {/* Google */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-[42px] h-[42px] rounded-full bg-[#ffffff] border border-[#e5e7eb] flex items-center justify-center text-[#1f2937] transition-transform active:scale-95 shadow-sm hover:bg-[#f9fafb] disabled:opacity-50"
        >
          {googleLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          )}
        </button>
      </div>

      {/* Divider */}
      <div className="relative mb-4.5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-neutral-100" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 text-[10.5px] font-extrabold text-neutral-400 uppercase tracking-widest bg-[#ffffff]">
            or
          </span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Name stacked input */}
        <div className="relative rounded-[20px] border border-neutral-200 px-4 py-2.5 bg-[#ffffff] transition-all focus-within:ring-2 focus-within:ring-black/5 focus-within:border-black text-left">
          <label htmlFor="name" className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider select-none">
            Full name
          </label>
          <input
            id="name"
            name="name"
            placeholder="Rahul Kumar"
            value={form.name}
            onChange={handleChange}
            autoComplete="name"
            className="w-full bg-transparent text-[14px] text-neutral-900 placeholder-neutral-300 outline-none mt-0.5 h-6"
          />
        </div>
        {errors.name && <p className="text-xs text-red-500 mt-1 pl-1">{errors.name}</p>}

        {/* Email stacked input */}
        <div className="relative rounded-[20px] border border-neutral-200 px-4 py-2.5 bg-[#ffffff] transition-all focus-within:ring-2 focus-within:ring-black/5 focus-within:border-black text-left">
          <label htmlFor="email" className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider select-none">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            className="w-full bg-transparent text-[14px] text-neutral-900 placeholder-neutral-300 outline-none mt-0.5 h-6"
          />
        </div>
        {errors.email && <p className="text-xs text-red-500 mt-1 pl-1">{errors.email}</p>}

        {/* Password stacked input */}
        <div className="relative rounded-[20px] border border-neutral-200 px-4 py-2.5 bg-[#ffffff] transition-all focus-within:ring-2 focus-within:ring-black/5 focus-within:border-black text-left">
          <label htmlFor="password" className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider select-none">
            Password
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
        {form.password.length > 0 && (
          <ul className="space-y-1.5 pt-1.5 pl-1">
            {RULES.map(({ label, test }) => {
              const passed = test(form.password);
              return (
                <li key={label} className="flex items-center gap-2">
                  <span className={cn("text-xs font-bold transition-colors", passed ? "text-emerald-600" : "text-neutral-400")}>
                    {passed ? "✓" : "○"} {label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {/* Confirm password stacked input */}
        <div className="relative rounded-[20px] border border-neutral-200 px-4 py-2.5 bg-[#ffffff] transition-all focus-within:ring-2 focus-within:ring-black/5 focus-within:border-black text-left">
          <label htmlFor="confirmPassword" className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider select-none">
            Confirm password
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
        {errors.confirmPassword && <p className="text-xs text-red-500 mt-1 pl-1">{errors.confirmPassword}</p>}

        {/* Country of residence */}
        <CountrySelect
          value={country}
          label="Country of residence"
          onChange={code => {
            setCountry(code);
            const found = COUNTRIES.find(c => c.code === code);
            if (found) setPhone(p => ({ ...p, countryCode: found.code, dialCode: found.dial }));
          }}
          required
        />
        {errors.country && <p className="text-xs text-red-500 mt-1 pl-1">{errors.country}</p>}

        <PhoneInput
          value={phone}
          onChange={setPhone}
          label="Phone number"
          required
        />
        {errors.phone && <p className="text-xs text-red-500 mt-1 pl-1">{errors.phone}</p>}

        {/* Terms checkbox */}
        <label className="flex items-start gap-3 cursor-pointer select-none pt-1">
          <div className="relative mt-0.5 shrink-0">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => {
                setAgreed(e.target.checked);
                setErrors(prev => ({ ...prev, terms: "" }));
              }}
              className="sr-only"
            />
            <div className={cn(
              "w-[18px] h-[18px] rounded-[5px] border-2 flex items-center justify-center transition-all",
              agreed ? "bg-black border-black" : "bg-white border-neutral-300"
            )}>
              {agreed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
            </div>
          </div>
          <span className="text-[12.5px] text-neutral-500 leading-snug font-medium">
            I agree to the{" "}
            <Link href="/terms" className="text-neutral-900 font-semibold hover:underline" target="_blank">Terms of Service</Link>
            {" "}and{" "}
            <Link href="/privacy" className="text-neutral-900 font-semibold hover:underline" target="_blank">Privacy Policy</Link>
          </span>
        </label>
        {errors.terms && <p className="text-xs text-red-500 pl-1">{errors.terms}</p>}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-[52px] rounded-2xl bg-black text-white hover:bg-neutral-900 text-[14.5px] font-bold transition-all active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <span>Create account</span>
          )}
        </button>
      </form>

      {/* Trust badge */}
      <div className="flex items-center justify-center gap-1.5 mt-3.5">
        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
        <span className="text-[12px] text-neutral-400 font-semibold">256-bit SSL · Your data is always safe</span>
      </div>

      {/* Sign-in link */}
      <div className="mt-4 pt-3.5 border-t border-neutral-100 text-center">
        <p className="text-[13px] text-neutral-400 font-medium">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-neutral-900 hover:underline">
            Sign in →
          </Link>
        </p>
      </div>
    </div>
  );
}


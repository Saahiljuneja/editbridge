"use client";

import { Suspense, useState, useEffect } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/client/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("verified") === "1") {
      toast.success("Email verified! You can now sign in.");
    }
    const prefill = searchParams.get("email");
    if (prefill) setEmail(decodeURIComponent(prefill));
  }, [searchParams]);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const pre = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const preData = await pre.json();

      if (preData.status === "unverified") {
        await fetch("/api/auth/resend-verification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }).catch(() => {});
        toast.info("A new verification code has been sent to your email.");
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        setLoading(false);
        return;
      }

      if (preData.status === "google_only") {
        toast.error("This account uses Google Sign-In. Please use 'Continue with Google'.");
        setLoading(false);
        return;
      }
    } catch {
      // fall through
    }

    const result = await signIn("credentials", { email, password, redirect: false });

    if (result?.error) {
      toast.error("Invalid email or password.");
      setLoading(false);
      return;
    }

    const session = await getSession();
    const role = session?.user?.role;
    if (["admin", "staff_kyc", "staff_support", "staff_dispute", "staff_moderation"].includes(role ?? "")) {
      router.push("/admin/dashboard");
    } else if (role === "editor") {
      router.push("/editor/dashboard");
    } else {
      router.push(callbackUrl);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    await signIn("google", { callbackUrl });
  }

  const inputClass = "w-full h-[52px] rounded-2xl px-4 text-[15px] text-white placeholder-white/25 outline-none transition-all focus:ring-2 focus:ring-sky-400/40"

  return (
    <div className="w-full">

      {/* Heading */}
      <div className="mb-7">
        <h1 className="text-[1.9rem] font-black text-white tracking-tight leading-none mb-2">
          Welcome back
        </h1>
        <p className="text-[14px] text-white/40">
          Sign in to your <span className="text-white/65 font-medium">EditBridge</span> account
        </p>
      </div>

      {/* Google */}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-3 h-[52px] rounded-2xl text-[14px] font-semibold text-white/80 transition-all active:scale-[0.99] disabled:opacity-50 mb-4"
        style={{
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.12)",
          backdropFilter: "blur(8px)",
        }}
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
          <span className="px-3 text-[11px] font-semibold text-white/20 uppercase tracking-widest"
            style={{ background: "transparent" }}>
            or email
          </span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleCredentials} className="space-y-4">

        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-[13px] font-semibold text-white/50">
            Email address
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            className={inputClass}
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
            onFocus={e => { e.currentTarget.style.background = "rgba(255,255,255,0.10)"; e.currentTarget.style.borderColor = "rgba(14,165,233,0.5)"; }}
            onBlur={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; }}
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-[13px] font-semibold text-white/50">
              Password
            </label>
            <Link href="/forgot-password" className="text-[13px] font-semibold text-sky-400 hover:text-sky-300 transition-colors">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className={cn(inputClass, "pr-12")}
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
              onFocus={e => { e.currentTarget.style.background = "rgba(255,255,255,0.10)"; e.currentTarget.style.borderColor = "rgba(14,165,233,0.5)"; }}
              onBlur={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
            </button>
          </div>
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
            : <><span>Sign in</span><ArrowRight className="w-4 h-4" /></>
          }
        </button>
      </form>

      {/* Trust badge */}
      <div className="flex items-center justify-center gap-1.5 mt-4">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/70 shrink-0" />
        <span className="text-[12px] text-white/25 font-medium">256-bit SSL · Your data is always safe</span>
      </div>

      {/* Divider + sign up */}
      <div className="mt-6 pt-5 border-t border-white/8 text-center">
        <p className="text-[14px] text-white/35">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-bold text-white/80 hover:text-sky-400 transition-colors">
            Create one free →
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

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

"use client";

import { Suspense, useState, useEffect } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
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
      // fall through to signIn on pre-check failure
    }

    const result = await signIn("credentials", { email, password, redirect: false });

    if (result?.error) {
      toast.error("Invalid email or password.");
      setLoading(false);
      return;
    }

    const session = await getSession();
    const role = session?.user?.role;
    if (role === "admin" || role === "staff_kyc" || role === "staff_support" || role === "staff_dispute" || role === "staff_moderation") {
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

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-1.5">Welcome back</h1>
        <p className="text-sm text-gray-400 font-medium">Sign in to your EditBridge account</p>
      </div>

      {/* Google button */}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-3 h-12 rounded-2xl border-2 border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200 text-sm font-semibold text-gray-700 transition-all shadow-sm hover:shadow-md disabled:opacity-60 mb-5"
      >
        {googleLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        ) : (
          <GoogleIcon />
        )}
        {googleLoading ? "Redirecting…" : "Continue with Google"}
      </button>

      {/* Divider */}
      <div className="relative mb-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-100" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-[11px] font-semibold text-gray-300 uppercase tracking-widest">or</span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleCredentials} className="space-y-4">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
            Email address
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full h-12 rounded-2xl border-2 border-gray-100 bg-gray-50 px-4 text-sm text-gray-900 placeholder-gray-300 outline-none transition-all focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-400/10"
          />
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
              Password
            </label>
            <Link href="/forgot-password" className="text-xs font-semibold text-sky-500 hover:text-sky-600 transition-colors">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full h-12 rounded-2xl border-2 border-gray-100 bg-gray-50 px-4 pr-12 text-sm text-gray-900 placeholder-gray-300 outline-none transition-all focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-400/10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className={cn(
            "w-full h-12 rounded-2xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2 mt-2",
            "bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40",
            "disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none"
          )}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>Sign in <ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </form>

      {/* Sign up link */}
      <p className="mt-6 text-center text-sm text-gray-400">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-bold text-gray-900 hover:text-sky-500 transition-colors">
          Create one free
        </Link>
      </p>
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
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

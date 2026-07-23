"use client";

import { useState } from "react";
import { signIn } from "next-auth/react"; // kept for Google OAuth
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signupSchema } from "@/lib/validations";
import { toast } from "sonner";
import { PasswordInput, allRulesPassed } from "@/components/ui/password-input";

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

export default function EditorSignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [kycAcknowledged, setKycAcknowledged] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

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

    if (!kycAcknowledged) {
      setErrors({ kyc: "You must acknowledge the KYC requirement to continue" });
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

    setLoading(true);

    // Create account
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...result.data, role: "editor" }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Signup failed. Please try again.");
      setLoading(false);
      return;
    }

    // Store credentials so verify page can auto sign-in after OTP
    sessionStorage.setItem("eb_pending_signin", JSON.stringify({ email: form.email, password: form.password }));

    router.push(`/verify-email?email=${encodeURIComponent(form.email)}`);
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Become an editor</h1>
      <p className="text-sm text-gray-500 mb-6">Start earning by offering your editing services</p>

      <Button
        type="button"
        variant="outline"
        className="w-full mb-4 gap-2"
        onClick={async () => {
          if (!kycAcknowledged) {
            setErrors({ kyc: "Please acknowledge the KYC requirement first." });
            return;
          }
          setGoogleLoading(true);
          await fetch("/api/auth/set-google-role", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "editor" }),
          });
          signIn("google", { callbackUrl: "/editor/dashboard" });
        }}
        disabled={googleLoading}
      >
        <GoogleIcon />
        {googleLoading ? "Redirecting…" : "Continue with Google"}
      </Button>

      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs text-gray-400">
          <span className="bg-white px-2">or sign up with email</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" placeholder="Rahul Kumar" value={form.name} onChange={handleChange} autoComplete="name" />
          {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange} autoComplete="email" />
          {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <PasswordInput id="password" name="password" value={form.password} onChange={handleChange} autoComplete="new-password" showRules error={errors.password} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <PasswordInput id="confirmPassword" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} autoComplete="new-password" error={errors.confirmPassword} />
        </div>

        <label className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 accent-[#0EA5E9]"
            checked={kycAcknowledged}
            onChange={(e) => { setKycAcknowledged(e.target.checked); setErrors((p) => ({ ...p, kyc: "" })); }}
          />
          <span className="text-sm text-amber-900">
            I understand that identity verification (KYC) is required before I can accept orders.
          </span>
        </label>
        {errors.kyc && <p className="text-xs text-red-500">{errors.kyc}</p>}

        <Button type="submit" className="w-full bg-[#0EA5E9] hover:bg-[#3b31a0]" disabled={loading}>
          {loading ? "Creating account…" : "Create editor account"}
        </Button>

        <p className="text-xs text-center text-gray-400 leading-relaxed">
          By creating an account you agree to our{" "}
          <Link href="/terms" className="underline hover:text-gray-600">Terms of Service</Link>
          {" "}and{" "}
          <Link href="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="text-[#0EA5E9] font-medium hover:underline">Sign in</Link>
      </p>
    </>
  );
}

"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Loader2, Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { OtpInput, type OtpInputHandle } from "@/components/auth/otp-input";

const OTP_LENGTH = 6;

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email") ?? "";

  const [submitting, setSubmitting] = useState(false);
  const [verified, setVerified] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRef = useRef<OtpInputHandle>(null);

  // Start a 60s resend cooldown on mount
  useEffect(() => {
    setResendCooldown(60);
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  async function handleComplete(otp: string) {
    setHasError(false);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Invalid code. Please try again.");
        setHasError(true);
        otpRef.current?.shake();
        setTimeout(() => {
          setHasError(false);
          otpRef.current?.reset();
        }, 500);
        return;
      }

      setVerified(true);

      // Try to auto sign-in using stored credentials from sessionStorage
      const stored = sessionStorage.getItem("eb_pending_signin");
      if (stored) {
        try {
          const { email: storedEmail, password } = JSON.parse(stored);
          sessionStorage.removeItem("eb_pending_signin");
          const result = await signIn("credentials", {
            email: storedEmail,
            password,
            redirect: false,
          });
          if (!result?.error) {
            const session = await getSession();
            const role = session?.user?.role;
            const dest = role === "editor" ? "/editor/dashboard"
              : (role === "admin" || role?.startsWith("staff_")) ? "/admin/dashboard"
              : "/client/dashboard";
            setTimeout(() => router.push(dest), 1800);
            return;
          }
        } catch { /* fall through to login */ }
      }

      // If auto sign-in isn't possible, send to login
      setTimeout(() => router.push(`/login?verified=1&email=${encodeURIComponent(email)}`), 1800);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      toast.success("New code sent! Check your inbox.");
      setResendCooldown(60);
      otpRef.current?.reset();
    } catch {
      toast.error("Failed to resend. Please try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <AnimatePresence mode="wait">
      {verified ? (
        <motion.div
          key="success"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
            className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-5"
          >
            <CheckCircle className="w-8 h-8 text-green-600" />
          </motion.div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Email verified!</h1>
          <p className="text-sm text-gray-500">Your account is active. Signing you in…</p>
        </motion.div>
      ) : (
        <motion.div
          key="form"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className="w-14 h-14 rounded-2xl bg-[var(--brand-client)]/10 flex items-center justify-center mx-auto mb-5"
          >
            <Mail className="w-7 h-7 text-[var(--brand-client)]" />
          </motion.div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Check your email</h1>
          <p className="text-sm text-gray-500 mb-1">
            We sent a 6-digit code to
          </p>
          <p className="text-sm font-semibold text-gray-800 mb-7">{email || "your email"}</p>

          <div className="mb-2">
            <OtpInput ref={otpRef} length={OTP_LENGTH} onComplete={handleComplete} disabled={submitting} error={hasError} />
          </div>

          <AnimatePresence>
            {submitting && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center gap-1.5 text-sm text-[var(--brand-client)] mt-4"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Verifying…
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-6 flex items-center justify-center gap-1.5 text-sm">
            <span className="text-gray-400">Didn&apos;t receive it?</span>
            <button
              onClick={handleResend}
              disabled={resendCooldown > 0 || resending}
              className="flex items-center gap-1 text-[var(--brand-client)] font-medium hover:underline disabled:opacity-40 disabled:no-underline"
            >
              {resending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
            </button>
          </div>

          <p className="mt-4 text-xs text-gray-400">Code expires in 10 minutes</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}

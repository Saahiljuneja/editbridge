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
    <div className="w-full">
      <style>{`
        /* Local overrides to force OtpInput to look premium black/gray instead of client blue */
        div[data-slot="otp-container"] input,
        input[inputmode="numeric"] {
          border-color: #d1d5db !important;
          background-color: #ffffff !important;
          color: #111827 !important;
        }
        div[data-slot="otp-container"] input:focus,
        input[inputmode="numeric"]:focus {
          border-color: #000000 !important;
          box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.05) !important;
        }
      `}</style>

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
              className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-5"
            >
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </motion.div>
            <h1 className="text-2xl font-black text-neutral-900 mb-2">Email verified!</h1>
            <p className="text-sm text-neutral-500 font-medium">Your account is active. Signing you in…</p>
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
            {/* Star Logo & Heading */}
            <div className="flex flex-col items-center mb-6 text-center">
              <div className="w-[52px] h-[52px] rounded-[16px] bg-[#111827] flex items-center justify-center shadow-[0_6px_16px_rgba(0,0,0,0.12)] mb-3 transition-transform hover:scale-105">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L14.8 9.2L22 12L14.8 14.8L12 22L9.2 14.8L2 12L9.2 9.2L12 2Z" />
                </svg>
              </div>
              <h1 className="text-[1.75rem] font-black text-neutral-900 tracking-tight leading-none mb-1">
                Check your email
              </h1>
              <p className="text-[12.5px] text-neutral-400 font-semibold leading-relaxed mb-4 max-w-[320px] mx-auto">
                We sent a 6-digit verification code to <br />
                <strong className="text-neutral-800 break-all">{email || "your email"}</strong>
              </p>
            </div>

            <div className="mb-2" data-slot="otp-container">
              <OtpInput ref={otpRef} length={OTP_LENGTH} onComplete={handleComplete} disabled={submitting} error={hasError} />
            </div>

            <AnimatePresence>
              {submitting && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center gap-1.5 text-sm text-neutral-900 font-semibold mt-4"
                >
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-500" />
                  Verifying…
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-6 flex items-center justify-center gap-1.5 text-sm">
              <span className="text-neutral-400 font-semibold">Didn&apos;t receive it?</span>
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0 || resending}
                className="flex items-center gap-1 text-neutral-950 font-bold hover:underline disabled:opacity-40 disabled:no-underline"
              >
                {resending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
              </button>
            </div>

            <p className="mt-4 text-xs text-neutral-400 font-semibold">Code expires in 10 minutes</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}


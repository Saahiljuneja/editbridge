"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck, KeyRound } from "lucide-react";

export default function TwoFactorPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [code, setCode] = useState("");
  const [useBackup, setUseBackup] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    else if (status === "authenticated" && !session?.user?.twoFactorPending) {
      const role = session?.user?.role;
      if (role === "admin" || role?.startsWith("staff_")) router.replace("/admin/dashboard");
      else if (role === "editor") router.replace("/editor/dashboard");
      else router.replace("/client/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [useBackup]);

  async function submit(value: string) {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/2fa/authenticate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(useBackup ? { backupCode: value } : { token: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Invalid code");
        setCode("");
        setSubmitting(false);
        return;
      }

      if (data.remainingBackupCodes !== undefined && data.remainingBackupCodes <= 2) {
        toast.warning(`Only ${data.remainingBackupCodes} backup code${data.remainingBackupCodes !== 1 ? "s" : ""} left — generate new ones from Settings soon.`);
      }

      // Re-run the jwt callback (trigger:"update") — it clears twoFactorPending
      // based on the server-side marker /authenticate just wrote, not on anything we send here.
      await update({});

      const role = session?.user?.role;
      toast.success("Verified!");
      if (role === "admin" || role?.startsWith("staff_")) router.replace("/admin/dashboard");
      else if (role === "editor") router.replace("/editor/dashboard");
      else router.replace("/client/dashboard");
    } catch {
      toast.error("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  function handleCodeChange(v: string) {
    const cleaned = v.replace(/[^0-9]/g, "").slice(0, 6);
    setCode(cleaned);
    if (cleaned.length === 6) submit(cleaned);
  }

  function handleBackupChange(v: string) {
    setCode(v.toUpperCase().slice(0, 9));
  }

  function handleBackupSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim().length > 0) submit(code.trim());
  }

  return (
    <>
      <div className="w-12 h-12 rounded-2xl bg-[var(--brand-client)]/10 flex items-center justify-center mb-4">
        <ShieldCheck className="w-6 h-6 text-[var(--brand-client)]" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Two-factor verification</h1>
      <p className="text-sm text-gray-500 mb-6">
        {useBackup
          ? "Enter one of your unused backup codes."
          : "Enter the 6-digit code from your authenticator app."}
      </p>

      {!useBackup ? (
        <div className="space-y-4">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            disabled={submitting}
            placeholder="000000"
            maxLength={6}
            className="w-full text-center text-2xl font-mono tracking-[0.5em] px-4 py-3.5 rounded-xl border border-gray-200 outline-none focus:border-[var(--brand-client)] focus:ring-2 focus:ring-[var(--brand-client)]/20 disabled:opacity-50"
          />
        </div>
      ) : (
        <form onSubmit={handleBackupSubmit} className="space-y-4">
          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            value={code}
            onChange={(e) => handleBackupChange(e.target.value)}
            disabled={submitting}
            placeholder="XXXX-XXXX"
            className="w-full text-center text-lg font-mono tracking-widest px-4 py-3.5 rounded-xl border border-gray-200 outline-none focus:border-[var(--brand-client)] focus:ring-2 focus:ring-[var(--brand-client)]/20 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={submitting || code.trim().length === 0}
            className="w-full py-3 rounded-xl bg-[var(--brand-client)] text-white text-sm font-semibold hover:bg-[var(--brand-editor-hover)] transition-colors disabled:opacity-50"
          >
            {submitting ? "Verifying…" : "Verify"}
          </button>
        </form>
      )}

      <button
        onClick={() => { setUseBackup((v) => !v); setCode(""); }}
        className="mt-4 flex items-center gap-1.5 text-sm text-[var(--brand-client)] hover:underline mx-auto"
      >
        <KeyRound className="w-3.5 h-3.5" />
        {useBackup ? "Use authenticator code instead" : "Use backup code"}
      </button>

      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="mt-6 text-xs text-gray-400 hover:text-gray-600 mx-auto block"
      >
        Sign out and use a different account
      </button>
    </>
  );
}

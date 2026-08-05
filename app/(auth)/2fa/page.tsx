"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck, KeyRound, Loader2 } from "lucide-react";

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
    <div className="w-full text-center">
      {/* Star Logo & Heading */}
      <div className="flex flex-col items-center mb-6 text-center">
        <div className="w-[52px] h-[52px] rounded-[16px] bg-[#111827] flex items-center justify-center shadow-[0_6px_16px_rgba(0,0,0,0.12)] mb-3 transition-transform hover:scale-105">
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L14.8 9.2L22 12L14.8 14.8L12 22L9.2 14.8L2 12L9.2 9.2L12 2Z" />
          </svg>
        </div>
        <h1 className="text-[1.75rem] font-black text-neutral-900 tracking-tight leading-none mb-1">
          Two-factor verification
        </h1>
        <p className="text-[12.5px] text-neutral-400 font-semibold max-w-[320px] mx-auto">
          {useBackup
            ? "Enter one of your unused backup codes."
            : "Enter the 6-digit code from your authenticator app."}
        </p>
      </div>

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
            className="w-full text-center text-2xl font-mono tracking-[0.5em] px-4 py-3.5 rounded-2xl border-2 border-neutral-200 bg-[#ffffff] text-neutral-900 outline-none focus:border-black focus:ring-2 focus:ring-black/5 disabled:opacity-50 font-bold"
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
            className="w-full text-center text-lg font-mono tracking-widest px-4 py-3.5 rounded-2xl border-2 border-neutral-200 bg-[#ffffff] text-neutral-900 outline-none focus:border-black focus:ring-2 focus:ring-black/5 disabled:opacity-50 font-bold"
          />
          <button
            type="submit"
            disabled={submitting || code.trim().length === 0}
            className="w-full h-[52px] rounded-2xl bg-black text-white hover:bg-neutral-900 text-[14.5px] font-bold transition-all active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            }}
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Verify</span>}
          </button>
        </form>
      )}

      <button
        onClick={() => { setUseBackup((v) => !v); setCode(""); }}
        className="mt-6 flex items-center justify-center gap-1.5 text-sm text-neutral-950 font-bold hover:underline mx-auto"
      >
        <KeyRound className="w-3.5 h-3.5" />
        {useBackup ? "Use authenticator code" : "Use backup code"}
      </button>

      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="mt-6 text-xs text-neutral-400 font-bold hover:text-neutral-900 mx-auto block"
      >
        Sign out and use a different account
      </button>
    </div>
  );
}


"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, Bell, Shield, User, CreditCard,
  ChevronRight, MailWarning, MapPin, Video,
  Loader2, Check, ShieldCheck, Copy, KeyRound, X,
  MessageSquareText, Plus, Trash2, GripVertical, Pencil,
} from "lucide-react";
import Image from "next/image";

type Tab = "profile" | "security" | "templates" | "payments" | "notifications";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile",       label: "Profile",       icon: User },
  { id: "security",      label: "Security",      icon: Shield },
  { id: "templates",     label: "Templates",     icon: MessageSquareText },
  { id: "payments",      label: "Payments",      icon: CreditCard },
  { id: "notifications", label: "Notifications", icon: Bell },
];

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden", className)}>
      {children}
    </div>
  );
}

function SectionHeader({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="px-6 py-4 border-b border-gray-100">
      <p className="font-semibold text-gray-900 text-sm">{title}</p>
      {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
    </div>
  );
}

function ToggleRow({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

function SaveButton({ loading, label = "Save changes" }: { loading: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--brand-client)] hover:bg-[var(--brand-editor-hover)] disabled:opacity-50 transition-colors"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
      {loading ? "Saving…" : label}
    </button>
  );
}

// ─── Profile tab ───────────────────────────────────────────────────────────────
function ProfileTab({ session, update }: { session: ReturnType<typeof useSession>["data"]; update: ReturnType<typeof useSession>["update"] }) {
  const [name, setName]                       = useState(session?.user?.name ?? "");
  const [displayName, setDisplayName]         = useState("");
  const [title, setTitle]                     = useState("");
  const [bio, setBio]                         = useState("");
  const [location, setLocation]               = useState("");
  const [featuredVideoUrl, setFeaturedVideoUrl] = useState("");
  const [loading, setLoading]                 = useState(true);
  const [saving, setSaving]                   = useState(false);

  useEffect(() => {
    if (session?.user?.name) setName(session.user.name);
  }, [session?.user?.name]);

  useEffect(() => {
    fetch("/api/editor/profile")
      .then(r => r.json())
      .then(data => {
        setDisplayName(data.displayName ?? "");
        setTitle(data.title ?? "");
        setBio(data.bio ?? "");
        setLocation(data.location ?? "");
        setFeaturedVideoUrl(data.featuredVideoUrl ?? "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/users/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim() }),
        }),
        fetch("/api/editor/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: displayName.trim() || null,
            title: title.trim() || null,
            bio: bio.trim() || null,
            location: location.trim() || null,
            featuredVideoUrl: featuredVideoUrl.trim() || null,
          }),
        }),
      ]);
      if (!r1.ok) { toast.error((await r1.json().catch(() => ({}))).error ?? "Failed to save."); return; }
      if (!r2.ok) { toast.error((await r2.json().catch(() => ({}))).error ?? "Failed to save."); return; }
      await update({ name: name.trim() });
      toast.success("Profile updated.");
    } catch { toast.error("Something went wrong."); }
    finally { setSaving(false); }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
    </div>
  );

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <Card>
        <SectionHeader title="Basic information" desc="Your public name and contact details" />
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Full name</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your full name"
              className="rounded-xl border-gray-200 focus-visible:ring-[var(--brand-client)]/30"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Email</Label>
            <Input
              value={session?.user?.email ?? ""}
              disabled
              className="rounded-xl border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400">Email cannot be changed.</p>
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeader title="About me" desc="Tell clients about your background and editing style" />
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Headline</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Professional Wedding & Cinematic Editor"
              maxLength={120}
              className="rounded-xl border-gray-200 focus-visible:ring-[var(--brand-client)]/30"
            />
            <p className="text-xs text-gray-400">{title.length}/120 · Shown on your profile card</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Bio</Label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Describe your editing style, experience, and what makes your work unique…"
              maxLength={2000}
              rows={5}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/30 resize-none"
            />
            <p className="text-xs text-gray-400">{bio.length}/2000</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-gray-400" />
              Featured video URL
            </Label>
            <Input
              value={featuredVideoUrl}
              onChange={e => setFeaturedVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=…"
              type="url"
              className="rounded-xl border-gray-200 focus-visible:ring-[var(--brand-client)]/30"
            />
            <p className="text-xs text-gray-400">Shown at the top of your public profile</p>
          </div>
        </div>
      </Card>

      <SaveButton loading={saving} />
    </form>
  );
}

// ─── Security tab ──────────────────────────────────────────────────────────────
// ─── Two-factor authentication ─────────────────────────────────────────────────
function TwoFactorSection() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [step, setStep] = useState<"idle" | "qr" | "backup-codes">("idle");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [tempSecret, setTempSecret] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [showRegenerate, setShowRegenerate] = useState(false);
  const [regeneratePassword, setRegeneratePassword] = useState("");
  const [regeneratedCodes, setRegeneratedCodes] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setEnabled(!!d.twoFactorEnabled); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function startSetup() {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setQrCodeDataUrl(data.qrCodeDataUrl);
      setTempSecret(data.secret);
      setStep("qr");
    } catch {
      toast.error("Failed to start 2FA setup.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmSetup() {
    if (verifyCode.trim().length !== 6) { toast.error("Enter the 6-digit code from your app."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: verifyCode.trim(), tempSecret }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error ?? "Incorrect code."); return; }
      setBackupCodes(data.backupCodes ?? []);
      setStep("backup-codes");
      setEnabled(true);
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function finishSetup() {
    setStep("idle");
    setVerifyCode("");
    setTempSecret("");
    setQrCodeDataUrl("");
    setBackupCodes([]);
    toast.success("Two-factor authentication enabled.");
  }

  async function copyBackupCodes() {
    try {
      await navigator.clipboard.writeText(backupCodes.join("\n"));
      toast.success("Backup codes copied.");
    } catch {
      toast.error("Copy failed — save them manually.");
    }
  }

  async function handleDisable() {
    if (!disablePassword) { toast.error("Enter your password to confirm."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error ?? "Failed to disable 2FA."); return; }
      setEnabled(false);
      setShowDisable(false);
      setDisablePassword("");
      toast.success("Two-factor authentication disabled.");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRegenerate() {
    if (!regeneratePassword) { toast.error("Enter your password to confirm."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/2fa/backup-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: regeneratePassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error ?? "Failed to regenerate codes."); return; }
      setRegeneratedCodes(data.backupCodes ?? []);
      setRegeneratePassword("");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <SectionHeader title="Two-factor authentication" desc="Add an extra layer of security to your account" />
        <div className="p-6"><div className="h-10 bg-gray-100 rounded-xl animate-pulse" /></div>
      </Card>
    );
  }

  return (
    <Card>
      <SectionHeader title="Two-factor authentication" desc="Protect your account with an authenticator app (Google Authenticator, Authy)" />
      <div className="p-6">
        {step === "backup-codes" ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">
                Save these backup codes somewhere safe. Each can be used once to sign in if you lose access
                to your authenticator app. <strong>They won&apos;t be shown again.</strong>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-gray-200 bg-gray-50 p-4 font-mono text-sm">
              {backupCodes.map((c) => <div key={c} className="text-gray-700">{c}</div>)}
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyBackupCodes}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" /> Copy codes
              </button>
              <button
                onClick={finishSetup}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--brand-client)] text-white text-sm font-semibold hover:bg-[var(--brand-client-hover)] transition-colors"
              >
                <Check className="w-3.5 h-3.5" /> I've saved these codes
              </button>
            </div>
          </div>
        ) : step === "qr" ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Scan this QR code with your authenticator app:</p>
            {qrCodeDataUrl && (
              <div className="flex justify-center p-4 bg-white border border-gray-200 rounded-xl">
                <Image src={qrCodeDataUrl} alt="2FA QR code" width={180} height={180} unoptimized />
              </div>
            )}
            <p className="text-xs text-gray-400 text-center">
              Can&apos;t scan? Enter this code manually: <span className="font-mono font-semibold text-gray-600">{tempSecret}</span>
            </p>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Enter the 6-digit code to confirm</Label>
              <Input
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="rounded-xl border-gray-200 text-center font-mono tracking-widest focus-visible:ring-[var(--brand-client)]/30"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={confirmSetup}
                disabled={busy || verifyCode.length !== 6}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--brand-client)] text-white text-sm font-semibold hover:bg-[var(--brand-client-hover)] disabled:opacity-50 transition-colors"
              >
                {busy ? "Verifying…" : "Confirm & enable"}
              </button>
              <button
                onClick={() => { setStep("idle"); setVerifyCode(""); }}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : enabled ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
              <ShieldCheck className="w-4 h-4" /> Two-factor authentication is enabled
            </div>
            {!showDisable && !showRegenerate && regeneratedCodes.length === 0 ? (
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setShowRegenerate(true)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Regenerate backup codes
                </button>
                <button
                  onClick={() => setShowDisable(true)}
                  className="px-4 py-2 rounded-xl border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  Disable 2FA
                </button>
              </div>
            ) : (
              <div className="space-y-2 rounded-xl border border-red-200 bg-red-50/40 p-4">
                <Label className="text-xs font-medium text-red-700">Confirm your password to disable 2FA</Label>
                <Input
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  className="rounded-xl border-red-200 bg-white"
                />
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleDisable}
                    disabled={busy}
                    className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {busy ? "Disabling…" : "Disable 2FA"}
                  </button>
                  <button
                    onClick={() => { setShowDisable(false); setDisablePassword(""); }}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                </div>
              </div>
            )}

            {showRegenerate && regeneratedCodes.length === 0 && (
              <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                <Label className="text-xs font-medium text-amber-800">Confirm your password to regenerate backup codes</Label>
                <p className="text-[11px] text-amber-700">Old backup codes will be invalidated immediately.</p>
                <Input
                  type="password"
                  value={regeneratePassword}
                  onChange={(e) => setRegeneratePassword(e.target.value)}
                  className="rounded-xl border-amber-200 bg-white"
                />
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleRegenerate}
                    disabled={busy}
                    className="px-4 py-2 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-50 transition-colors"
                  >
                    {busy ? "Generating…" : "Regenerate"}
                  </button>
                  <button
                    onClick={() => { setShowRegenerate(false); setRegeneratePassword(""); }}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                </div>
              </div>
            )}

            {regeneratedCodes.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    New backup codes generated. Save them now — <strong>they won&apos;t be shown again</strong>.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 rounded-xl border border-gray-200 bg-gray-50 p-4 font-mono text-sm">
                  {regeneratedCodes.map((c) => <div key={c} className="text-gray-700">{c}</div>)}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(regeneratedCodes.join("\n")).catch(() => {});
                      toast.success("Codes copied.");
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy codes
                  </button>
                  <button
                    onClick={() => { setRegeneratedCodes([]); setShowRegenerate(false); }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--brand-client)] text-white text-sm font-semibold hover:bg-[var(--brand-client-hover)] transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" /> I&apos;ve saved these
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <KeyRound className="w-4 h-4 text-gray-400" /> Not enabled
            </div>
            <button
              onClick={startSetup}
              disabled={busy}
              className="px-4 py-2 rounded-xl bg-[var(--brand-client)] text-white text-sm font-semibold hover:bg-[var(--brand-client-hover)] disabled:opacity-50 transition-colors"
            >
              {busy ? "Starting…" : "Enable 2FA"}
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword]   = useState(false);
  const [deleteConfirm, setDeleteConfirm]     = useState("");
  const [deleting, setDeleting]               = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast.error("New passwords do not match."); return; }
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/users/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) { toast.error((await res.json().catch(() => ({}))).error ?? "Failed to change password."); return; }
      toast.success("Password changed.");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch { toast.error("Something went wrong."); }
    finally { setSavingPassword(false); }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== "DELETE") { toast.error("Type DELETE to confirm."); return; }
    setDeleting(true);
    try {
      const res = await fetch("/api/users/me", { method: "DELETE" });
      if (!res.ok) { toast.error("Failed to delete account. Contact support."); return; }
      toast.success("Account deleted.");
      await signOut({ callbackUrl: "/" });
    } catch { toast.error("Something went wrong."); }
    finally { setDeleting(false); }
  }

  const strength = newPassword.length === 0 ? 0 : newPassword.length < 8 ? 1 : newPassword.length < 10 ? 2 : newPassword.length < 12 ? 3 : 4;
  const strengthLabel = ["", "Too short", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["", "bg-red-400", "bg-amber-400", "bg-blue-400", "bg-emerald-400"][strength];

  return (
    <div className="space-y-5">
      <Card>
        <SectionHeader title="Change password" desc="Use a strong password you don't use elsewhere" />
        <form onSubmit={handleChangePassword} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Current password</Label>
            <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} autoComplete="current-password" className="rounded-xl border-gray-200 focus-visible:ring-[var(--brand-client)]/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">New password</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="new-password" className="rounded-xl border-gray-200 focus-visible:ring-[var(--brand-client)]/30" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Confirm</Label>
              <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" className="rounded-xl border-gray-200 focus-visible:ring-[var(--brand-client)]/30" />
            </div>
          </div>
          {newPassword.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex gap-1 flex-1">
                {[1, 2, 3, 4].map(lvl => (
                  <div key={lvl} className={cn("h-1 flex-1 rounded-full transition-colors", strength >= lvl ? strengthColor : "bg-gray-200")} />
                ))}
              </div>
              <span className="text-xs text-gray-400">{strengthLabel}</span>
            </div>
          )}
          <button
            type="submit"
            disabled={savingPassword || !currentPassword || !newPassword}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {savingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            {savingPassword ? "Updating…" : "Update password"}
          </button>
        </form>
      </Card>

      <TwoFactorSection />

      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="w-full rounded-2xl border border-gray-200 bg-white shadow-sm px-6 py-4 text-sm font-medium text-gray-600 hover:bg-gray-50 text-left flex items-center justify-between transition-colors"
      >
        <span>Sign out of EditBridge</span>
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </button>

      <div className="rounded-2xl border border-red-200 bg-red-50/40 overflow-hidden">
        <div className="px-6 py-4 border-b border-red-100">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <p className="font-semibold text-red-900 text-sm">Danger zone</p>
          </div>
          <p className="text-xs text-red-500 mt-0.5">Irreversible actions — proceed with care</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm font-semibold text-red-800 mb-1">Delete account</p>
            <p className="text-xs text-red-600 leading-relaxed">
              Permanently deletes your profile, packages, and all associated data. Active orders must be completed or cancelled first.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-red-700">
              Type <span className="font-mono font-bold">DELETE</span> to confirm
            </Label>
            <Input
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              className="rounded-xl border-red-200 bg-white focus-visible:ring-red-300"
            />
          </div>
          <button
            onClick={handleDeleteAccount}
            disabled={deleting || deleteConfirm !== "DELETE"}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {deleting ? "Deleting…" : "Delete my account"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Payments tab ──────────────────────────────────────────────────────────────
function PaymentsTab() {
  const [accountName, setAccountName]         = useState("");
  const [accountNumber, setAccountNumber]     = useState("");
  const [ifsc, setIfsc]                       = useState("");
  const [hasBankAccount, setHasBankAccount]   = useState(false);
  const [panNumber, setPanNumber]             = useState("");
  const [loading, setLoading]                 = useState(true);
  const [saving, setSaving]                   = useState(false);
  const [removing, setRemoving]               = useState(false);
  const [savingPan, setSavingPan]              = useState(false);

  useEffect(() => {
    fetch("/api/editor/profile")
      .then(r => r.json())
      .then(data => {
        if (data.bankAccountName) {
          setAccountName(data.bankAccountName);
          setAccountNumber(data.bankAccountNumber ?? "");
          setIfsc(data.bankIfsc ?? "");
          setHasBankAccount(true);
        }
        setPanNumber(data.panNumber ?? "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSavePan(e: React.FormEvent) {
    e.preventDefault();
    setSavingPan(true);
    try {
      const res = await fetch("/api/editor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ panNumber: panNumber.trim() ? panNumber.trim().toUpperCase() : null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = typeof err.error === "object"
          ? Object.values(err.error as Record<string, string[]>).flat().join(". ")
          : err.error ?? "Failed to save.";
        toast.error(msg); return;
      }
      toast.success("PAN number saved.");
    } catch { toast.error("Something went wrong."); }
    finally { setSavingPan(false); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/editor/bank-account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountName: accountName.trim(), accountNumber: accountNumber.trim(), ifsc: ifsc.trim().toUpperCase() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = typeof err.error === "object"
          ? Object.values(err.error as Record<string, string[]>).flat().join(". ")
          : err.error ?? "Failed to save.";
        toast.error(msg); return;
      }
      setHasBankAccount(true);
      toast.success("Bank account saved.");
    } catch { toast.error("Something went wrong."); }
    finally { setSaving(false); }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      const res = await fetch("/api/editor/bank-account", { method: "DELETE" });
      if (!res.ok) { toast.error("Failed to remove bank account."); return; }
      setAccountName(""); setAccountNumber(""); setIfsc("");
      setHasBankAccount(false);
      toast.success("Bank account removed.");
    } catch { toast.error("Something went wrong."); }
    finally { setRemoving(false); }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
    </div>
  );

  const maskedNumber = accountNumber.length > 4
    ? "•".repeat(accountNumber.length - 4) + accountNumber.slice(-4)
    : accountNumber;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-800">
        <p className="font-semibold mb-0.5">How payouts work</p>
        <p className="text-xs text-blue-600 leading-relaxed">
          Earnings are released 7 days after an order is marked complete. Funds are transferred to your registered bank account via NEFT/IMPS. A 15% platform fee is deducted from each order.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
        <p className="text-sm font-semibold text-amber-900 mb-0.5">⚠️ First payout hold — Razorpay new merchant policy</p>
        <p className="text-xs text-amber-700 leading-relaxed">
          Your <strong>first 1–3 payouts</strong> may be held for <strong>7–14 business days</strong> by Razorpay while they verify your merchant account. This is a one-time compliance process required by RBI guidelines and is completely normal. After your account is verified, all future payouts are released on the standard 7-day schedule. If your payout is delayed beyond 14 days, contact support@editbridge.in.
        </p>
      </div>

      <Card>
        <SectionHeader title="Bank account" desc="Where EditBridge sends your payouts" />

        {hasBankAccount && (
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{accountName}</p>
                <p className="text-xs text-gray-400 mt-0.5">Account {maskedNumber} · {ifsc}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing}
              className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
            >
              {removing ? "Removing…" : "Remove"}
            </button>
          </div>
        )}

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Account holder name</Label>
            <Input
              value={accountName}
              onChange={e => setAccountName(e.target.value)}
              placeholder="Name as per bank records"
              className="rounded-xl border-gray-200 focus-visible:ring-[var(--brand-client)]/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Account number</Label>
              <Input
                value={accountNumber}
                onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                placeholder="1234567890"
                inputMode="numeric"
                className="rounded-xl border-gray-200 focus-visible:ring-[var(--brand-client)]/30"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">IFSC code</Label>
              <Input
                value={ifsc}
                onChange={e => setIfsc(e.target.value.toUpperCase())}
                placeholder="SBIN0001234"
                maxLength={11}
                className="rounded-xl border-gray-200 focus-visible:ring-[var(--brand-client)]/30 font-mono"
              />
            </div>
          </div>
          <SaveButton loading={saving} label={hasBankAccount ? "Update bank account" : "Save bank account"} />
        </form>
      </Card>

      <Card>
        <SectionHeader title="PAN number" desc="Used on your annual tax report — important if you have significant income" />
        <form onSubmit={handleSavePan} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">PAN</Label>
            <Input
              value={panNumber}
              onChange={e => setPanNumber(e.target.value.toUpperCase().slice(0, 10))}
              placeholder="ABCDE1234F"
              maxLength={10}
              className="rounded-xl border-gray-200 focus-visible:ring-[var(--brand-client)]/30 font-mono uppercase"
            />
            <p className="text-xs text-gray-400">10 characters — 5 letters, 4 digits, 1 letter</p>
          </div>
          <SaveButton loading={savingPan} label="Save PAN number" />
        </form>
      </Card>
    </div>
  );
}

// ─── Templates tab ──────────────────────────────────────────────────────────────
interface ResponseTemplate {
  id: string;
  title: string;
  content: string;
  shortcut: string | null;
  sortOrder: number;
}

const MAX_TEMPLATES = 15;

function TemplatesTab() {
  const [templates, setTemplates] = useState<ResponseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [shortcut, setShortcut] = useState("");
  const [saving, setSaving] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragItem = useRef<string | null>(null);

  useEffect(() => {
    fetch("/api/editor/response-templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setTitle("");
    setContent("");
    setShortcut("");
  }

  function startEdit(t: ResponseTemplate) {
    setEditingId(t.id);
    setTitle(t.title);
    setContent(t.content);
    setShortcut(t.shortcut ?? "");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const body = { title: title.trim(), content: content.trim(), shortcut: shortcut.trim() || null };
      const res = editingId
        ? await fetch(`/api/editor/response-templates/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/editor/response-templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = typeof err.error === "object"
          ? Object.values(err.error as Record<string, string[]>).flat().join(". ")
          : err.error ?? "Failed to save template.";
        toast.error(msg);
        return;
      }

      const saved = await res.json();
      setTemplates((prev) =>
        editingId ? prev.map((t) => (t.id === editingId ? saved : t)) : [...prev, saved]
      );
      toast.success(editingId ? "Template updated." : "Template added.");
      resetForm();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const prev = templates;
    setTemplates((p) => p.filter((t) => t.id !== id));
    try {
      const res = await fetch(`/api/editor/response-templates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setTemplates(prev);
      toast.error("Failed to delete template.");
    }
  }

  const onDragStart = useCallback((id: string) => {
    dragItem.current = id;
    setDraggingId(id);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (dragItem.current !== id) setDragOverId(id);
  }, []);

  const onDrop = useCallback((targetId: string) => {
    if (!dragItem.current || dragItem.current === targetId) return;
    setTemplates((prev) => {
      const next = [...prev];
      const fromIdx = next.findIndex((t) => t.id === dragItem.current);
      const toIdx = next.findIndex((t) => t.id === targetId);
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      const reordered = next.map((t, idx) => ({ ...t, sortOrder: idx }));
      reordered.forEach((t) =>
        fetch(`/api/editor/response-templates/${t.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: t.sortOrder }),
        }).catch(() => {})
      );
      return reordered;
    });
    setDraggingId(null);
    setDragOverId(null);
    dragItem.current = null;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-800">
        <p className="font-semibold mb-0.5">Using templates in chat</p>
        <p className="text-xs text-blue-600 leading-relaxed">
          Type &quot;/&quot; in any order chat to quickly insert a template. If you set a shortcut, typing it
          after the slash (e.g. <span className="font-mono">/thanks</span>) jumps straight to that template.
        </p>
      </div>

      <Card>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900 text-sm">Response templates</p>
            <p className="text-xs text-gray-400 mt-0.5">{templates.length}/{MAX_TEMPLATES} used</p>
          </div>
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              disabled={templates.length >= MAX_TEMPLATES}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--brand-client)] text-white text-xs font-semibold hover:bg-[var(--brand-editor-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add template
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 border-b border-gray-100 bg-gray-50/50">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Title <span className="text-gray-400 font-normal">(shown in the picker)</span></Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Thank you for your order"
                maxLength={60}
                className="rounded-xl border-gray-200 focus-visible:ring-[var(--brand-client)]/30"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Shortcut <span className="text-gray-400 font-normal">(optional, letters only)</span></Label>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-gray-400 font-mono">/</span>
                <Input
                  value={shortcut}
                  onChange={(e) => setShortcut(e.target.value.replace(/[^a-zA-Z]/g, "").toLowerCase())}
                  placeholder="thanks"
                  maxLength={20}
                  className="rounded-xl border-gray-200 focus-visible:ring-[var(--brand-client)]/30 font-mono"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Message</Label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Thank you for your order! I'll get started right away."
                maxLength={1000}
                rows={3}
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/30 resize-none"
              />
              <p className="text-xs text-gray-400 text-right">{content.length}/1000</p>
            </div>
            <div className="flex gap-2">
              <SaveButton loading={saving} label={editingId ? "Update template" : "Add template"} />
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {templates.length === 0 ? (
          <div className="py-12 text-center">
            <MessageSquareText className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No templates yet. Add one to speed up your replies.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {templates.map((t) => (
              <div
                key={t.id}
                draggable
                onDragStart={() => onDragStart(t.id)}
                onDragOver={(e) => onDragOver(e, t.id)}
                onDrop={() => onDrop(t.id)}
                onDragEnd={() => { setDraggingId(null); setDragOverId(null); }}
                className={cn(
                  "flex items-start gap-3 px-6 py-4 transition-colors",
                  draggingId === t.id && "opacity-40",
                  dragOverId === t.id && "bg-[var(--brand-client)]/5"
                )}
              >
                <GripVertical className="w-4 h-4 text-gray-300 mt-0.5 cursor-grab shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{t.title}</p>
                    {t.shortcut && (
                      <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">/{t.shortcut}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.content}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(t)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-[var(--brand-client)] hover:bg-[var(--brand-client)]/5 transition-colors"
                    aria-label="Edit template"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(t.id)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    aria-label="Delete template"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Notifications tab ─────────────────────────────────────────────────────────
function NotificationsTab() {
  const [emailPrefs, setEmailPrefs] = useState({ newOrder: true, revision: true, message: true, marketing: true });
  const [notifPrefs, setNotifPrefs] = useState({ newOrder: true, revision: true, message: true, review: true });
  const [loaded, setLoaded]         = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/editor/preferences")
      .then(r => r.json())
      .then(data => {
        if (data.email) setEmailPrefs(data.email);
        if (data.notif) setNotifPrefs(data.notif);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const persist = useCallback((email: typeof emailPrefs, notif: typeof notifPrefs) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch("/api/editor/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, notif }),
      }).catch(() => toast.error("Failed to save preferences."));
    }, 600);
  }, []);

  function setEmail(key: keyof typeof emailPrefs, v: boolean) {
    const next = { ...emailPrefs, [key]: v };
    setEmailPrefs(next);
    persist(next, notifPrefs);
  }

  function setNotif(key: keyof typeof notifPrefs, v: boolean) {
    const next = { ...notifPrefs, [key]: v };
    setNotifPrefs(next);
    persist(emailPrefs, next);
  }

  return (
    <div className={cn("space-y-5", !loaded && "opacity-60 pointer-events-none")}>
      <Card>
        <SectionHeader title="Email notifications" desc="Control which emails EditBridge sends you" />
        <ToggleRow label="New order received"     desc="Email when a client places an order"        value={emailPrefs.newOrder}  onChange={v => setEmail("newOrder", v)} />
        <ToggleRow label="Revision requested"     desc="Email when a client requests changes"       value={emailPrefs.revision}  onChange={v => setEmail("revision", v)} />
        <ToggleRow label="New message"            desc="Email when a client sends you a message"    value={emailPrefs.message}   onChange={v => setEmail("message", v)} />
        <ToggleRow label="Product updates & tips" desc="Occasional emails from the EditBridge team" value={emailPrefs.marketing} onChange={v => setEmail("marketing", v)} />
      </Card>

      <Card>
        <SectionHeader title="In-app notifications" desc="What appears in your notification bell" />
        <ToggleRow label="New order"          desc="When a client places an order"  value={notifPrefs.newOrder} onChange={v => setNotif("newOrder", v)} />
        <ToggleRow label="Revision requested" desc="When a client requests changes" value={notifPrefs.revision} onChange={v => setNotif("revision", v)} />
        <ToggleRow label="New message"        desc="When a client sends a message"  value={notifPrefs.message}  onChange={v => setNotif("message", v)} />
        <ToggleRow label="Review received"    desc="When a client leaves a review"  value={notifPrefs.review}   onChange={v => setNotif("review", v)} />
      </Card>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function EditorSettingsPage() {
  const { data: session, update } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <h1 className="text-xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage your profile, security, and preferences</p>
      </div>

      {/* Tab navigation */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-6 flex overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0",
                activeTab === tab.id
                  ? "border-[var(--brand-client)] text-[var(--brand-client)]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 max-w-3xl mx-auto">
        {/* Email verification banner */}
        {session && !session.user.isEmailVerified && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 mb-5">
            <MailWarning className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900">Please verify your email</p>
              <p className="text-xs text-amber-700 mt-0.5">Check your inbox for a verification link.</p>
            </div>
            <button
              onClick={async () => {
                const res = await fetch("/api/auth/resend-verification", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email: session.user.email }),
                });
                if (res.ok) toast.success("Verification email sent!");
                else toast.error("Could not send. Try again later.");
              }}
              className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2 whitespace-nowrap"
            >
              Resend
            </button>
          </div>
        )}

        {activeTab === "profile"       && <ProfileTab session={session} update={update} />}
        {activeTab === "security"      && <SecurityTab />}
        {activeTab === "templates"     && <TemplatesTab />}
        {activeTab === "payments"      && <PaymentsTab />}
        {activeTab === "notifications" && <NotificationsTab />}
      </div>
    </div>
  );
}
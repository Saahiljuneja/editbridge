"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useSession, signOut } from "next-auth/react";
import { User, Lock, LogOut, Settings, ShieldAlert, Eye, EyeOff, MailWarning, Bell, Shield, QrCode, Copy, CheckCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type ChannelPref = { email: boolean; push: boolean };
type ClientNotifPrefs = {
  orderUpdate: ChannelPref;
  delivery: ChannelPref;
  message: ChannelPref;
  dispute: ChannelPref;
  marketing: ChannelPref;
};

function toChannelPref(v: unknown): ChannelPref {
  if (typeof v === "boolean") return { email: v, push: v };
  if (v && typeof v === "object" && "email" in v) return v as ChannelPref;
  return { email: true, push: true };
}

const DEFAULT_NOTIF: ClientNotifPrefs = {
  orderUpdate: { email: true, push: true },
  delivery:    { email: true, push: true },
  message:     { email: true, push: true },
  dispute:     { email: true, push: true },
  marketing:   { email: false, push: false },
};

export default function ClientSettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Password fields
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  // Notification prefs
  const [notifPrefs, setNotifPrefs] = useState<ClientNotifPrefs>(DEFAULT_NOTIF);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 2FA
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFaStep, setTwoFaStep] = useState<"idle" | "setup" | "verify" | "backup">("idle");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [tempSecret, setTempSecret] = useState("");
  const [totp, setTotp] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [disablePassword, setDisablePassword] = useState("");
  const [twoFaLoading, setTwoFaLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/users/me").then((r) => r.json()),
      fetch("/api/client/preferences").then((r) => r.json()),
    ]).then(([userData, prefsData]) => {
      setName(userData.name ?? "");
      setTwoFactorEnabled(!!userData.twoFactorEnabled);
      if (prefsData.notif) {
        // Migrate old boolean format to channel format
        const raw = prefsData.notif as Record<string, unknown>;
        setNotifPrefs({
          orderUpdate: toChannelPref(raw.orderUpdate),
          delivery:    toChannelPref(raw.delivery),
          message:     toChannelPref(raw.message),
          dispute:     toChannelPref(raw.dispute),
          marketing:   toChannelPref(raw.marketing),
        });
      }
      setPrefsLoaded(true);
      setLoading(false);
    }).catch(() => { setPrefsLoaded(true); setLoading(false); });
  }, []);

  const saveNotifPrefs = useCallback((notif: ClientNotifPrefs) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch("/api/client/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notif }),
      }).catch(() => toast.error("Failed to save preferences."));
    }, 600);
  }, []);

  function updateNotifChannel(key: keyof ClientNotifPrefs, channel: "email" | "push", value: boolean) {
    const next = { ...notifPrefs, [key]: { ...notifPrefs[key], [channel]: value } };
    setNotifPrefs(next);
    saveNotifPrefs(next);
  }

  async function start2FASetup() {
    setTwoFaLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setQrDataUrl(data.qrCodeDataUrl);
      setTempSecret(data.secret);
      setTwoFaStep("setup");
    } catch { toast.error("Failed to start 2FA setup."); }
    finally { setTwoFaLoading(false); }
  }

  async function verify2FA() {
    if (totp.length !== 6) { toast.error("Enter a 6-digit code."); return; }
    setTwoFaLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: totp, tempSecret }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Invalid code."); return; }
      const data = await res.json();
      setBackupCodes(data.backupCodes ?? []);
      setTwoFactorEnabled(true);
      setTwoFaStep("backup");
      setTotp("");
    } catch { toast.error("Something went wrong."); }
    finally { setTwoFaLoading(false); }
  }

  async function disable2FA() {
    if (!disablePassword) { toast.error("Enter your password to disable 2FA."); return; }
    setTwoFaLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Incorrect password."); return; }
      setTwoFactorEnabled(false);
      setTwoFaStep("idle");
      setDisablePassword("");
      toast.success("Two-factor authentication disabled.");
    } catch { toast.error("Something went wrong."); }
    finally { setTwoFaLoading(false); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Name cannot be empty"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error();
      await updateSession({ name: name.trim() });
      toast.success("Profile updated.");
    } catch { toast.error("Failed to save."); }
    finally { setSaving(false); }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPw || !newPw || !confirmPw) { toast.error("Fill in all password fields."); return; }
    if (newPw !== confirmPw) { toast.error("New passwords don't match."); return; }
    if (newPw.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    setSavingPw(true);
    try {
      const res = await fetch("/api/users/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Failed to change password."); return; }
      toast.success("Password changed.");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch { toast.error("Something went wrong."); }
    finally { setSavingPw(false); }
  }

  const pwStrength = newPw.length === 0 ? 0 : newPw.length < 8 ? 1 : newPw.length < 12 ? 2 : 3;
  const pwColors = ["bg-gray-100", "bg-red-400", "bg-amber-400", "bg-green-500"];
  const pwLabels = ["", "Weak", "Fair", "Strong"];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="px-6 py-6 space-y-4 max-w-3xl mx-auto">
          {[1, 2].map(i => <div key={i} className="h-32 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
        </div>
      </div>
    );
  }

  function Section({ icon: Icon, title, description, children }: {
    icon: React.ElementType; title: string; description: string; children: React.ReactNode;
  }) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="flex items-start gap-3 px-6 py-5 border-b border-gray-50">
          <div className="w-8 h-8 rounded-lg bg-[var(--brand-client)]/10 flex items-center justify-center shrink-0 mt-0.5">
            <Icon className="w-4 h-4 text-[var(--brand-client)]" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{title}</p>
            <p className="text-xs text-gray-400 mt-0.5">{description}</p>
          </div>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Account Settings</h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage your profile and security</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[var(--brand-client)]/10 flex items-center justify-center">
            <Settings className="w-4 h-4 text-[var(--brand-client)]" />
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-4 max-w-3xl mx-auto">
        {/* Email verification banner */}
        {session && !session.user.isEmailVerified && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200">
            <MailWarning className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900">Please verify your email</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Check your inbox for a verification link. Verifying keeps your account secure.
              </p>
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
              Resend email
            </button>
          </div>
        )}

        {/* Profile */}
        <Section icon={User} title="Profile" description="Your public-facing name on EditBridge.">
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Display name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                maxLength={100}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/20 focus:border-[var(--brand-client)]/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
              <input
                value={session?.user?.email ?? ""}
                disabled
                className="w-full rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed. Contact support if needed.</p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
              style={{ background: "var(--brand-client)" }}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </form>
        </Section>

        {/* Password */}
        <Section icon={Lock} title="Password" description="Keep your account secure with a strong password.">
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Current password</label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  placeholder="Current password"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/20 focus:border-[var(--brand-client)]/50"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">New password</label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="New password"
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/20 focus:border-[var(--brand-client)]/50"
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Confirm new</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/20 focus:border-[var(--brand-client)]/50"
                />
              </div>
            </div>
            {newPw.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={cn("h-1 flex-1 rounded-full transition-colors", i <= pwStrength ? pwColors[pwStrength] : "bg-gray-100")} />
                  ))}
                </div>
                <p className="text-xs text-gray-400">{pwLabels[pwStrength]}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={savingPw}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
              style={{ background: "var(--brand-client)" }}
            >
              {savingPw ? "Changing…" : "Change password"}
            </button>
          </form>
        </Section>

        {/* Notification preferences */}
        <Section icon={Bell} title="Notifications" description="Choose where you receive each type of notification.">
          <div className={cn("space-y-0 -mx-6 -mb-5", !prefsLoaded && "opacity-60 pointer-events-none")}>
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_80px_80px] px-6 py-2 border-b border-gray-50">
              <div />
              <p className="text-[10px] font-bold text-gray-400 uppercase text-center">Email</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase text-center">Push</p>
            </div>
            {(
              [
                { key: "orderUpdate", label: "Order updates",   desc: "Status changes on your orders" },
                { key: "delivery",    label: "New delivery",    desc: "When an editor delivers your order" },
                { key: "message",     label: "New message",     desc: "When an editor sends you a message" },
                { key: "dispute",     label: "Dispute updates", desc: "Updates on your disputes" },
                { key: "marketing",   label: "Tips & news",     desc: "Occasional updates from EditBridge" },
              ] as { key: keyof ClientNotifPrefs; label: string; desc: string }[]
            ).map(({ key, label, desc }) => (
              <div key={key} className="grid grid-cols-[1fr_80px_80px] items-center px-6 py-4 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </div>
                <div className="flex justify-center">
                  <Switch
                    checked={notifPrefs[key].email}
                    onCheckedChange={(v) => updateNotifChannel(key, "email", v)}
                  />
                </div>
                <div className="flex justify-center">
                  <Switch
                    checked={notifPrefs[key].push}
                    onCheckedChange={(v) => updateNotifChannel(key, "push", v)}
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Two-Factor Authentication */}
        <Section icon={Shield} title="Two-Factor Authentication" description="Add a second layer of security to your account.">
          {twoFactorEnabled && twoFaStep === "idle" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-900">2FA is enabled</p>
                  <p className="text-xs text-emerald-700 mt-0.5">Your account is protected with a TOTP authenticator app.</p>
                </div>
              </div>
              <p className="text-xs font-semibold text-gray-700 mb-1.5">Disable 2FA — enter your password to confirm</p>
              <div className="relative">
                <input type="password" value={disablePassword} onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder="Your account password"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
              </div>
              <button onClick={disable2FA} disabled={twoFaLoading || !disablePassword}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 transition-colors">
                {twoFaLoading ? "Disabling…" : "Disable 2FA"}
              </button>
            </div>
          ) : twoFaStep === "setup" ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.).
              </p>
              {qrDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="2FA QR code" className="w-48 h-48 rounded-xl border border-gray-100" />
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Enter the 6-digit code from your app</label>
                <input type="text" inputMode="numeric" value={totp} onChange={(e) => setTotp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000" maxLength={6}
                  className="w-36 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/20" />
              </div>
              <div className="flex gap-2">
                <button onClick={verify2FA} disabled={twoFaLoading || totp.length !== 6}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                  style={{ background: "var(--brand-client)" }}>
                  {twoFaLoading ? "Verifying…" : "Verify & enable"}
                </button>
                <button onClick={() => setTwoFaStep("idle")}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-700">
                  Cancel
                </button>
              </div>
            </div>
          ) : twoFaStep === "backup" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-900">2FA enabled successfully!</p>
                  <p className="text-xs text-emerald-700 mt-0.5">Save these backup codes — they&apos;re shown only once.</p>
                </div>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code) => (
                    <code key={code} className="text-xs font-mono bg-white border border-gray-200 px-2.5 py-1.5 rounded-lg text-gray-800 text-center">
                      {code}
                    </code>
                  ))}
                </div>
              </div>
              <button onClick={() => {
                navigator.clipboard.writeText(backupCodes.join("\n")).then(() => toast.success("Backup codes copied!"));
              }} className="flex items-center gap-1.5 text-xs font-semibold text-[var(--brand-client)] hover:underline">
                <Copy className="w-3.5 h-3.5" /> Copy all codes
              </button>
              <button onClick={() => setTwoFaStep("idle")}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: "var(--brand-client)" }}>
                Done — I&apos;ve saved my backup codes
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                Two-factor authentication adds a second verification step at login, protecting your account even if your password is compromised.
              </p>
              <button onClick={start2FASetup} disabled={twoFaLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: "var(--brand-client)" }}>
                <QrCode className="w-4 h-4" />
                {twoFaLoading ? "Setting up…" : "Enable 2FA"}
              </button>
            </div>
          )}
        </Section>

        {/* Sign out */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 rounded-2xl border border-gray-200 bg-white shadow-sm px-6 py-4 hover:bg-gray-50 transition-colors group"
        >
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
            <LogOut className="w-4 h-4 text-gray-500" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-800">Sign out</p>
            <p className="text-xs text-gray-400">Sign out of your account on this device</p>
          </div>
        </button>

        {/* Danger zone */}
        <div className="rounded-2xl border border-red-100 bg-red-50/50 overflow-hidden">
          <div className="flex items-start gap-3 px-6 py-5 border-b border-red-100">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="font-semibold text-red-900 text-sm">Danger Zone</p>
              <p className="text-xs text-red-600/70 mt-0.5">Permanent actions — proceed with care</p>
            </div>
          </div>
          <div className="px-6 py-5">
            <p className="text-sm text-red-700/80 leading-relaxed">
              To deactivate or permanently delete your account, contact{" "}
              <a href="mailto:support@editbridge.in" className="font-semibold underline hover:text-red-900">
                support@editbridge.in
              </a>
              . We&apos;ll process your request within 3 business days.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

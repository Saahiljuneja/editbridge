"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Save, Upload, X } from "lucide-react";

// ─── Presets ──────────────────────────────────────────────────────────────────

const COLOR_PRESETS = [
  { label: "Violet",  value: "#7C3AED" },
  { label: "Blue",    value: "#3B82F6" },
  { label: "Sky",     value: "#0EA5E9" },
  { label: "Rose",    value: "#F43F5E" },
  { label: "Emerald", value: "#10B981" },
  { label: "Orange",  value: "#F97316" },
  { label: "Pink",    value: "#EC4899" },
  { label: "Cyan",    value: "#06B6D4" },
];

const RADIUS_PRESETS = [
  { label: "Sharp",   value: "0.25rem"  },
  { label: "Default", value: "0.625rem" },
  { label: "Rounded", value: "0.875rem" },
  { label: "Pill",    value: "1.25rem"  },
];

const HEADING_FONTS = ["Rubik", "Inter", "Poppins", "Space Grotesk", "Outfit", "Plus Jakarta Sans", "Montserrat"];
const BODY_FONTS    = ["Nunito Sans", "Inter", "DM Sans", "Lato", "Open Sans", "Source Sans 3"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function uploadImage(file: File): Promise<string> {
  const { presignedUrl, publicUrl } = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, contentType: file.type, uploadType: "branding", fileSize: file.size }),
  }).then(r => r.json());
  await fetch(presignedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
  return publicUrl as string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ColorRow({ label, sub, settingKey, value, onChange }: {
  label: string; sub: string; settingKey: string; value: string;
  onChange: (key: string, val: string) => void;
}) {
  return (
    <div className="px-6 py-5 flex items-center gap-6">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="a-subtle mt-0.5">{sub}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1.5">
          {COLOR_PRESETS.map(p => (
            <button key={p.value} title={p.label}
              onClick={() => onChange(settingKey, p.value)}
              className="w-5 h-5 rounded-full border-2 transition-all hover:scale-110"
              style={{
                background: p.value,
                borderColor: value === p.value ? "#111827" : "transparent",
                transform: value === p.value ? "scale(1.15)" : undefined,
              }} />
          ))}
        </div>
        <label className="relative cursor-pointer group" title="Custom color">
          <div className="w-8 h-8 rounded-lg border-2 border-gray-200 group-hover:border-gray-400 transition-colors"
            style={{ background: value }} />
          <input type="color" value={value} onChange={e => onChange(settingKey, e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full rounded-lg" />
        </label>
        <span className="text-xs font-mono text-gray-400 w-16 select-all">{value}</span>
      </div>
    </div>
  );
}

function ImageUploadField({ label, sub, value, onChange }: {
  label: string; sub: string; value: string; onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Only image files allowed"); return; }
    setUploading(true);
    try {
      const url = await uploadImage(file);
      onChange(url);
      toast.success(`${label} uploaded`);
    } catch {
      toast.error(`Failed to upload ${label.toLowerCase()}`);
    }
    setUploading(false);
  }

  return (
    <div className="flex items-center gap-6 px-6 py-5">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="a-subtle mt-0.5">{sub}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {value ? (
          <div className="relative group">
            <img src={value} alt={label} className="h-10 w-auto max-w-[120px] object-contain rounded border border-gray-200" />
            <button onClick={() => onChange("")}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gray-700 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ) : (
          <div className="h-10 w-24 rounded border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-xs">
            None
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        <button onClick={() => inputRef.current?.click()} disabled={uploading}
          className="a-btn-outline flex items-center gap-1.5 text-xs px-3 py-1.5">
          <Upload className="w-3.5 h-3.5" />
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ThemeClient({ settings: initial }: { settings: Record<string, string> }) {
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);

  function set(key: string, value: string) {
    setSettings(s => ({ ...s, [key]: value }));
  }

  async function save() {
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (res.ok) toast.success("Theme saved — reload to see site-wide changes");
    else toast.error("Failed to save");
    setSaving(false);
  }

  // Convenience getters
  const brandPrimary  = settings.brand_primary          || "#7C3AED";
  const brandEditor   = settings.brand_editor           || "#7C3AED";
  const brandClient   = settings.brand_client           || "#0EA5E9";
  const brandTeal     = settings.brand_teal             || "#0F6E56";
  const siteRadius    = settings.site_radius            || "0.625rem";
  const fontHeading   = settings.font_heading           || "Rubik";
  const fontBody      = settings.font_body              || "Nunito Sans";
  const annEnabled    = settings.announcement_enabled   === "true";
  const annBg         = settings.announcement_bg        || "#7C3AED";
  const annTextColor  = settings.announcement_text_color|| "#ffffff";
  const emailColor    = settings.email_header_color     || "#7C3AED";
  const darkMode      = settings.site_dark_mode         || "light";

  return (
    <div className="px-8 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="a-h1">Site Theme</h1>
          <p className="a-muted mt-1">Control the full visual identity of your marketplace. Changes apply site-wide after save.</p>
        </div>
        <button onClick={save} disabled={saving} className="a-btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      {/* ── Identity ─────────────────────────────────────────────────────── */}
      <div className="a-card">
        <div className="a-card-header">
          <h2 className="a-h2">Identity</h2>
          <p className="a-muted mt-0.5">Site name, tagline, logo, and favicon.</p>
        </div>
        <div className="divide-y divide-gray-100">

          {/* Name + tagline */}
          <div className="px-6 py-5 grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-900 block mb-1.5">Site Name</label>
              <input value={settings.platform_name || ""} onChange={e => set("platform_name", e.target.value)}
                className="a-field w-full px-3 py-2" placeholder="EditBridge" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-900 block mb-1.5">Tagline</label>
              <input value={settings.platform_tagline || ""} onChange={e => set("platform_tagline", e.target.value)}
                className="a-field w-full px-3 py-2" placeholder="Video Editing & Thumbnail Design Marketplace" />
            </div>
          </div>

          {/* Logo */}
          <ImageUploadField
            label="Logo"
            sub="Shown in the navbar, emails, and shared previews. SVG or PNG recommended."
            value={settings.logo_url || ""}
            onChange={url => set("logo_url", url)}
          />

          {/* Favicon */}
          <ImageUploadField
            label="Favicon"
            sub="Browser tab icon. Use a square PNG or ICO, 32×32 or 64×64 px."
            value={settings.favicon_url || ""}
            onChange={url => set("favicon_url", url)}
          />
        </div>
      </div>

      {/* ── Brand Colors ─────────────────────────────────────────────────── */}
      <div className="a-card">
        <div className="a-card-header">
          <h2 className="a-h2">Brand Colors</h2>
          <p className="a-muted mt-0.5">These map to CSS variables used across the site.</p>
        </div>
        <div className="divide-y divide-gray-100">
          <ColorRow label="Primary Color"  sub="Buttons, links, and key interactive elements"            settingKey="brand_primary" value={brandPrimary} onChange={set} />
          <ColorRow label="Editor Accent"  sub="Editor-side UI, profile highlights, editor badges"    settingKey="brand_editor"  value={brandEditor}  onChange={set} />
          <ColorRow label="Client Accent"  sub="Client-side UI, buyer features, client badges"         settingKey="brand_client"  value={brandClient}  onChange={set} />
          <ColorRow label="Teal / Trust"   sub="Verified badges, KYC approved, trust indicators"       settingKey="brand_teal"    value={brandTeal}    onChange={set} />
        </div>
      </div>

      {/* ── Typography ───────────────────────────────────────────────────── */}
      <div className="a-card">
        <div className="a-card-header">
          <h2 className="a-h2">Typography</h2>
          <p className="a-muted mt-0.5">Google Fonts are loaded automatically. Takes effect on next full page load.</p>
        </div>
        <div className="divide-y divide-gray-100">
          {([
            { key: "font_heading", label: "Heading Font", sub: "h1–h3, hero text, card titles",              val: fontHeading, options: HEADING_FONTS },
            { key: "font_body",    label: "Body Font",    sub: "Paragraphs, labels, and navigation",          val: fontBody,    options: BODY_FONTS   },
          ] as const).map(({ key, label, sub, val, options }) => (
            <div key={key} className="px-6 py-5 flex items-center gap-6">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{label}</p>
                <p className="a-subtle mt-0.5">{sub}</p>
                <p className="mt-2 text-sm text-gray-600" style={{ fontFamily: `"${val}", sans-serif` }}>
                  The quick brown fox jumps over the lazy dog.
                </p>
              </div>
              <select value={val} onChange={e => set(key, e.target.value)}
                className="a-field w-48 px-3 py-2 shrink-0">
                {options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* ── Shape ────────────────────────────────────────────────────────── */}
      <div className="a-card p-6">
        <h2 className="a-h2">Shape &amp; Radius</h2>
        <p className="a-muted mt-0.5 mb-5">Controls the border-radius of cards, buttons, and inputs site-wide.</p>
        <div className="flex items-end gap-3">
          {RADIUS_PRESETS.map(p => (
            <button key={p.value} onClick={() => set("site_radius", p.value)}
              className="flex flex-col items-center gap-2.5 px-5 py-4 border-2 transition-all hover:border-gray-300"
              style={{
                borderRadius: p.value,
                borderColor:  siteRadius === p.value ? brandPrimary : "#E5E7EB",
                background:   siteRadius === p.value ? brandPrimary + "0d" : "white",
              }}>
              <div className="w-10 h-10 bg-gray-200" style={{ borderRadius: p.value }} />
              <span className="text-xs font-semibold" style={{ color: siteRadius === p.value ? brandPrimary : "#374151" }}>
                {p.label}
              </span>
              <span className="text-[10px] font-mono text-gray-400">{p.value}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Dark Mode ────────────────────────────────────────────────────── */}
      <div className="a-card p-6">
        <h2 className="a-h2">Dark Mode</h2>
        <p className="a-muted mt-0.5 mb-4">Default color scheme for all visitors.</p>
        <div className="flex gap-3">
          {([
            { value: "light",  label: "Light",  desc: "Always light mode" },
            { value: "dark",   label: "Dark",   desc: "Always dark mode" },
            { value: "system", label: "System", desc: "Follow OS preference" },
          ] as const).map(opt => (
            <button key={opt.value} onClick={() => set("site_dark_mode", opt.value)}
              className="flex-1 flex flex-col items-center gap-1.5 py-4 px-3 border-2 rounded-xl transition-all"
              style={{
                borderColor: darkMode === opt.value ? brandPrimary : "#E5E7EB",
                background:  darkMode === opt.value ? brandPrimary + "0d" : "white",
              }}>
              <div className={`w-10 h-6 rounded-md border ${opt.value === "dark" ? "bg-gray-900 border-gray-700" : opt.value === "system" ? "bg-gradient-to-r from-white to-gray-900 border-gray-300" : "bg-white border-gray-200"}`} />
              <span className="text-sm font-semibold" style={{ color: darkMode === opt.value ? brandPrimary : "#374151" }}>{opt.label}</span>
              <span className="text-xs text-gray-400">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Announcement Banner ──────────────────────────────────────────── */}
      <div className="a-card">
        <div className="a-card-header">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="a-h2">Announcement Banner</h2>
              <p className="a-muted mt-0.5">A dismissible bar shown at the top of every page.</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-gray-500">{annEnabled ? "Enabled" : "Disabled"}</span>
              <div
                onClick={() => set("announcement_enabled", annEnabled ? "false" : "true")}
                className="w-10 h-5 rounded-full relative transition-colors cursor-pointer"
                style={{ background: annEnabled ? brandPrimary : "#D1D5DB" }}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${annEnabled ? "left-5" : "left-0.5"}`} />
              </div>
            </label>
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          <div className="px-6 py-5">
            <label className="text-sm font-semibold text-gray-900 block mb-1.5">Banner Text</label>
            <input value={settings.announcement_text || ""} onChange={e => set("announcement_text", e.target.value)}
              className="a-field w-full px-3 py-2" placeholder="🎉 Black Friday sale — 20% off all orders this week!" />
          </div>
          <div className="px-6 py-5 flex items-center gap-8">
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-3">Background Color</p>
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  {COLOR_PRESETS.map(p => (
                    <button key={p.value} title={p.label} onClick={() => set("announcement_bg", p.value)}
                      className="w-5 h-5 rounded-full border-2 transition-all hover:scale-110"
                      style={{ background: p.value, borderColor: annBg === p.value ? "#111827" : "transparent" }} />
                  ))}
                </div>
                <label className="relative cursor-pointer">
                  <div className="w-7 h-7 rounded-lg border-2 border-gray-200" style={{ background: annBg }} />
                  <input type="color" value={annBg} onChange={e => set("announcement_bg", e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                </label>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-3">Text Color</p>
              <div className="flex items-center gap-2">
                {["#ffffff", "#000000", "#FEF3C7", "#DBEAFE"].map(c => (
                  <button key={c} onClick={() => set("announcement_text_color", c)}
                    className="w-5 h-5 rounded-full border-2 transition-all hover:scale-110"
                    style={{ background: c, borderColor: annTextColor === c ? "#111827" : "#E5E7EB" }} />
                ))}
                <label className="relative cursor-pointer">
                  <div className="w-7 h-7 rounded-lg border-2 border-gray-200" style={{ background: annTextColor }} />
                  <input type="color" value={annTextColor} onChange={e => set("announcement_text_color", e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                </label>
              </div>
            </div>
          </div>
          {/* Preview */}
          {settings.announcement_text && (
            <div className="px-6 py-4">
              <p className="text-xs text-gray-400 mb-2">Preview</p>
              <div className="w-full px-4 py-2.5 text-sm font-medium text-center rounded-lg"
                style={{ background: annBg, color: annTextColor }}>
                {settings.announcement_text}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Email Branding ───────────────────────────────────────────────── */}
      <div className="a-card">
        <div className="a-card-header">
          <h2 className="a-h2">Email Branding</h2>
          <p className="a-muted mt-0.5">Customize the header of transactional emails (order confirmations, KYC approvals, etc.).</p>
        </div>
        <div className="divide-y divide-gray-100">
          <div className="px-6 py-5 flex items-center gap-6">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">Email Header Color</p>
              <p className="a-subtle mt-0.5">Background color of the email header bar</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex gap-1.5">
                {COLOR_PRESETS.map(p => (
                  <button key={p.value} title={p.label} onClick={() => set("email_header_color", p.value)}
                    className="w-5 h-5 rounded-full border-2 transition-all hover:scale-110"
                    style={{ background: p.value, borderColor: emailColor === p.value ? "#111827" : "transparent" }} />
                ))}
              </div>
              <label className="relative cursor-pointer">
                <div className="w-8 h-8 rounded-lg border-2 border-gray-200" style={{ background: emailColor }} />
                <input type="color" value={emailColor} onChange={e => set("email_header_color", e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              </label>
              <span className="text-xs font-mono text-gray-400 w-16">{emailColor}</span>
            </div>
          </div>
          {/* Email preview */}
          <div className="px-6 py-5">
            <p className="text-xs text-gray-400 mb-3">Preview</p>
            <div className="border border-gray-200 rounded-xl overflow-hidden max-w-sm">
              <div className="px-6 py-4 flex items-center gap-2" style={{ background: emailColor }}>
                {settings.logo_url
                  ? <img src={settings.logo_url} alt="Logo" className="h-6 w-auto object-contain" />
                  : <span className="text-white font-bold text-base">{settings.platform_name || "EditBridge"}</span>}
              </div>
              <div className="px-6 py-4 bg-white">
                <p className="text-sm font-semibold text-gray-800">Your order is confirmed 🎉</p>
                <p className="text-xs text-gray-500 mt-1">Hi there, your order has been placed successfully.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Social Links ─────────────────────────────────────────────────── */}
      <div className="a-card">
        <div className="a-card-header">
          <h2 className="a-h2">Social Links</h2>
          <p className="a-muted mt-0.5">Displayed in the site footer. Leave blank to hide.</p>
        </div>
        <div className="divide-y divide-gray-100">
          {([
            { key: "social_twitter",   label: "Twitter / X", placeholder: "https://twitter.com/editbridge" },
            { key: "social_instagram", label: "Instagram",    placeholder: "https://instagram.com/editbridge" },
            { key: "social_linkedin",  label: "LinkedIn",     placeholder: "https://linkedin.com/company/editbridge" },
          ] as const).map(({ key, label, placeholder }) => (
            <div key={key} className="px-6 py-4 flex items-center gap-4">
              <span className="w-4 h-4 text-gray-400 shrink-0 text-xs font-bold">@</span>
              <div className="flex-1">
                <label className="text-sm font-semibold text-gray-900">{label}</label>
              </div>
              <input value={settings[key] || ""} onChange={e => set(key, e.target.value)}
                className="a-field w-72 px-3 py-2" placeholder={placeholder} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Custom CSS ───────────────────────────────────────────────────── */}
      <div className="a-card p-6">
        <h2 className="a-h2">Custom CSS</h2>
        <p className="a-muted mt-0.5 mb-4">
          Injected into a <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">&lt;style&gt;</code> tag in the root layout.
          Use with care — bad CSS can break the site layout.
        </p>
        <textarea
          value={settings.custom_css || ""}
          onChange={e => set("custom_css", e.target.value)}
          rows={8}
          spellCheck={false}
          className="a-field w-full px-3 py-2.5 font-mono text-xs resize-y"
          placeholder={`:root {\n  /* override any CSS variable here */\n  --brand-teal: #0F6E56;\n}\n\n.hero-title {\n  letter-spacing: -0.04em;\n}`}
        />
      </div>

      {/* ── Live Preview ─────────────────────────────────────────────────── */}
      <div className="a-card p-6">
        <h2 className="a-h2 mb-4">Live Preview</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <button className="px-4 py-2 text-sm font-semibold text-white shadow-sm"
            style={{ background: brandPrimary, borderRadius: siteRadius }}>
            Primary Button
          </button>
          <button className="px-4 py-2 text-sm font-semibold border-2 bg-white"
            style={{ borderColor: brandPrimary, color: brandPrimary, borderRadius: siteRadius }}>
            Outline Button
          </button>
          <span className="px-3 py-1 text-xs font-bold text-white"
            style={{ background: brandEditor, borderRadius: siteRadius }}>
            Editor Badge
          </span>
          <span className="px-3 py-1 text-xs font-bold text-white"
            style={{ background: brandClient, borderRadius: siteRadius }}>
            Client Badge
          </span>
          <div className="p-4 border border-gray-200 bg-white shadow-sm"
            style={{ borderRadius: siteRadius }}>
            <p className="text-sm font-bold text-gray-900" style={{ fontFamily: `"${fontHeading}", sans-serif` }}>
              Heading text
            </p>
            <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: `"${fontBody}", sans-serif` }}>
              Body paragraph text goes here.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}

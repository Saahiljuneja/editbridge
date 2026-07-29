"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BellRing, Send, Loader2, Users, Link as LinkIcon } from "lucide-react";

const AUDIENCE_OPTIONS = [
  { value: "all", label: "All subscribed users" },
  { value: "clients", label: "Clients only" },
  { value: "editors", label: "Editors only" },
  { value: "editors_kyc_approved", label: "KYC-approved editors" },
];

export function PushClient({ subscriberCount }: { subscriberCount: number }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/");
  const [audience, setAudience] = useState("all");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function send() {
    if (!title.trim() || !body.trim()) { toast.error("Title and body are required"); return; }
    if (!confirm(`Send push notification to ${AUDIENCE_OPTIONS.find(a => a.value === audience)?.label}?`)) return;
    setSending(true);
    const res = await fetch("/api/admin/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), body: body.trim(), url, audience }),
    });
    if (res.ok) {
      const data = await res.json();
      toast.success(`Sent to ${data.sent ?? "all"} devices`);
      setSent(true);
      setTitle(""); setBody(""); setUrl("/");
    } else {
      toast.error("Failed to send push notification");
    }
    setSending(false);
  }

  return (
    <div className="space-y-5">
      {/* Preview */}
      <div className="rounded-2xl bg-gray-900 p-5">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-3 font-semibold">Preview</p>
        <div className="rounded-xl bg-white/10 backdrop-blur border border-white/10 p-4 flex gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--brand-client)] flex items-center justify-center shrink-0">
            <BellRing className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{title || "Notification title"}</p>
            <p className="text-xs text-white/60 mt-0.5">{body || "Notification body text goes here…"}</p>
            <p className="text-xs text-white/30 mt-1">editbridge.com</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="a-card p-6 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} maxLength={80}
            placeholder="e.g. New feature available!"
            className="w-full a-input rounded-xl px-3 py-2.5" />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">{title.length}/80</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Body</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} maxLength={200} rows={3}
            placeholder="e.g. Check out the new timeline view on your orders…"
            className="w-full a-input rounded-xl px-3 py-2.5 resize-none" />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">{body.length}/200</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
            <span className="flex items-center gap-1"><LinkIcon className="w-3 h-3" /> Click-through URL</span>
          </label>
          <input value={url} onChange={e => setUrl(e.target.value)}
            placeholder="/dashboard"
            className="w-full a-input rounded-xl px-3 py-2.5" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Audience</span>
          </label>
          <select value={audience} onChange={e => setAudience(e.target.value)}
            className="w-full a-input rounded-xl px-3 py-2.5">
            {AUDIENCE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {audience === "all" ? `Up to ${subscriberCount.toLocaleString()} devices` : "Count depends on segment"}
          </p>
        </div>

        <button onClick={send} disabled={sending || !title || !body}
          className="w-full flex items-center justify-center gap-2 bg-gray-900 dark:bg-gray-700 text-white text-sm font-semibold py-3 rounded-xl hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors disabled:opacity-40">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? "Sending…" : "Send Push Notification"}
        </button>
      </div>

      {sent && (
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 p-4 text-sm text-emerald-700 dark:text-emerald-400 font-medium">
          Push notification sent successfully!
        </div>
      )}

      <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40 p-4">
        <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">Setup required</p>
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Push notifications require VAPID keys configured in <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">NEXT_PUBLIC_VAPID_PUBLIC_KEY</code>{" "}
          and a service worker at <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">/sw.js</code>.
          The API endpoint <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">/api/admin/push</code> handles delivery via web-push.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Mail, ChevronDown } from "lucide-react";

type EmailType = "kyc_approved" | "kyc_rejected" | "custom";

const EMAIL_OPTIONS: { value: EmailType; label: string; editorOnly?: boolean }[] = [
  { value: "kyc_approved", label: "KYC Approved", editorOnly: true },
  { value: "kyc_rejected", label: "KYC Rejected", editorOnly: true },
  { value: "custom", label: "Custom message" },
];

export function SendEmailForm({ userId, userRole }: { userId: string; userRole: string }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<EmailType>("kyc_approved");
  const [reason, setReason] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const isEditor = userRole === "editor";
  const availableOptions = EMAIL_OPTIONS.filter(o => !o.editorOnly || isEditor);

  async function handleSend() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, reason, subject, message }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Email sent successfully.");
        setOpen(false);
        setReason(""); setSubject(""); setMessage("");
      } else {
        toast.error(data.error ?? "Failed to send email.");
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <Mail className="w-4 h-4" />
        Send email
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Email type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as EmailType)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/30"
            >
              {availableOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {type === "kyc_rejected" && (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Rejection reason</label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={2}
                placeholder="Explain why the KYC was rejected…"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/30 resize-none"
              />
            </div>
          )}

          {type === "custom" && (
            <>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Subject</label>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Email subject…"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/30"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Message</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Message body…"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/30 resize-none"
                />
              </div>
            </>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSend}
              disabled={loading}
              className="flex-1 py-2 rounded-lg bg-[var(--brand-client)] text-white text-sm font-medium hover:bg-[var(--brand-editor-hover)] disabled:opacity-50 transition-colors"
            >
              {loading ? "Sending…" : "Send email"}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

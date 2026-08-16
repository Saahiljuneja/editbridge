"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  X,
  Film,
  FileText,
  Wallet,
  Clock,
  Link as LinkIcon,
  SendHorizonal,
  Loader2,
} from "lucide-react";

const VIDEO_TYPES = [
  { value: "youtube",   label: "YouTube" },
  { value: "reels",     label: "Reels / Shorts" },
  { value: "wedding",   label: "Wedding & Events" },
  { value: "corporate", label: "Corporate / Brand" },
  { value: "music",     label: "Music Video" },
  { value: "podcast",   label: "Podcast" },
  { value: "travel",    label: "Travel / Vlog" },
  { value: "gaming",    label: "Gaming" },
  { value: "other",     label: "Other" },
];

const DEADLINES = [
  { value: "1-3 days", label: "1–3 days" },
  { value: "1 week",   label: "1 week" },
  { value: "2 weeks",  label: "2 weeks" },
  { value: "flexible", label: "Flexible" },
];

const INPUT_CLS =
  "w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af]/50 placeholder:text-gray-400";

export function RequestQuoteButton({ editorId }: { editorId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    videoType: "",
    brief: "",
    budgetMin: "",
    budgetMax: "",
    deadlinePreference: "flexible",
    referenceUrl: "",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleClose() {
    setOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.videoType) { toast.error("Please select a video type"); return; }
    if (!form.brief || form.brief.length < 20) { toast.error("Brief must be at least 20 characters"); return; }

    const budgetMin = Math.round(Number(form.budgetMin) * 100);
    const budgetMax = Math.round(Number(form.budgetMax) * 100);
    if (!budgetMin || budgetMin < 50000) { toast.error("Minimum budget is ₹500"); return; }
    if (!budgetMax || budgetMax < budgetMin) { toast.error("Max budget must be ≥ min budget"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          editorId,
          videoType: form.videoType,
          brief: form.brief,
          budgetMin,
          budgetMax,
          deadlinePreference: form.deadlinePreference,
          referenceUrl: form.referenceUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send request");

      toast.success("Quote request sent! The editor will respond within 48 hours.");
      setOpen(false);
      router.push("/client/quotes");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full justify-center px-4 py-3 rounded-xl border-2 border-[#1e40af] text-[#1e40af] font-semibold text-sm transition-colors hover:bg-blue-50"
      >
        <MessageSquare className="w-4 h-4" />
        Request a Quote
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#1e40af]/10 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-[#1e40af]" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-sm">Request a Custom Quote</h2>
                  <p className="text-xs text-gray-400">You only pay after accepting the offer</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">
              {/* Video type */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center">
                    <Film className="w-3.5 h-3.5 text-[#1e40af]" />
                  </div>
                  <label className="text-sm font-semibold text-gray-800">
                    What type of video?
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {VIDEO_TYPES.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => set("videoType", value)}
                      className={cn(
                        "text-xs py-2 px-2 rounded-xl border transition-colors text-center",
                        form.videoType === value
                          ? "bg-[#1e40af]/10 border-[#1e40af]/40 text-[#1e40af] font-semibold"
                          : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brief */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5 text-[#1e40af]" />
                  </div>
                  <label className="text-sm font-semibold text-gray-800">
                    Describe what you need
                  </label>
                </div>
                <textarea
                  value={form.brief}
                  onChange={(e) => set("brief", e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="Explain your video concept, style preferences, references, and anything important…"
                  className={cn(INPUT_CLS, "resize-none")}
                />
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-400">
                    {form.brief.length < 20 && form.brief.length > 0
                      ? `${20 - form.brief.length} more characters needed`
                      : ""}
                  </span>
                  <span className="text-xs text-gray-400 tabular-nums">
                    {form.brief.length}/2000
                  </span>
                </div>
              </div>

              {/* Budget */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center">
                    <Wallet className="w-3.5 h-3.5 text-[#1e40af]" />
                  </div>
                  <label className="text-sm font-semibold text-gray-800">Budget range (₹)</label>
                </div>
                <div className="flex gap-3 items-center">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">₹</span>
                    <input
                      type="number"
                      placeholder="Min"
                      value={form.budgetMin}
                      onChange={(e) => set("budgetMin", e.target.value)}
                      className={cn(INPUT_CLS, "pl-8 tabular-nums")}
                    />
                  </div>
                  <span className="text-gray-300 font-medium shrink-0">–</span>
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">₹</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={form.budgetMax}
                      onChange={(e) => set("budgetMax", e.target.value)}
                      className={cn(INPUT_CLS, "pl-8 tabular-nums")}
                    />
                  </div>
                </div>
              </div>

              {/* Deadline */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center">
                    <Clock className="w-3.5 h-3.5 text-[#1e40af]" />
                  </div>
                  <label className="text-sm font-semibold text-gray-800">When do you need it?</label>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {DEADLINES.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => set("deadlinePreference", value)}
                      className={cn(
                        "text-sm py-2 px-4 rounded-xl border transition-colors",
                        form.deadlinePreference === value
                          ? "bg-[#1e40af]/10 border-[#1e40af]/40 text-[#1e40af] font-semibold"
                          : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reference URL */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center">
                    <LinkIcon className="w-3.5 h-3.5 text-[#1e40af]" />
                  </div>
                  <label className="text-sm font-semibold text-gray-800">
                    Reference video{" "}
                    <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                </div>
                <input
                  type="url"
                  placeholder="https://youtube.com/watch?v=…"
                  value={form.referenceUrl}
                  onChange={(e) => set("referenceUrl", e.target.value)}
                  className={INPUT_CLS}
                />
              </div>

              {/* Info banner */}
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 flex items-start gap-2">
                <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                The editor will reply with a fixed price within 48 hours. You only pay after you accept their offer.
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-white text-sm bg-[#1e40af] hover:bg-brand-primary transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <SendHorizonal className="w-4 h-4" />
                    Send Quote Request
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

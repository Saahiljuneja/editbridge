"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { MessageSquare, X } from "lucide-react";

const COLOR = "#0EA5E9";

const VIDEO_TYPES = [
  { value: "youtube", label: "YouTube Video" },
  { value: "reels", label: "Reels / Shorts" },
  { value: "wedding", label: "Wedding & Events" },
  { value: "corporate", label: "Corporate / Brand" },
  { value: "music", label: "Music Video" },
  { value: "podcast", label: "Podcast / Talking Head" },
  { value: "travel", label: "Travel / Vlog" },
  { value: "gaming", label: "Gaming" },
  { value: "other", label: "Other" },
];

const DEADLINES = [
  { value: "1-3 days", label: "1–3 days" },
  { value: "1 week", label: "1 week" },
  { value: "2 weeks", label: "2 weeks" },
  { value: "flexible", label: "Flexible" },
];

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
    setForm(prev => ({ ...prev, [field]: value }));
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

      toast.success("Quote request sent! Editor will respond within 48 hours.");
      setOpen(false);
      router.push("/quotes");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full justify-center px-4 py-3 rounded-xl border-2 font-semibold text-sm transition-colors hover:bg-sky-50"
        style={{ borderColor: COLOR, color: COLOR }}>
        <MessageSquare className="w-4 h-4" />
        Request a Quote
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Request a Custom Quote</h2>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
              {/* Video type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">What type of video?</label>
                <div className="grid grid-cols-3 gap-2">
                  {VIDEO_TYPES.map(({ value, label }) => (
                    <button key={value} type="button"
                      onClick={() => set("videoType", value)}
                      className="text-xs py-2 px-2 rounded-lg border transition-colors text-center"
                      style={form.videoType === value
                        ? { background: `${COLOR}15`, borderColor: COLOR, color: COLOR, fontWeight: 600 }
                        : { borderColor: "#E5E7EB", color: "#374151" }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brief */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Describe what you need <span className="text-gray-400 font-normal">(min 20 chars)</span>
                </label>
                <textarea
                  value={form.brief}
                  onChange={e => set("brief", e.target.value)}
                  rows={4}
                  placeholder="Explain your video concept, style preferences, references, and anything important..."
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2"
                  style={{ "--tw-ring-color": COLOR } as React.CSSProperties}
                />
                <p className="text-xs text-gray-400 mt-1">{form.brief.length} / 2000</p>
              </div>

              {/* Budget */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Budget range (₹)</label>
                <div className="flex gap-3">
                  <input type="number" placeholder="Min (e.g. 500)"
                    value={form.budgetMin}
                    onChange={e => set("budgetMin", e.target.value)}
                    className="flex-1 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2"
                    style={{ "--tw-ring-color": COLOR } as React.CSSProperties}
                  />
                  <span className="self-center text-gray-400">–</span>
                  <input type="number" placeholder="Max (e.g. 2000)"
                    value={form.budgetMax}
                    onChange={e => set("budgetMax", e.target.value)}
                    className="flex-1 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2"
                    style={{ "--tw-ring-color": COLOR } as React.CSSProperties}
                  />
                </div>
              </div>

              {/* Deadline */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">When do you need it?</label>
                <div className="flex gap-2 flex-wrap">
                  {DEADLINES.map(({ value, label }) => (
                    <button key={value} type="button"
                      onClick={() => set("deadlinePreference", value)}
                      className="text-sm py-1.5 px-3.5 rounded-xl border transition-colors"
                      style={form.deadlinePreference === value
                        ? { background: `${COLOR}15`, borderColor: COLOR, color: COLOR, fontWeight: 600 }
                        : { borderColor: "#E5E7EB", color: "#374151" }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Reference video <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input type="url" placeholder="https://youtube.com/watch?v=..."
                  value={form.referenceUrl}
                  onChange={e => set("referenceUrl", e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2"
                  style={{ "--tw-ring-color": COLOR } as React.CSSProperties}
                />
              </div>

              <div className="pt-1 text-xs text-gray-400 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                The editor will reply with a fixed price within 48 hours. You only pay after you accept their offer.
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-60 transition-opacity"
                style={{ background: COLOR }}>
                {loading ? "Sending..." : "Send Quote Request"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

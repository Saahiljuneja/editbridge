"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Film,
  Zap,
  Layers,
  Activity,
  Heart,
  Flame,
  Smile,
  Music,
  Palette,
  Link2,
  AlignLeft,
  Ban,
  FileText,
  ArrowRight,
  Loader2,
  CreditCard,
  Check,
  Plus,
  X,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, displayNameFromFull } from "@/lib/utils";
import { cn } from "@/lib/utils";

type BriefTemplate = { id: string; name: string; content: string };

type Props = {
  pkg: {
    id: string;
    title: string;
    description: string;
    price: number;
    deliveryDays: number;
    revisionCount: number;
    editorName: string;
    editorId: string;
    includesSourceFiles?: boolean;
    includesCommercialRights?: boolean;
  };
  availableCredits: number;
};

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

const MOOD_CONFIG: Record<string, { label: string; Icon: LucideIcon }> = {
  cinematic:  { label: "Cinematic",  Icon: Film },
  fast_paced: { label: "Fast-paced", Icon: Zap },
  minimal:    { label: "Minimal",    Icon: Layers },
  energetic:  { label: "Energetic",  Icon: Activity },
  emotional:  { label: "Emotional",  Icon: Heart },
  hype:       { label: "Hype",       Icon: Flame },
  funny:      { label: "Funny",      Icon: Smile },
};

const MOODS = Object.keys(MOOD_CONFIG) as (keyof typeof MOOD_CONFIG)[];

export default function CheckoutForm({ pkg, availableCredits }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [savedTemplates, setSavedTemplates] = useState<BriefTemplate[]>([]);

  const [moods, setMoods] = useState<string[]>(["cinematic"]);
  const [musicPref, setMusicPref] = useState("editor_choice");
  const [colorLook, setColorLook] = useState("neutral");
  const [referenceUrls, setReferenceUrls] = useState<string[]>([""]);
  const [mustInclude, setMustInclude] = useState("");
  const [mustAvoid, setMustAvoid] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  const [useCredits, setUseCredits] = useState(false);
  const [rewardDiscount] = useState(0);

  const [addOns, setAddOns] = useState({
    extraFast: false,
    extraRevision: false,
    sourceFiles: false,
    commercialRights: false,
  });

  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");

  useEffect(() => {
    fetch("/api/brief-templates")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { if (Array.isArray(data)) setSavedTemplates(data); })
      .catch(() => {})
      .finally(() => setInitLoading(false));
  }, []);

  const handleMoodToggle = (m: string) => {
    setMoods((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  };

  const handleAddUrl = () => {
    if (referenceUrls.length < 5) setReferenceUrls([...referenceUrls, ""]);
  };

  const handleUrlChange = (idx: number, val: string) => {
    const next = [...referenceUrls];
    next[idx] = val;
    setReferenceUrls(next);
  };

  const handleRemoveUrl = (idx: number) => {
    setReferenceUrls(referenceUrls.filter((_, i) => i !== idx));
  };

  const handleSelectTemplate = (content: string) => {
    setAdditionalNotes(content);
    toast.success("Template loaded into notes.");
  };

  const addOnsCost =
    (addOns.extraFast ? 150000 : 0) +
    (addOns.extraRevision ? 50000 : 0) +
    (addOns.sourceFiles ? 100000 : 0) +
    (addOns.commercialRights ? 75000 : 0);

  const processingFeePct = 2;
  const subtotal = pkg.price + addOnsCost;
  const processingFee = Math.round(subtotal * (processingFeePct / 100));
  const fullTotal = subtotal + processingFee;
  const creditsApplied = useCredits ? Math.min(availableCredits, fullTotal - 100) : 0;
  const chargeAmount = fullTotal - creditsApplied;

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (moods.length === 0) {
      toast.error("Please select at least one vibe.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: pkg.id,
          useCredits,
          rewardDiscountAmount: rewardDiscount,
          options: addOns,
        }),
      });
      const orderData = await res.json();
      if (!res.ok) throw new Error(orderData.error ?? "Failed to create order");

      await new Promise<void>((resolve, reject) => {
        if (window.Razorpay) { resolve(); return; }
        const s = document.createElement("script");
        s.src = "https://checkout.razorpay.com/v1/checkout.js";
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Failed to load payment gateway"));
        document.body.appendChild(s);
      });

      const cleanUrls = referenceUrls.filter((u) => u.trim() !== "");
      const briefData = {
        mood: moods,
        musicPreference: musicPref,
        colorLook,
        referenceUrls: cleanUrls,
        mustInclude,
        mustAvoid,
        additionalNotes,
        customAddons: addOns,
      };

      const rz = new window.Razorpay({
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.razorpayOrderId,
        name: "EditBridge",
        description: `Order — ${pkg.title}`,
        handler: async (response: Record<string, string>) => {
          try {
            const verifyRes = await fetch("/api/orders/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                packageId: pkg.id,
                briefData,
                creditApplied: orderData.creditApplied ?? 0,
                rewardDiscountAmount: orderData.rewardDiscountAmount ?? 0,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error ?? "Payment verification failed");

            if (saveAsTemplate && templateName.trim()) {
              const lines: string[] = [];
              if (moods.length) lines.push(`Moods: ${moods.join(", ")}`);
              if (musicPref) lines.push(`Music: ${musicPref}`);
              if (colorLook) lines.push(`Color: ${colorLook}`);
              if (cleanUrls.length) lines.push(`References:\n${cleanUrls.map((u) => `  - ${u}`).join("\n")}`);
              if (mustInclude) lines.push(`Must include: ${mustInclude}`);
              if (mustAvoid) lines.push(`Must avoid: ${mustAvoid}`);
              if (additionalNotes) lines.push(`Notes: ${additionalNotes}`);
              await fetch("/api/brief-templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: templateName.trim(), content: lines.join("\n") }),
              }).catch(() => {});
            }

            toast.success("Order confirmed!");
            router.push(`/checkout/${pkg.id}/success`);
          } catch (verifyErr) {
            toast.error(verifyErr instanceof Error ? verifyErr.message : "Verification failed");
          }
        },
        prefill: {},
        theme: { color: "#0EA5E9" },
      });
      rz.open();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (initLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header with visual step indicator */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href={`/editor/${pkg.editorId}`}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Cancel
          </Link>

          {/* Step circles */}
          <div className="flex items-center gap-3">
            {/* Step 1 */}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                  step === 1
                    ? "bg-[#0EA5E9] text-white"
                    : "bg-emerald-500 text-white"
                )}
              >
                {step === 1 ? "1" : <Check className="w-3.5 h-3.5" />}
              </div>
              <span
                className={cn(
                  "text-xs font-semibold hidden sm:block",
                  step === 1 ? "text-[#0EA5E9]" : "text-emerald-600"
                )}
              >
                Project Brief
              </span>
            </div>

            {/* Connector */}
            <div
              className={cn(
                "w-12 h-px transition-colors",
                step === 2 ? "bg-[#0EA5E9]" : "bg-gray-200"
              )}
            />

            {/* Step 2 */}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                  step === 2
                    ? "bg-[#0EA5E9] text-white"
                    : "bg-gray-200 text-gray-400"
                )}
              >
                2
              </div>
              <span
                className={cn(
                  "text-xs font-semibold hidden sm:block",
                  step === 2 ? "text-[#0EA5E9]" : "text-gray-400"
                )}
              >
                Confirm &amp; Pay
              </span>
            </div>
          </div>

          {/* Spacer to balance layout */}
          <div className="w-16" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 grid md:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="md:col-span-2 space-y-5">
          {step === 1 ? (
            <div className="space-y-5">
              {/* Templates */}
              {savedTemplates.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500 min-w-0">
                    <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="truncate">Load a saved brief template</span>
                  </div>
                  <select
                    onChange={(e) => handleSelectTemplate(e.target.value)}
                    defaultValue=""
                    className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 shrink-0"
                  >
                    <option value="" disabled>Select template…</option>
                    {savedTemplates.map((t) => (
                      <option key={t.id} value={t.content}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Vibe & Style */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center">
                    <Film className="w-3.5 h-3.5 text-[#0EA5E9]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Vibe &amp; Style</h3>
                    <p className="text-xs text-gray-400">Pick all that apply</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {MOODS.map((m) => {
                    const { label, Icon } = MOOD_CONFIG[m];
                    const active = moods.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleMoodToggle(m)}
                        className={cn(
                          "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all",
                          active
                            ? "bg-[#0EA5E9]/10 border-[#0EA5E9] text-[#0EA5E9] shadow-sm"
                            : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                      </button>
                    );
                  })}
                </div>
                {moods.length === 0 && (
                  <p className="text-xs text-red-500">Select at least one vibe.</p>
                )}
              </div>

              {/* Music & Color */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                        <Music className="w-3.5 h-3.5 text-violet-500" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900">Music preference</h3>
                    </div>
                    <select
                      value={musicPref}
                      onChange={(e) => setMusicPref(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9]/50"
                    >
                      <option value="upbeat">Upbeat &amp; fast</option>
                      <option value="lofi">Lo-fi &amp; chill</option>
                      <option value="editor_choice">Editor&apos;s choice</option>
                      <option value="client_provides">I will provide music</option>
                      <option value="no_music">No background music</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                        <Palette className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900">Color grading</h3>
                    </div>
                    <select
                      value={colorLook}
                      onChange={(e) => setColorLook(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9]/50"
                    >
                      <option value="neutral">Neutral &amp; clean</option>
                      <option value="bright">Bright &amp; vibrant</option>
                      <option value="moody">Moody &amp; cinematic</option>
                      <option value="warm">Warm tone</option>
                      <option value="cold">Cool tone</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Reference URLs */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center">
                    <Link2 className="w-3.5 h-3.5 text-[#0EA5E9]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Reference videos</h3>
                    <p className="text-xs text-gray-400">YouTube, Vimeo, or Drive links (optional, up to 5)</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {referenceUrls.map((url, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        value={url}
                        onChange={(e) => handleUrlChange(idx, e.target.value)}
                        placeholder="https://youtube.com/watch?v=..."
                        className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9]/50"
                      />
                      {referenceUrls.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveUrl(idx)}
                          className="w-10 h-10 flex items-center justify-center border border-gray-200 hover:border-red-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0"
                          aria-label="Remove"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {referenceUrls.length < 5 && (
                    <button
                      type="button"
                      onClick={handleAddUrl}
                      className="flex items-center gap-1.5 text-xs font-semibold text-[#0EA5E9] hover:text-sky-700 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add another link
                    </button>
                  )}
                </div>
              </div>

              {/* Must Include / Avoid / Notes */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                    <AlignLeft className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">Specific instructions</h3>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                    <Check className="w-3 h-3 text-emerald-500" /> Must include (optional)
                  </label>
                  <textarea
                    value={mustInclude}
                    onChange={(e) => setMustInclude(e.target.value)}
                    placeholder="Specific sound effects, intros, lower thirds..."
                    maxLength={500}
                    rows={2}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9]/50"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                    <Ban className="w-3 h-3 text-red-400" /> Must avoid (optional)
                  </label>
                  <textarea
                    value={mustAvoid}
                    onChange={(e) => setMustAvoid(e.target.value)}
                    placeholder="Certain transitions, copyright tracks, fast zooms..."
                    maxLength={500}
                    rows={2}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9]/50"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                    <FileText className="w-3 h-3 text-gray-400" /> Additional instructions
                  </label>
                  <textarea
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    placeholder="Describe your timeline flow, pacing, custom text, or anything else your editor should know..."
                    maxLength={1000}
                    rows={4}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9]/50"
                  />
                  <p className="text-[10px] text-gray-400 text-right mt-1">
                    {additionalNotes.length}/1000
                  </p>
                </div>
              </div>

              {/* Customize Your Package Add-ons */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                    <Plus className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Gig Add-ons (Customizations)</h3>
                    <p className="text-xs text-gray-400">Tailor the editor's service to your exact needs</p>
                  </div>
                </div>
                
                <div className="space-y-3 pt-1">
                  {/* Extra Fast Delivery */}
                  {pkg.deliveryDays > 1 && (
                    <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-sky-100 bg-gray-50/30 hover:bg-sky-50/10 cursor-pointer select-none transition-all">
                      <input
                        type="checkbox"
                        checked={addOns.extraFast}
                        onChange={(e) => setAddOns(prev => ({ ...prev, extraFast: e.target.checked }))}
                        className="rounded border-gray-300 text-[#0EA5E9] focus:ring-[#0EA5E9] w-4 h-4 mt-0.5 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline gap-2">
                          <span className="text-xs font-bold text-gray-950">⚡ Extra Fast Delivery</span>
                          <span className="text-xs font-extrabold text-[#0EA5E9] shrink-0">+₹1,500</span>
                        </div>
                        <p className="text-[11px] text-gray-550 mt-1">
                          Reduces delivery deadline by 2 days (minimum 1 day). Delivery in {Math.max(1, pkg.deliveryDays - 2)} days.
                        </p>
                      </div>
                    </label>
                  )}

                  {/* Additional Revision */}
                  {pkg.revisionCount !== -1 && (
                    <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-sky-100 bg-gray-50/30 hover:bg-sky-50/10 cursor-pointer select-none transition-all">
                      <input
                        type="checkbox"
                        checked={addOns.extraRevision}
                        onChange={(e) => setAddOns(prev => ({ ...prev, extraRevision: e.target.checked }))}
                        className="rounded border-gray-300 text-[#0EA5E9] focus:ring-[#0EA5E9] w-4 h-4 mt-0.5 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline gap-2">
                          <span className="text-xs font-bold text-gray-950">🔄 Additional Revision Round</span>
                          <span className="text-xs font-extrabold text-[#0EA5E9] shrink-0">+₹500</span>
                        </div>
                        <p className="text-[11px] text-gray-550 mt-1">
                          Add +1 extra revision round to your package. Total revisions: {pkg.revisionCount + 1}.
                        </p>
                      </div>
                    </label>
                  )}

                  {/* Source Files */}
                  {!pkg.includesSourceFiles && (
                    <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-sky-100 bg-gray-50/30 hover:bg-sky-50/10 cursor-pointer select-none transition-all">
                      <input
                        type="checkbox"
                        checked={addOns.sourceFiles}
                        onChange={(e) => setAddOns(prev => ({ ...prev, sourceFiles: e.target.checked }))}
                        className="rounded border-gray-300 text-[#0EA5E9] focus:ring-[#0EA5E9] w-4 h-4 mt-0.5 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline gap-2">
                          <span className="text-xs font-bold text-gray-950">📦 Source Files Upgrade</span>
                          <span className="text-xs font-extrabold text-[#0EA5E9] shrink-0">+₹1,000</span>
                        </div>
                        <p className="text-[11px] text-gray-550 mt-1">
                          Receive raw project assets (Premiere/After Effects files) upon completion.
                        </p>
                      </div>
                    </label>
                  )}

                  {/* Commercial Rights */}
                  {!pkg.includesCommercialRights && (
                    <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-sky-100 bg-gray-50/30 hover:bg-sky-50/10 cursor-pointer select-none transition-all">
                      <input
                        type="checkbox"
                        checked={addOns.commercialRights}
                        onChange={(e) => setAddOns(prev => ({ ...prev, commercialRights: e.target.checked }))}
                        className="rounded border-gray-300 text-[#0EA5E9] focus:ring-[#0EA5E9] w-4 h-4 mt-0.5 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline gap-2">
                          <span className="text-xs font-bold text-gray-950">💼 Commercial Use License</span>
                          <span className="text-xs font-extrabold text-[#0EA5E9] shrink-0">+₹750</span>
                        </div>
                        <p className="text-[11px] text-gray-550 mt-1">
                          Grants full commercial rights for promotional, advertising, or business use.
                        </p>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              {/* Save as template */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={saveAsTemplate}
                    onChange={(e) => setSaveAsTemplate(e.target.checked)}
                    className="rounded border-gray-300 text-[#0EA5E9] focus:ring-[#0EA5E9] w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Save this brief as a reusable template
                  </span>
                </label>
                {saveAsTemplate && (
                  <input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder='e.g. "Gaming Highlight Montage"'
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20"
                  />
                )}
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full py-3.5 rounded-xl font-semibold text-white text-sm bg-[#0EA5E9] hover:bg-sky-600 flex items-center justify-center gap-2 transition-colors"
              >
                Proceed to Payment <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Credits banner */}
              {availableCredits > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-emerald-800">
                        {formatCurrency(availableCredits)} in credits available
                      </p>
                      <p className="text-xs text-emerald-600 mt-0.5">
                        Apply to reduce your charge
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUseCredits(!useCredits)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-semibold border transition-all",
                        useCredits
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      )}
                    >
                      {useCredits ? (
                        <span className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5" /> Applied
                        </span>
                      ) : (
                        "Apply Credits"
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Pricing breakdown */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <h2 className="text-sm font-bold text-gray-900">Order Summary</h2>
                </div>
                <form onSubmit={handleCheckout}>
                  <div className="px-5 py-4 space-y-3 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Package subtotal</span>
                      <span className="tabular-nums">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Processing fee ({processingFeePct}%)</span>
                      <span className="tabular-nums">{formatCurrency(processingFee)}</span>
                    </div>
                    {creditsApplied > 0 && (
                      <div className="flex justify-between text-emerald-700 font-medium">
                        <span>Credits applied</span>
                        <span className="tabular-nums">−{formatCurrency(creditsApplied)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-100 pt-3">
                      <span>Total charge</span>
                      <span className="tabular-nums text-[#0EA5E9]">{formatCurrency(chargeAmount)}</span>
                    </div>
                  </div>

                  <div className="px-5 pb-5 flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      disabled={loading}
                      className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-semibold text-gray-600 transition-colors disabled:opacity-50"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-3.5 rounded-xl font-semibold text-white text-sm bg-[#0EA5E9] hover:bg-sky-600 flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
                    >
                      {loading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                      ) : (
                        <><CreditCard className="w-4 h-4" /> Pay {formatCurrency(chargeAmount)} &amp; Start Order</>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Package summary sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-6">
            <div className="bg-gradient-to-br from-[#0EA5E9]/8 to-sky-50 px-5 py-4 border-b border-gray-100">
              <p className="text-[10px] font-semibold text-[#0EA5E9] uppercase tracking-widest mb-1">
                Your Order
              </p>
              <p className="font-bold text-gray-900 text-sm leading-snug">{pkg.title}</p>
            </div>
            <div className="px-5 py-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Editor</span>
                <span className="font-semibold text-gray-900">{displayNameFromFull(pkg.editorName)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Delivery</span>
                <span className="font-semibold text-gray-900">
                  {addOns.extraFast ? Math.max(1, pkg.deliveryDays - 2) : pkg.deliveryDays} days
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Revisions</span>
                <span className="font-semibold text-gray-900">
                  {pkg.revisionCount === -1 ? "Unlimited" : `${pkg.revisionCount + (addOns.extraRevision ? 1 : 0)} rounds`}
                </span>
              </div>
              <div className="border-t border-gray-100 pt-3 flex justify-between">
                <span className="text-gray-400">Package price</span>
                <span className="font-bold text-gray-900 tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
            </div>
            {pkg.description && (
              <div className="px-5 pb-4">
                <p className="text-xs text-gray-400 line-clamp-3">{pkg.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Film, Zap, Layers, Activity, Heart, Flame, Smile,
  Music, Palette, Link2, AlignLeft, Ban, FileText,
  ArrowRight, Loader2, CreditCard, Check, Plus, X,
  ArrowLeft, RotateCcw, Package2, Building2, Shield,
  Lock, Clock, RefreshCw, BookmarkPlus, CheckCircle2,
  Star, Users,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, displayNameFromFull, cn } from "@/lib/utils";

const ADDON_DISPLAY: Record<string, string> = {
  color_grading: "Color Grading", color_correction: "Color Correction",
  sound_design: "Sound Design", audio_cleanup: "Audio Cleanup",
  background_music: "Background Music", captions: "Captions / Subtitles",
  thumbnail: "Thumbnail Design", motion_graphics: "Motion Graphics",
  intro_outro: "Intro / Outro", lower_thirds: "Lower Thirds",
  social_media_cuts: "Social Media Cuts", speed_ramps: "Speed Ramps",
  green_screen: "Green Screen Removal",
};

type BriefTemplate = { id: string; name: string; content: string };

type Props = {
  pkg: {
    id: string;
    tier?: string | null;
    title: string;
    description: string;
    price: number;
    deliveryDays: number;
    revisionCount: number;
    videoLengthLimit?: string | null;
    videoCount?: number | null;
    resolution?: string | null;
    maxRawFootage?: string | null;
    aspectRatios?: string[];
    addons?: string[];
    softwareUsed?: string[];
    deliveryFormats?: string[];
    includesSourceFiles?: boolean;
    includesCommercialRights?: boolean;
    editorName: string;
    editorId: string;
  };
  availableCredits: number;
  processingFeePct?: number;
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

const MUSIC_OPTIONS: { value: string; label: string; sub: string }[] = [
  { value: "upbeat",          label: "Upbeat",          sub: "Fast & energetic" },
  { value: "lofi",            label: "Lo-fi",           sub: "Chill & relaxed" },
  { value: "editor_choice",   label: "Editor's pick",   sub: "Trust the editor" },
  { value: "client_provides", label: "I'll provide",    sub: "Custom track" },
  { value: "no_music",        label: "No music",        sub: "Silent edit" },
];

const COLOR_OPTIONS: { value: string; label: string; dot: string; sub: string }[] = [
  { value: "neutral", label: "Neutral",  dot: "bg-gray-400",   sub: "Clean & balanced" },
  { value: "bright",  label: "Bright",   dot: "bg-yellow-400", sub: "Vivid & punchy" },
  { value: "moody",   label: "Moody",    dot: "bg-indigo-500", sub: "Dark & cinematic" },
  { value: "warm",    label: "Warm",     dot: "bg-orange-400", sub: "Golden tones" },
  { value: "cold",    label: "Cold",     dot: "bg-sky-400",    sub: "Cool & crisp" },
];

export default function CheckoutForm({ pkg, availableCredits, processingFeePct = 10 }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
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

  const draftKey = `checkout-draft-${pkg.id}`;

  useEffect(() => {
    fetch("/api/brief-templates")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { if (Array.isArray(data)) setSavedTemplates(data); })
      .catch(() => {})
      .finally(() => {
        const raw = localStorage.getItem(draftKey);
        if (raw) {
          try {
            const d = JSON.parse(raw);
            if (Array.isArray(d.moods) && d.moods.length) setMoods(d.moods);
            if (d.musicPref) setMusicPref(d.musicPref);
            if (d.colorLook) setColorLook(d.colorLook);
            if (Array.isArray(d.referenceUrls) && d.referenceUrls.length) setReferenceUrls(d.referenceUrls);
            if (d.mustInclude !== undefined) setMustInclude(d.mustInclude);
            if (d.mustAvoid !== undefined) setMustAvoid(d.mustAvoid);
            if (d.additionalNotes !== undefined) setAdditionalNotes(d.additionalNotes);
            if (d.addOns) setAddOns(d.addOns);
            toast("Draft restored", { description: "Your previous brief was saved." });
          } catch { /* ignore */ }
        }
        setInitLoading(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (initLoading) return;
    localStorage.setItem(draftKey, JSON.stringify({
      moods, musicPref, colorLook, referenceUrls, mustInclude, mustAvoid, additionalNotes, addOns,
    }));
  }, [moods, musicPref, colorLook, referenceUrls, mustInclude, mustAvoid, additionalNotes, addOns, initLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMoodToggle = (m: string) => {
    setMoods((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);
  };
  const handleAddUrl = () => { if (referenceUrls.length < 5) setReferenceUrls([...referenceUrls, ""]); };
  const handleUrlChange = (idx: number, val: string) => { const next = [...referenceUrls]; next[idx] = val; setReferenceUrls(next); };
  const handleRemoveUrl = (idx: number) => { setReferenceUrls(referenceUrls.filter((_, i) => i !== idx)); };

  const handleSelectTemplate = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === "object") {
        if (Array.isArray(parsed.moods) && parsed.moods.length) setMoods(parsed.moods);
        if (parsed.musicPreference) setMusicPref(parsed.musicPreference);
        if (parsed.colorLook) setColorLook(parsed.colorLook);
        if (Array.isArray(parsed.referenceUrls) && parsed.referenceUrls.length) setReferenceUrls(parsed.referenceUrls);
        if (parsed.mustInclude !== undefined) setMustInclude(parsed.mustInclude);
        if (parsed.mustAvoid !== undefined) setMustAvoid(parsed.mustAvoid);
        if (parsed.additionalNotes !== undefined) setAdditionalNotes(parsed.additionalNotes);
        toast.success("Template loaded — all fields restored.");
        return;
      }
    } catch { /* Legacy plain-text template */ }
    setAdditionalNotes(content);
    toast.success("Template loaded into notes.");
  };

  const addOnsCost =
    (addOns.extraFast ? 150000 : 0) +
    (addOns.extraRevision ? 50000 : 0) +
    (addOns.sourceFiles ? 100000 : 0) +
    (addOns.commercialRights ? 75000 : 0);

  const subtotal = pkg.price + addOnsCost;
  const processingFee = Math.round(subtotal * (processingFeePct / 100));
  const fullTotal = subtotal + processingFee;
  const creditsApplied = useCredits ? Math.min(availableCredits, fullTotal - 100) : 0;
  const chargeAmount = fullTotal - creditsApplied;

  async function submitOrder() {
    if (moods.length === 0) { toast.error("Please select at least one vibe."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: pkg.id, useCredits, rewardDiscountAmount: rewardDiscount, options: addOns }),
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
      const briefData = { mood: moods, musicPreference: musicPref, colorLook, referenceUrls: cleanUrls, mustInclude, mustAvoid, additionalNotes, customAddons: addOns };

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
                packageId: pkg.id, briefData,
                creditApplied: orderData.creditApplied ?? 0,
                rewardDiscountAmount: orderData.rewardDiscountAmount ?? 0,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error ?? "Payment verification failed");

            if (saveAsTemplate && templateName.trim()) {
              const templateContent = JSON.stringify({ moods, musicPreference: musicPref, colorLook, referenceUrls: cleanUrls, mustInclude, mustAvoid, additionalNotes });
              await fetch("/api/brief-templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: templateName.trim(), content: templateContent }) }).catch(() => {});
            }

            localStorage.removeItem(draftKey);
            toast.success("Order confirmed!");
            router.push(`/checkout/${pkg.id}/success`);
          } catch (verifyErr) {
            toast.error(verifyErr instanceof Error ? verifyErr.message : "Verification failed");
          }
        },
        prefill: {},
        theme: { color: "#1e40af" },
      });
      rz.open();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    await submitOrder();
  }

  function goNext() {
    if (step === 0) { setStep(1); window.scrollTo({ top: 0, behavior: "smooth" }); }
    else if (step === 1) { if (moods.length === 0) { toast.error("Select at least one vibe first."); return; } setStep(2); window.scrollTo({ top: 0, behavior: "smooth" }); }
    else if (step === 2) { submitOrder(); }
  }

  if (initLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
      </div>
    );
  }

  const musicLabel = MUSIC_OPTIONS.find(o => o.value === musicPref)?.label ?? musicPref;
  const colorLabel = COLOR_OPTIONS.find(o => o.value === colorLook)?.label ?? colorLook;
  const colorDot   = COLOR_OPTIONS.find(o => o.value === colorLook)?.dot ?? "bg-gray-400";
  const cleanRefUrls = referenceUrls.filter(u => u.trim() !== "");

  const inclusions = [
    ...(pkg.includesSourceFiles ? ["Source files included"] : []),
    ...(pkg.includesCommercialRights ? ["Commercial rights"] : []),
    ...(pkg.addons ?? []).map(a => ADDON_DISPLAY[a] ?? a.replace(/_/g, " ")),
  ];

  const activeAddOnLabels = [
    addOns.extraFast && "Fast delivery",
    addOns.extraRevision && "Extra revision",
    addOns.sourceFiles && "Source files",
    addOns.commercialRights && "Commercial rights",
  ].filter(Boolean) as string[];

  const STEP_LABELS = ["Package Details", "Project Brief", "Confirm & Pay"];

  return (
    <div className="min-h-screen bg-[#f8f9fb] pb-24 md:pb-16">

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          {/* Back */}
          {step === 0 ? (
            <Link href={`/editor/${pkg.editorId}`} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-900 transition-colors font-medium shrink-0">
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
          ) : (
            <button type="button" onClick={() => { setStep(s => s - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-900 transition-colors font-medium shrink-0">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}

          {/* Step indicator */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {STEP_LABELS.map((label, i) => (
              <div key={i} className="flex items-center gap-1.5">
                {i > 0 && (
                  <div className="relative w-6 sm:w-10 h-px bg-gray-200 overflow-hidden">
                    <div className={cn("absolute inset-y-0 left-0 bg-[#1e40af] transition-all duration-500", step > i - 1 ? "w-full" : "w-0")} />
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <div className={cn(
                    "w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold transition-all shrink-0",
                    step === i ? "bg-[#1e40af] text-white shadow-sm shadow-blue-200"
                      : step > i ? "bg-emerald-500 text-white"
                      : "bg-gray-100 text-gray-400"
                  )}>
                    {step > i ? <Check className="w-3 h-3" /> : i + 1}
                  </div>
                  <span className={cn("text-[10px] sm:text-xs font-semibold hidden sm:block",
                    step === i ? "text-[#1e40af]" : step > i ? "text-emerald-600" : "text-gray-400")}>
                    {label}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="w-12 shrink-0" />
        </div>

        {/* Progress bar */}
        <div className="h-[2px] bg-gray-100">
          <div className={cn("h-full bg-[#1e40af] transition-all duration-500",
            step === 0 ? "w-1/3" : step === 1 ? "w-2/3" : "w-full")} />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 grid md:grid-cols-3 gap-5 lg:gap-8 items-start">

        {/* ── Main content ── */}
        <div className="md:col-span-2 space-y-4">

          {/* ─────────── STEP 0: Package Overview ─────────── */}
          {step === 0 && (
            <div className="space-y-4">

              {/* Combined package card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Hero */}
                <div className="bg-gray-950 px-6 py-6">
                  {pkg.tier && (
                    <span className="inline-block text-[9px] font-extrabold uppercase tracking-widest text-blue-400 border border-blue-400/30 bg-blue-400/10 px-2 py-0.5 rounded-full mb-2">{pkg.tier}</span>
                  )}
                  <h2 className="font-black text-white text-xl leading-tight mb-2">{pkg.title}</h2>
                  <p className="text-sm text-gray-400 leading-relaxed">{pkg.description}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">
                      {(pkg.price / 100).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-xs text-gray-500 font-medium">/ project</span>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-gray-100">
                  {[
                    { icon: "🚚", label: "Delivery", value: `${pkg.deliveryDays} day${pkg.deliveryDays !== 1 ? "s" : ""}` },
                    { icon: "🔁", label: "Revisions", value: pkg.revisionCount === -1 ? "Unlimited" : `${pkg.revisionCount} round${pkg.revisionCount !== 1 ? "s" : ""}` },
                    ...(pkg.videoLengthLimit ? [{ icon: "⏱", label: "Length", value: pkg.videoLengthLimit }] : []),
                    ...((pkg.videoCount ?? 0) > 0 ? [{ icon: "🎬", label: "Videos", value: `${pkg.videoCount}` }] : []),
                    ...(pkg.resolution ? [{ icon: "🖥", label: "Resolution", value: pkg.resolution.toUpperCase() }] : []),
                    ...(pkg.maxRawFootage ? [{ icon: "📁", label: "Raw Footage", value: pkg.maxRawFootage }] : []),
                  ].map(s => (
                    <div key={s.label} className="bg-white px-4 py-3.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                        <span>{s.icon}</span>{s.label}
                      </p>
                      <p className="text-sm font-bold text-gray-900 mt-0.5">{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Pills + inclusions */}
                {((pkg.aspectRatios?.length ?? 0) > 0 || (pkg.softwareUsed?.length ?? 0) > 0 || (pkg.deliveryFormats?.length ?? 0) > 0 || inclusions.length > 0) && (
                  <div className="p-5 space-y-5 border-t border-gray-100">
                    {(pkg.aspectRatios?.length ?? 0) > 0 && (
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-2">Aspect Ratios</p>
                        <div className="flex flex-wrap gap-1.5">
                          {pkg.aspectRatios!.map(r => <span key={r} className="text-xs font-bold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">{r}</span>)}
                        </div>
                      </div>
                    )}
                    {(pkg.softwareUsed?.length ?? 0) > 0 && (
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-2">Software</p>
                        <div className="flex flex-wrap gap-1.5">
                          {pkg.softwareUsed!.map(s => <span key={s} className="text-xs font-bold bg-blue-50 text-[#1e40af] px-2.5 py-1 rounded-full">{s.replace(/_/g, " ")}</span>)}
                        </div>
                      </div>
                    )}
                    {(pkg.deliveryFormats?.length ?? 0) > 0 && (
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-2">Delivery Formats</p>
                        <div className="flex flex-wrap gap-1.5">
                          {pkg.deliveryFormats!.map(f => <span key={f} className="text-xs font-bold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">{f.replace(/_/g, " ").toUpperCase()}</span>)}
                        </div>
                      </div>
                    )}
                    {inclusions.length > 0 && (
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-3">What&apos;s Included</p>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {inclusions.map(f => (
                            <div key={f} className="flex items-center gap-2">
                              <span className="w-4.5 h-4.5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              </span>
                              <span className="text-sm font-semibold text-gray-700">{f}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Notice + CTA */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700 font-medium flex items-start gap-2">
                  <span className="shrink-0 mt-0.5">⚡</span>
                  <span>Review everything above before proceeding. Once payment is confirmed, the order cannot be cancelled without the editor&apos;s consent.</span>
                </div>
                <div className="hidden md:flex gap-3 pt-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
                    <Shield className="w-3 h-3 text-emerald-500" /> Escrow protected
                  </div>
                  <span className="text-gray-200">·</span>
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
                    <Lock className="w-3 h-3 text-gray-400" /> Secure payment
                  </div>
                  <span className="text-gray-200">·</span>
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
                    <Clock className="w-3 h-3 text-gray-400" /> Refund policy applies
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="hidden md:flex w-full py-3.5 rounded-xl font-bold text-white text-sm bg-[#1e40af] hover:bg-blue-800 items-center justify-center gap-2 transition-colors shadow-sm shadow-blue-200"
                >
                  Looks good — Continue to Brief <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ─────────── STEP 1: Project Brief ─────────── */}
          {step === 1 && (
            <div className="space-y-4">

              {/* Template loader */}
              {savedTemplates.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <BookmarkPlus className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-xs font-medium text-gray-500 truncate">Load a saved brief template</span>
                  </div>
                  <select
                    onChange={(e) => { handleSelectTemplate(e.target.value); e.target.value = ""; }}
                    defaultValue=""
                    className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1e40af]/20 shrink-0"
                  >
                    <option value="" disabled>Select template…</option>
                    {savedTemplates.map((t) => <option key={t.id} value={t.content}>{t.name}</option>)}
                  </select>
                </div>
              )}

              {/* Creative Direction */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 pt-5 pb-4 border-b border-gray-50 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Film className="w-3.5 h-3.5 text-[#1e40af]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Creative Direction</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">Vibe, music &amp; colour grading</p>
                  </div>
                </div>
                <div className="p-5 space-y-6">
                  {/* Vibes */}
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2.5">
                      Vibe &amp; mood <span className="text-gray-400 font-normal normal-case tracking-normal">(pick all that apply)</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {MOODS.map((m) => {
                        const { label, Icon } = MOOD_CONFIG[m];
                        const active = moods.includes(m);
                        return (
                          <button key={m} type="button" onClick={() => handleMoodToggle(m)}
                            className={cn("flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all",
                              active ? "bg-[#1e40af] border-[#1e40af] text-white shadow-sm shadow-blue-200" : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 bg-white")}>
                            <Icon className="w-3.5 h-3.5" />{label}
                          </button>
                        );
                      })}
                    </div>
                    {moods.length === 0 && <p className="text-xs text-red-500 mt-2">Select at least one vibe.</p>}
                  </div>

                  {/* Music */}
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
                      <Music className="w-3 h-3 text-violet-500" /> Music preference
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {MUSIC_OPTIONS.map((opt) => {
                        const active = musicPref === opt.value;
                        return (
                          <button key={opt.value} type="button" onClick={() => setMusicPref(opt.value)}
                            className={cn("flex flex-col items-start px-3.5 py-2.5 rounded-xl border text-left transition-all",
                              active ? "bg-violet-50 border-violet-300 text-violet-800" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50")}>
                            <span className="text-xs font-bold leading-none">{opt.label}</span>
                            <span className={cn("text-[10px] mt-0.5 font-medium", active ? "text-violet-600" : "text-gray-400")}>{opt.sub}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Color grading */}
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
                      <Palette className="w-3 h-3 text-amber-500" /> Color grading
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {COLOR_OPTIONS.map((opt) => {
                        const active = colorLook === opt.value;
                        return (
                          <button key={opt.value} type="button" onClick={() => setColorLook(opt.value)}
                            className={cn("flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-left transition-all",
                              active ? "bg-amber-50 border-amber-300 text-amber-800" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50")}>
                            <span className={cn("w-3 h-3 rounded-full shrink-0", opt.dot)} />
                            <div>
                              <span className="text-xs font-bold leading-none block">{opt.label}</span>
                              <span className={cn("text-[10px] mt-0.5 font-medium", active ? "text-amber-600" : "text-gray-400")}>{opt.sub}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Reference Videos */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 pt-5 pb-4 border-b border-gray-50 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
                    <Link2 className="w-3.5 h-3.5 text-sky-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Reference Videos</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">YouTube, Vimeo, or Drive links (optional · up to 5)</p>
                  </div>
                </div>
                <div className="p-5 space-y-2.5">
                  {referenceUrls.map((url, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input value={url} onChange={(e) => handleUrlChange(idx, e.target.value)}
                        placeholder="https://youtube.com/watch?v=..."
                        className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af]/50 bg-gray-50/50" />
                      {referenceUrls.length > 1 && (
                        <button type="button" onClick={() => handleRemoveUrl(idx)} aria-label="Remove"
                          className="w-10 h-10 flex items-center justify-center border border-gray-200 hover:border-red-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {referenceUrls.length < 5 && (
                    <button type="button" onClick={handleAddUrl}
                      className="flex items-center gap-1.5 text-xs font-semibold text-[#1e40af] hover:text-blue-900 transition-colors mt-1">
                      <Plus className="w-3.5 h-3.5" /> Add another link
                    </button>
                  )}
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 pt-5 pb-4 border-b border-gray-50 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <AlignLeft className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Specific Instructions</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">Tell the editor exactly what to include or avoid</p>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">
                      <Check className="w-3 h-3 text-emerald-500" /> Must include <span className="font-normal normal-case tracking-normal text-gray-400">(optional)</span>
                    </label>
                    <textarea value={mustInclude} onChange={(e) => setMustInclude(e.target.value)}
                      placeholder="Specific sound effects, intros, lower thirds..." maxLength={500} rows={2}
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af]/50 bg-gray-50/50" />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">
                      <Ban className="w-3 h-3 text-red-400" /> Must avoid <span className="font-normal normal-case tracking-normal text-gray-400">(optional)</span>
                    </label>
                    <textarea value={mustAvoid} onChange={(e) => setMustAvoid(e.target.value)}
                      placeholder="Certain transitions, copyright tracks, fast zooms..." maxLength={500} rows={2}
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af]/50 bg-gray-50/50" />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">
                      <FileText className="w-3 h-3 text-gray-400" /> Additional notes
                    </label>
                    <textarea value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)}
                      placeholder="Timeline flow, pacing, custom text overlays, anything else your editor should know..."
                      maxLength={1000} rows={4}
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af]/50 bg-gray-50/50" />
                    <div className="flex items-center justify-between mt-1.5">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" checked={saveAsTemplate} onChange={(e) => setSaveAsTemplate(e.target.checked)}
                          className="rounded border-gray-300 text-[#1e40af] focus:ring-[#1e40af] w-3.5 h-3.5" />
                        <span className="text-xs font-medium text-gray-500">Save as template</span>
                      </label>
                      <span className="text-[10px] text-gray-400">{additionalNotes.length}/1000</span>
                    </div>
                    {saveAsTemplate && (
                      <input value={templateName} onChange={(e) => setTemplateName(e.target.value)}
                        placeholder='Template name, e.g. "Gaming Highlight Montage"'
                        className="w-full mt-2 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e40af]/20 bg-gray-50/50" />
                    )}
                  </div>
                </div>
              </div>

              {/* Add-ons */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 pt-5 pb-4 border-b border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                      <Plus className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Add-ons</h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">Tailor the package to your exact needs</p>
                    </div>
                  </div>
                  {addOnsCost > 0 && (
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
                      +{formatCurrency(addOnsCost)}
                    </span>
                  )}
                </div>
                <div className="p-4 space-y-2.5">
                  {pkg.deliveryDays > 1 && (
                    <label className={cn("flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer select-none transition-all",
                      addOns.extraFast ? "bg-blue-50 border-blue-200" : "bg-gray-50/50 border-gray-100 hover:border-blue-100 hover:bg-blue-50/30")}>
                      <input type="checkbox" checked={addOns.extraFast} onChange={(e) => setAddOns(prev => ({ ...prev, extraFast: e.target.checked }))}
                        className="rounded border-gray-300 text-[#1e40af] focus:ring-[#1e40af] w-4 h-4 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline gap-2">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                            <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" /> Extra Fast Delivery
                          </span>
                          <span className="text-xs font-extrabold text-[#1e40af] shrink-0">+₹1,500</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1">Delivery in {Math.max(1, pkg.deliveryDays - 2)} days instead of {pkg.deliveryDays}.</p>
                      </div>
                    </label>
                  )}
                  {pkg.revisionCount !== -1 && (
                    <label className={cn("flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer select-none transition-all",
                      addOns.extraRevision ? "bg-blue-50 border-blue-200" : "bg-gray-50/50 border-gray-100 hover:border-blue-100 hover:bg-blue-50/30")}>
                      <input type="checkbox" checked={addOns.extraRevision} onChange={(e) => setAddOns(prev => ({ ...prev, extraRevision: e.target.checked }))}
                        className="rounded border-gray-300 text-[#1e40af] focus:ring-[#1e40af] w-4 h-4 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline gap-2">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                            <RotateCcw className="w-3.5 h-3.5 text-violet-500 shrink-0" /> Additional Revision Round
                          </span>
                          <span className="text-xs font-extrabold text-[#1e40af] shrink-0">+₹500</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1">+1 extra revision. Total: {pkg.revisionCount + 1} rounds.</p>
                      </div>
                    </label>
                  )}
                  {!pkg.includesSourceFiles && (
                    <label className={cn("flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer select-none transition-all",
                      addOns.sourceFiles ? "bg-blue-50 border-blue-200" : "bg-gray-50/50 border-gray-100 hover:border-blue-100 hover:bg-blue-50/30")}>
                      <input type="checkbox" checked={addOns.sourceFiles} onChange={(e) => setAddOns(prev => ({ ...prev, sourceFiles: e.target.checked }))}
                        className="rounded border-gray-300 text-[#1e40af] focus:ring-[#1e40af] w-4 h-4 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline gap-2">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                            <Package2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Source Files
                          </span>
                          <span className="text-xs font-extrabold text-[#1e40af] shrink-0">+₹1,000</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1">Receive raw project files (Premiere / After Effects) on completion.</p>
                      </div>
                    </label>
                  )}
                  {!pkg.includesCommercialRights && (
                    <label className={cn("flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer select-none transition-all",
                      addOns.commercialRights ? "bg-blue-50 border-blue-200" : "bg-gray-50/50 border-gray-100 hover:border-blue-100 hover:bg-blue-50/30")}>
                      <input type="checkbox" checked={addOns.commercialRights} onChange={(e) => setAddOns(prev => ({ ...prev, commercialRights: e.target.checked }))}
                        className="rounded border-gray-300 text-[#1e40af] focus:ring-[#1e40af] w-4 h-4 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline gap-2">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                            <Building2 className="w-3.5 h-3.5 text-sky-600 shrink-0" /> Commercial Use License
                          </span>
                          <span className="text-xs font-extrabold text-[#1e40af] shrink-0">+₹750</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1">Full commercial rights for ads, branding &amp; business use.</p>
                      </div>
                    </label>
                  )}
                  {[pkg.deliveryDays <= 1, pkg.revisionCount === -1, !!pkg.includesSourceFiles, !!pkg.includesCommercialRights].every(Boolean) && (
                    <p className="text-xs text-gray-400 text-center py-2">All available add-ons are already included in this package.</p>
                  )}
                </div>
              </div>

              <button type="button" onClick={() => { if (moods.length === 0) { toast.error("Select at least one vibe first."); return; } setStep(2); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="hidden md:flex w-full py-3.5 rounded-xl font-bold text-white text-sm bg-[#1e40af] hover:bg-blue-800 items-center justify-center gap-2 transition-colors shadow-sm shadow-blue-200">
                Review &amp; Pay <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ─────────── STEP 2: Confirm & Pay ─────────── */}
          {step === 2 && (
            <div className="space-y-4">

              {/* Brief summary */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-gray-900">Your Brief</h2>
                  <button type="button" onClick={() => setStep(1)}
                    className="text-xs font-semibold text-[#1e40af] hover:text-blue-900 flex items-center gap-1 transition-colors">
                    <RefreshCw className="w-3 h-3" /> Edit
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  {/* Vibes */}
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-2">Vibe &amp; Mood</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {moods.map(m => {
                        const cfg = MOOD_CONFIG[m];
                        const MoodIcon = cfg?.Icon;
                        return (
                          <span key={m} className="flex items-center gap-1 bg-[#1e40af]/10 text-[#1e40af] text-xs font-semibold px-2.5 py-1 rounded-lg">
                            {MoodIcon && <MoodIcon className="w-3 h-3" />}{cfg?.label ?? m}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  {/* Music + Color */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">Music</p>
                      <div className="flex items-center gap-1.5">
                        <Music className="w-3 h-3 text-violet-500 shrink-0" />
                        <span className="text-xs font-bold text-gray-800">{musicLabel}</span>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">Color Grade</p>
                      <div className="flex items-center gap-1.5">
                        <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", colorDot)} />
                        <span className="text-xs font-bold text-gray-800">{colorLabel}</span>
                      </div>
                    </div>
                  </div>
                  {/* References */}
                  {cleanRefUrls.length > 0 && (
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1.5">References</p>
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                        <Link2 className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                        {cleanRefUrls.length} reference video{cleanRefUrls.length !== 1 ? "s" : ""} attached
                      </div>
                    </div>
                  )}
                  {/* Instructions */}
                  {(mustInclude || mustAvoid || additionalNotes) && (
                    <div className="border-t border-gray-100 pt-3 space-y-2">
                      {mustInclude && (
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-wider text-emerald-600 mb-0.5">Must Include</p>
                          <p className="text-xs text-gray-600 leading-relaxed">{mustInclude.slice(0, 100)}{mustInclude.length > 100 ? "…" : ""}</p>
                        </div>
                      )}
                      {mustAvoid && (
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-wider text-red-400 mb-0.5">Must Avoid</p>
                          <p className="text-xs text-gray-600 leading-relaxed">{mustAvoid.slice(0, 100)}{mustAvoid.length > 100 ? "…" : ""}</p>
                        </div>
                      )}
                      {additionalNotes && (
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-0.5">Notes</p>
                          <p className="text-xs text-gray-600 leading-relaxed">{additionalNotes.slice(0, 120)}{additionalNotes.length > 120 ? "…" : ""}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Add-ons summary */}
                  {activeAddOnLabels.length > 0 && (
                    <div className="border-t border-gray-100 pt-3">
                      <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1.5">Add-ons</p>
                      <div className="flex flex-wrap gap-1.5">
                        {activeAddOnLabels.map(l => (
                          <span key={l} className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-full">{l}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Credits banner */}
              {availableCredits > 0 && (
                <div className="bg-emerald-50 border border-emerald-200/60 rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-emerald-800">{formatCurrency(availableCredits)} in credits available</p>
                    <p className="text-xs text-emerald-600 mt-0.5">Apply to reduce your charge</p>
                  </div>
                  <button type="button" onClick={() => setUseCredits(!useCredits)}
                    className={cn("px-4 py-2 rounded-xl text-xs font-semibold border transition-all shrink-0",
                      useCredits ? "bg-emerald-600 border-emerald-600 text-white" : "border-emerald-300 text-emerald-700 hover:bg-emerald-100")}>
                    {useCredits ? <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Applied</span> : "Apply Credits"}
                  </button>
                </div>
              )}

              {/* Order summary + pay */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <h2 className="text-sm font-bold text-gray-900">Order Summary</h2>
                </div>
                <form onSubmit={handleCheckout}>
                  <div className="px-5 py-4 space-y-2.5 text-sm">
                    <div className="flex justify-between text-gray-500">
                      <span>Package — {pkg.title}</span>
                      <span className="tabular-nums font-medium text-gray-700">{formatCurrency(pkg.price)}</span>
                    </div>
                    {addOnsCost > 0 && (
                      <div className="flex justify-between text-gray-500">
                        <span>Add-ons ({activeAddOnLabels.length})</span>
                        <span className="tabular-nums font-medium text-amber-600">+{formatCurrency(addOnsCost)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-400 text-xs">
                      <span>Processing fee ({processingFeePct}%)</span>
                      <span className="tabular-nums">{formatCurrency(processingFee)}</span>
                    </div>
                    {creditsApplied > 0 && (
                      <div className="flex justify-between text-emerald-700 font-medium">
                        <span>Credits applied</span>
                        <span className="tabular-nums">−{formatCurrency(creditsApplied)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-100 pt-3 mt-1">
                      <span>Total charge</span>
                      <span className="tabular-nums text-[#1e40af]">{formatCurrency(chargeAmount)}</span>
                    </div>
                  </div>

                  <div className="px-5 pb-5 space-y-3">
                    <button type="submit" disabled={loading}
                      className="hidden md:flex w-full py-3.5 rounded-xl font-bold text-white text-sm bg-[#1e40af] hover:bg-blue-800 items-center justify-center gap-2 disabled:opacity-60 transition-colors shadow-sm shadow-blue-200">
                      {loading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                      ) : (
                        <><CreditCard className="w-4 h-4" /> Pay {formatCurrency(chargeAmount)} &amp; Start Order</>
                      )}
                    </button>

                    {/* Trust strip */}
                    <div className="flex items-center justify-center gap-4 pt-1 flex-wrap">
                      <span className="flex items-center gap-1 text-[11px] text-gray-400 font-medium">
                        <Shield className="w-3 h-3 text-emerald-500" /> Escrow protected
                      </span>
                      <span className="text-gray-200">·</span>
                      <span className="flex items-center gap-1 text-[11px] text-gray-400 font-medium">
                        <Lock className="w-3 h-3 text-gray-400" /> Secure payment
                      </span>
                      <span className="text-gray-200">·</span>
                      <span className="flex items-center gap-1 text-[11px] text-gray-400 font-medium">
                        <Clock className="w-3 h-3 text-gray-400" /> Refund policy applies
                      </span>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="hidden md:block space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-[73px]">

            {/* Editor + package header */}
            <div className="bg-gray-950 px-5 py-4">
              <div className="flex items-center gap-1 mb-2">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Your Order</span>
              </div>
              <p className="font-bold text-white text-sm leading-snug">{pkg.title}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <Users className="w-3 h-3 text-gray-400" />
                <p className="text-xs text-gray-400">by {displayNameFromFull(pkg.editorName)}</p>
              </div>
            </div>

            {/* Delivery + revisions */}
            <div className="px-5 py-4 space-y-2.5 text-sm border-b border-gray-50">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Delivery</span>
                <span className="font-semibold text-gray-900">
                  {addOns.extraFast ? Math.max(1, pkg.deliveryDays - 2) : pkg.deliveryDays} days
                  {addOns.extraFast && <span className="ml-1 text-[10px] text-amber-600 font-bold">FAST</span>}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Revisions</span>
                <span className="font-semibold text-gray-900">
                  {pkg.revisionCount === -1 ? "Unlimited" : `${pkg.revisionCount + (addOns.extraRevision ? 1 : 0)} rounds`}
                </span>
              </div>
            </div>

            {/* Active add-ons list (if any) */}
            {activeAddOnLabels.length > 0 && (
              <div className="px-5 py-3 border-b border-gray-50">
                <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-2">Add-ons Selected</p>
                <div className="space-y-1">
                  {activeAddOnLabels.map(l => (
                    <div key={l} className="flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-[#1e40af] shrink-0" />
                      <span className="text-xs font-medium text-gray-700">{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Price breakdown */}
            <div className="px-5 py-4 space-y-2 text-sm">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Subtotal</span>
                <span className="font-semibold text-gray-700 tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Processing ({processingFeePct}%)</span>
                <span className="font-semibold text-gray-700 tabular-nums">{formatCurrency(processingFee)}</span>
              </div>
              {creditsApplied > 0 && (
                <div className="flex justify-between text-xs text-emerald-700">
                  <span>Credits</span>
                  <span className="tabular-nums">−{formatCurrency(creditsApplied)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-gray-100">
                <span className="text-gray-600 font-semibold">Total</span>
                <span className="font-black text-[#1e40af] tabular-nums text-base">{formatCurrency(chargeAmount)}</span>
              </div>
            </div>

            {/* Escrow badge */}
            <div className="px-5 pb-4">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3.5 py-2.5 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <p className="text-[11px] text-emerald-700 font-semibold leading-snug">
                  Payment held in escrow until you approve delivery
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile sticky bottom bar ── */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 py-3 z-50">
        <div className="flex items-center gap-3">
          <div className="shrink-0">
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider leading-none mb-0.5">Total</p>
            <p className="font-black text-gray-900 text-lg leading-none tabular-nums">{formatCurrency(chargeAmount)}</p>
            {addOnsCost > 0 && <p className="text-[9px] text-amber-600 font-bold mt-0.5">incl. add-ons</p>}
          </div>
          <button type="button" onClick={goNext} disabled={loading}
            className="flex-1 py-3 rounded-xl font-bold text-white text-sm bg-[#1e40af] flex items-center justify-center gap-2 disabled:opacity-60 transition-colors active:scale-[0.98]">
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
            ) : step === 0 ? (
              <>Continue <ArrowRight className="w-4 h-4" /></>
            ) : step === 1 ? (
              <>Review &amp; Pay <ArrowRight className="w-4 h-4" /></>
            ) : (
              <><CreditCard className="w-4 h-4" /> Pay {formatCurrency(chargeAmount)}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Film, Zap, Layers, Activity, Heart, Flame, Smile,
  Music, Palette, Link2, AlignLeft, Ban, FileText,
  ArrowRight, Loader2, CreditCard, Check, Plus, X,
  ArrowLeft, RotateCcw, Package2, Building2, Shield,
  Lock, Clock, RefreshCw, BookmarkPlus, CheckCircle2,
  Truck, Repeat2, Timer, Video, MonitorPlay, HardDrive,
  Ratio, Wrench, FileVideo, Moon, Wand2, VolumeX,
  Clapperboard, Globe, Upload, Calendar, Tag,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, displayNameFromFull, cn } from "@/lib/utils";

/* ─── Static data ─────────────────────────────────────────────── */

const ADDON_DISPLAY: Record<string, string> = {
  color_grading: "Color Grading", color_correction: "Color Correction",
  sound_design: "Sound Design", audio_cleanup: "Audio Cleanup",
  background_music: "Background Music", captions: "Captions / Subtitles",
  thumbnail: "Thumbnail Design", motion_graphics: "Motion Graphics",
  intro_outro: "Intro / Outro", lower_thirds: "Lower Thirds",
  social_media_cuts: "Social Media Cuts", speed_ramps: "Speed Ramps",
  green_screen: "Green Screen Removal",
};

const CONTENT_TYPES: { value: string; label: string }[] = [
  { value: "youtube_longform",  label: "YouTube Long-form" },
  { value: "youtube_shorts",    label: "YouTube Shorts" },
  { value: "instagram_reel",    label: "Instagram Reel" },
  { value: "tiktok",            label: "TikTok Video" },
  { value: "gaming_montage",    label: "Gaming Montage" },
  { value: "wedding_event",     label: "Wedding / Event" },
  { value: "corporate",         label: "Corporate / Explainer" },
  { value: "travel_vlog",       label: "Travel Vlog" },
  { value: "podcast_video",     label: "Podcast Video" },
  { value: "music_video",       label: "Music Video" },
  { value: "other",             label: "Other" },
];

const PLATFORMS: { value: string; label: string }[] = [
  { value: "youtube",   label: "YouTube" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok",    label: "TikTok" },
  { value: "linkedin",  label: "LinkedIn" },
  { value: "facebook",  label: "Facebook" },
  { value: "multiple",  label: "Multiple" },
];

const FOOTAGE_OPTIONS: { value: string; label: string; sub: string; needsLink: boolean }[] = [
  { value: "google_drive",    label: "Google Drive",    sub: "Paste a Drive folder link",    needsLink: true },
  { value: "wetransfer",      label: "WeTransfer",      sub: "Paste a WeTransfer link",      needsLink: true },
  { value: "dropbox",         label: "Dropbox",         sub: "Paste a Dropbox folder link",  needsLink: true },
  { value: "direct_message",  label: "I'll message you", sub: "Send after order is placed",  needsLink: false },
];

const MOOD_CONFIG: Record<string, { label: string; Icon: LucideIcon; color: string; bg: string; border: string }> = {
  cinematic:  { label: "Cinematic",  Icon: Film,     color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200" },
  fast_paced: { label: "Fast-paced", Icon: Zap,      color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200" },
  minimal:    { label: "Minimal",    Icon: Layers,   color: "text-gray-700",   bg: "bg-gray-100",  border: "border-gray-300" },
  energetic:  { label: "Energetic",  Icon: Activity, color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200" },
  emotional:  { label: "Emotional",  Icon: Heart,    color: "text-pink-700",   bg: "bg-pink-50",   border: "border-pink-200" },
  hype:       { label: "Hype",       Icon: Flame,    color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
  funny:      { label: "Funny",      Icon: Smile,    color: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200" },
};
const MOODS = Object.keys(MOOD_CONFIG) as (keyof typeof MOOD_CONFIG)[];

const MUSIC_OPTIONS: { value: string; label: string; sub: string; Icon: LucideIcon }[] = [
  { value: "upbeat",          label: "Upbeat",        sub: "Fast & energetic",  Icon: Zap },
  { value: "lofi",            label: "Lo-fi",         sub: "Chill & relaxed",   Icon: Moon },
  { value: "editor_choice",   label: "Editor's pick", sub: "Trust the editor",  Icon: Wand2 },
  { value: "client_provides", label: "I'll provide",  sub: "I have a track",    Icon: Music },
  { value: "no_music",        label: "No music",      sub: "Silent edit",       Icon: VolumeX },
];

const COLOR_OPTIONS: { value: string; label: string; dot: string; ring: string; sub: string }[] = [
  { value: "neutral", label: "Neutral", dot: "bg-gray-400",   ring: "ring-gray-400",   sub: "Clean & balanced" },
  { value: "bright",  label: "Bright",  dot: "bg-yellow-400", ring: "ring-yellow-400", sub: "Vivid & punchy" },
  { value: "moody",   label: "Moody",   dot: "bg-indigo-500", ring: "ring-indigo-500", sub: "Dark & cinematic" },
  { value: "warm",    label: "Warm",    dot: "bg-orange-400", ring: "ring-orange-400", sub: "Golden tones" },
  { value: "cold",    label: "Cold",    dot: "bg-sky-400",    ring: "ring-sky-400",    sub: "Cool & crisp" },
];

const STAT_ICONS: Record<string, LucideIcon> = {
  Delivery: Truck, Revisions: Repeat2, Length: Timer,
  Videos: Video, Resolution: MonitorPlay, "Raw Footage": HardDrive,
};

const SHORT_FORM_ONLY = new Set(["youtube_shorts", "instagram_reel", "tiktok"]);

// Maps a package's videoCategory (+ optional videoFormat) to a checkout contentType value.
// Returns null when the mapping is ambiguous or the package covers multiple categories.
function deriveLockedContentType(
  videoCategory: string | null | undefined,
  videoFormat: string | null | undefined,
): string | null {
  if (!videoCategory) return null;
  const categories = videoCategory.split(",").filter(Boolean);
  if (categories.length !== 1) return null; // multi-category → client must choose
  const cat = categories[0];
  const direct: Record<string, string> = {
    wedding: "wedding_event",
    corporate: "corporate",
    travel: "travel_vlog",
    podcast: "podcast_video",
    music: "music_video",
  };
  if (direct[cat]) return direct[cat];
  if (cat === "gaming" && videoFormat === "long_form") return "gaming_montage";
  return null;
}

function filterContentTypes(videoFormat: string | null | undefined, videoCategory: string | null | undefined): typeof CONTENT_TYPES {
  // Only filter when the package is single-category (multi-category editors handle all formats)
  const categories = (videoCategory ?? "").split(",").filter(Boolean);
  if (categories.length > 1) return CONTENT_TYPES;
  if (videoFormat === "long_form") return CONTENT_TYPES.filter(ct => !SHORT_FORM_ONLY.has(ct.value));
  if (videoFormat === "short_form") return CONTENT_TYPES.filter(ct => SHORT_FORM_ONLY.has(ct.value) || ct.value === "other");
  return CONTENT_TYPES;
}

/* ─── Types ───────────────────────────────────────────────────── */

type BriefTemplate = { id: string; name: string; content: string };

type Props = {
  pkg: {
    id: string; tier?: string | null; title: string; description: string;
    price: number; deliveryDays: number; revisionCount: number;
    videoLengthLimit?: string | null; videoCount?: number | null;
    resolution?: string | null; maxRawFootage?: string | null;
    aspectRatios?: string[]; addons?: string[];
    softwareUsed?: string[]; deliveryFormats?: string[];
    includesSourceFiles?: boolean; includesCommercialRights?: boolean;
    videoCategory?: string | null; videoFormat?: string | null;
    editorName: string; editorId: string; editorImage?: string | null;
  };
  availableCredits: number;
  processingFeePct?: number;
};

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

/* ─── Component ───────────────────────────────────────────────── */

export default function CheckoutForm({ pkg, availableCredits, processingFeePct = 10 }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [savedTemplates, setSavedTemplates] = useState<BriefTemplate[]>([]);

  // Derived from package — null means client must choose
  const lockedContentType = deriveLockedContentType(pkg.videoCategory, pkg.videoFormat);
  const filteredContentTypes = filterContentTypes(pkg.videoFormat, pkg.videoCategory);

  // ── Brief fields ──
  const [contentType, setContentType] = useState(lockedContentType ?? "");
  const [targetPlatform, setTargetPlatform] = useState("");
  const [desiredDuration, setDesiredDuration] = useState("");
  const [footageDelivery, setFootageDelivery] = useState("google_drive");
  const [footageLink, setFootageLink] = useState("");
  const [rawFootageDuration, setRawFootageDuration] = useState("");
  const [moods, setMoods] = useState<string[]>([]); // no default — client must choose
  const [musicPref, setMusicPref] = useState("editor_choice");
  const [musicTrackInfo, setMusicTrackInfo] = useState("");
  const [colorLook, setColorLook] = useState("neutral");
  const [referenceUrls, setReferenceUrls] = useState<string[]>([""]);
  const [urlErrors, setUrlErrors] = useState<Record<number, boolean>>({});
  const [mustInclude, setMustInclude] = useState("");
  const [mustAvoid, setMustAvoid] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [brandNotes, setBrandNotes] = useState("");
  const [urgentDeadline, setUrgentDeadline] = useState("");

  // ── Order fields ──
  const [useCredits, setUseCredits] = useState(false);
  const [rewardDiscount] = useState(0);
  const [addOns, setAddOns] = useState({ extraFast: false, extraRevision: false, sourceFiles: false, commercialRights: false });

  // ── Template ──
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const draftKey = `checkout-draft-${pkg.id}`;

  /* ── Init: load templates + restore draft ── */
  useEffect(() => {
    fetch("/api/brief-templates")
      .then(r => (r.ok ? r.json() : []))
      .then(data => { if (Array.isArray(data)) setSavedTemplates(data); })
      .catch(() => {})
      .finally(() => {
        const raw = localStorage.getItem(draftKey);
        if (raw) {
          try {
            const d = JSON.parse(raw);
            if (d.contentType && !lockedContentType)                   setContentType(d.contentType);
            if (d.targetPlatform)                                      setTargetPlatform(d.targetPlatform);
            if (d.desiredDuration !== undefined)                       setDesiredDuration(d.desiredDuration);
            if (d.footageDelivery)                                     setFootageDelivery(d.footageDelivery);
            if (d.footageLink !== undefined)                           setFootageLink(d.footageLink);
            if (d.rawFootageDuration !== undefined)                    setRawFootageDuration(d.rawFootageDuration);
            if (Array.isArray(d.moods))                                setMoods(d.moods);
            if (d.musicPref)                                           setMusicPref(d.musicPref);
            if (d.musicTrackInfo !== undefined)                        setMusicTrackInfo(d.musicTrackInfo);
            if (d.colorLook)                                           setColorLook(d.colorLook);
            if (Array.isArray(d.referenceUrls) && d.referenceUrls.length) setReferenceUrls(d.referenceUrls);
            if (d.mustInclude !== undefined)                           setMustInclude(d.mustInclude);
            if (d.mustAvoid !== undefined)                             setMustAvoid(d.mustAvoid);
            if (d.additionalNotes !== undefined)                       setAdditionalNotes(d.additionalNotes);
            if (d.brandNotes !== undefined)                            setBrandNotes(d.brandNotes);
            if (d.urgentDeadline !== undefined)                        setUrgentDeadline(d.urgentDeadline);
            if (d.addOns)                                              setAddOns(d.addOns);
            toast.custom((t) => (
              <div className="flex items-center justify-between w-full max-w-sm bg-white dark:bg-neutral-900 border border-gray-150 dark:border-neutral-800 rounded-2xl shadow-xl p-4 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/50 mt-0.5">
                    <BookmarkPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-black text-gray-900 dark:text-white leading-tight">Draft restored</h4>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 leading-normal mt-0.5">Your previous brief was loaded.</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem(draftKey);
                    setContentType(lockedContentType ?? "");
                    setTargetPlatform(""); setDesiredDuration(""); setFootageDelivery("google_drive");
                    setFootageLink(""); setRawFootageDuration(""); setMoods([]);
                    setMusicPref("editor_choice"); setMusicTrackInfo(""); setColorLook("neutral");
                    setReferenceUrls([""]); setUrlErrors({}); setMustInclude(""); setMustAvoid("");
                    setAdditionalNotes(""); setBrandNotes(""); setUrgentDeadline("");
                    setAddOns({ extraFast: false, extraRevision: false, sourceFiles: false, commercialRights: false });
                    toast.dismiss(t);
                    toast("Draft discarded — starting fresh.");
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-black text-white bg-neutral-900 dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all shrink-0 active:scale-[0.97]"
                >
                  Discard
                </button>
              </div>
            ), {
              duration: 8000,
            });
          } catch { /* ignore */ }
        }
        setInitLoading(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Autosave draft + show indicator ── */
  useEffect(() => {
    if (initLoading) return;
    localStorage.setItem(draftKey, JSON.stringify({
      contentType, targetPlatform, desiredDuration,
      footageDelivery, footageLink, rawFootageDuration,
      moods, musicPref, musicTrackInfo, colorLook,
      referenceUrls, mustInclude, mustAvoid, additionalNotes,
      brandNotes, urgentDeadline, addOns,
    }));
    setDraftSaved(true);
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => setDraftSaved(false), 2000);
  }, [ // eslint-disable-line react-hooks/exhaustive-deps
    contentType, targetPlatform, desiredDuration,
    footageDelivery, footageLink, rawFootageDuration,
    moods, musicPref, musicTrackInfo, colorLook,
    referenceUrls, mustInclude, mustAvoid, additionalNotes,
    brandNotes, urgentDeadline, addOns, initLoading,
  ]);

  /* ── Handlers ── */
  const handleMoodToggle = (m: string) =>
    setMoods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  const handleAddUrl = () => { if (referenceUrls.length < 5) setReferenceUrls([...referenceUrls, ""]); };
  const handleUrlChange = (idx: number, val: string) => {
    const next = [...referenceUrls]; next[idx] = val; setReferenceUrls(next);
  };
  const handleUrlBlur = (idx: number, val: string) => {
    if (!val.trim()) { setUrlErrors(e => { const n = { ...e }; delete n[idx]; return n; }); return; }
    setUrlErrors(e => ({ ...e, [idx]: !(val.startsWith("http://") || val.startsWith("https://")) }));
  };
  const handleRemoveUrl = (idx: number) => {
    setReferenceUrls(referenceUrls.filter((_, i) => i !== idx));
    setUrlErrors({});
  };

  const handleSelectTemplate = (content: string) => {
    try {
      const p = JSON.parse(content);
      if (p && typeof p === "object") {
        if (p.contentType && !lockedContentType)               setContentType(p.contentType);
        if (p.targetPlatform)                                  setTargetPlatform(p.targetPlatform);
        if (p.desiredDuration !== undefined)                   setDesiredDuration(p.desiredDuration);
        if (p.footageDelivery)                                 setFootageDelivery(p.footageDelivery);
        if (p.footageLink !== undefined)                       setFootageLink(p.footageLink);
        if (p.rawFootageDuration !== undefined)                setRawFootageDuration(p.rawFootageDuration);
        if (Array.isArray(p.moods) && p.moods.length)         setMoods(p.moods);
        if (p.musicPreference)                                 setMusicPref(p.musicPreference);
        if (p.musicTrackInfo !== undefined)                    setMusicTrackInfo(p.musicTrackInfo);
        if (p.colorLook)                                       setColorLook(p.colorLook);
        if (Array.isArray(p.referenceUrls) && p.referenceUrls.length) setReferenceUrls(p.referenceUrls);
        if (p.mustInclude !== undefined)                       setMustInclude(p.mustInclude);
        if (p.mustAvoid !== undefined)                         setMustAvoid(p.mustAvoid);
        if (p.additionalNotes !== undefined)                   setAdditionalNotes(p.additionalNotes);
        if (p.brandNotes !== undefined)                        setBrandNotes(p.brandNotes);
        if (p.urgentDeadline !== undefined)                    setUrgentDeadline(p.urgentDeadline);
        toast.success("Template loaded — all fields restored.");
        return;
      }
    } catch { /* legacy plain-text template */ }
    setAdditionalNotes(content);
    toast.success("Template loaded into notes.");
  };

  /* ── Pricing ── */
  const addOnsCost =
    (addOns.extraFast ? 150000 : 0) + (addOns.extraRevision ? 50000 : 0) +
    (addOns.sourceFiles ? 100000 : 0) + (addOns.commercialRights ? 75000 : 0);
  const subtotal = pkg.price + addOnsCost;
  const processingFee = Math.round(subtotal * (processingFeePct / 100));
  const fullTotal = subtotal + processingFee;
  const creditsApplied = useCredits ? Math.min(availableCredits, fullTotal - 100) : 0;
  const chargeAmount = fullTotal - creditsApplied;

  /* ── Save template (fires before payment, not after) ── */
  async function persistTemplate() {
    if (!saveAsTemplate || !templateName.trim()) return;
    const cleanUrls = referenceUrls.filter(u => u.trim() !== "");
    const tc = JSON.stringify({
      contentType, targetPlatform, desiredDuration,
      footageDelivery, footageLink, rawFootageDuration,
      moods, musicPreference: musicPref, musicTrackInfo, colorLook,
      referenceUrls: cleanUrls, mustInclude, mustAvoid, additionalNotes,
      brandNotes, urgentDeadline,
    });
    await fetch("/api/brief-templates", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: templateName.trim(), content: tc }),
    }).catch(() => {});
  }

  /* ── Payment ── */
  async function submitOrder() {
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
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

      const cleanUrls = referenceUrls.filter(u => u.trim() !== "");
      const briefData = {
        contentType, targetPlatform, desiredDuration,
        footageDelivery,
        footageLink: FOOTAGE_OPTIONS.find(o => o.value === footageDelivery)?.needsLink ? footageLink : "",
        rawFootageDuration,
        mood: moods,
        musicPreference: musicPref,
        musicTrackInfo: musicPref === "client_provides" ? musicTrackInfo : "",
        colorLook, referenceUrls: cleanUrls,
        mustInclude, mustAvoid, additionalNotes,
        brandNotes, urgentDeadline,
        customAddons: addOns,
      };

      const rz = new window.Razorpay({
        key: orderData.key, amount: orderData.amount, currency: orderData.currency,
        order_id: orderData.razorpayOrderId, name: "EditBridge", description: `Order — ${pkg.title}`,
        handler: async (response: Record<string, string>) => {
          try {
            const verifyRes = await fetch("/api/orders/verify", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id, razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature, packageId: pkg.id, briefData,
                creditApplied: orderData.creditApplied ?? 0, rewardDiscountAmount: orderData.rewardDiscountAmount ?? 0,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error ?? "Payment verification failed");
            localStorage.removeItem(draftKey);
            toast.success("Order confirmed!");
            router.push(`/checkout/${pkg.id}/success`);
          } catch (verifyErr) {
            toast.error(verifyErr instanceof Error ? verifyErr.message : "Verification failed");
          }
        },
        prefill: {}, theme: { color: "#1e40af" },
      });
      rz.open();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckout(e: React.FormEvent) { e.preventDefault(); await submitOrder(); }

  async function goNext() {
    if (step === 0) {
      setStep(1); window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (step === 1) {
      if (!contentType) { toast.error("Please select what type of video you need edited."); return; }
      if (moods.length === 0) { toast.error("Please select at least one vibe for your video."); return; }
      const selectedFootageOpt = FOOTAGE_OPTIONS.find(o => o.value === footageDelivery);
      if (selectedFootageOpt?.needsLink && !footageLink.trim()) {
        toast.error(`Paste your ${selectedFootageOpt.label} link so the editor can access your footage.`);
        return;
      }
      if (saveAsTemplate && !templateName.trim()) {
        toast.error("Enter a name for your template, or turn off template saving.");
        return;
      }
      await persistTemplate(); // saved before payment, not after
      setStep(2); window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      submitOrder();
    }
  }

  /* ── Loading state ── */
  if (initLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-[#1e40af]" />
          <p className="text-sm text-gray-400 font-medium">Loading your order…</p>
        </div>
      </div>
    );
  }

  /* ── Derived display values ── */
  const musicLabel = MUSIC_OPTIONS.find(o => o.value === musicPref)?.label ?? musicPref;
  const MusicIcon  = MUSIC_OPTIONS.find(o => o.value === musicPref)?.Icon ?? Music;
  const colorOpt   = COLOR_OPTIONS.find(o => o.value === colorLook);
  const cleanRefUrls = referenceUrls.filter(u => u.trim() !== "");
  const inclusions = [
    ...(pkg.includesSourceFiles ? ["Source files included"] : []),
    ...(pkg.includesCommercialRights ? ["Commercial rights"] : []),
    ...(pkg.addons ?? []).map(a => ADDON_DISPLAY[a] ?? a.replace(/_/g, " ")),
  ];
  const activeAddOnLabels = [
    addOns.extraFast && "Fast delivery", addOns.extraRevision && "Extra revision",
    addOns.sourceFiles && "Source files",  addOns.commercialRights && "Commercial rights",
  ].filter(Boolean) as string[];
  const stats = [
    { label: "Delivery",     value: `${pkg.deliveryDays} day${pkg.deliveryDays !== 1 ? "s" : ""}` },
    { label: "Revisions",    value: pkg.revisionCount === -1 ? "Unlimited" : `${pkg.revisionCount} round${pkg.revisionCount !== 1 ? "s" : ""}` },
    ...(pkg.videoLengthLimit ? [{ label: "Length",      value: pkg.videoLengthLimit }] : []),
    ...((pkg.videoCount ?? 0) > 0 ? [{ label: "Videos",  value: `${pkg.videoCount}` }] : []),
    ...(pkg.resolution       ? [{ label: "Resolution",  value: pkg.resolution.toUpperCase() }] : []),
    ...(pkg.maxRawFootage    ? [{ label: "Raw Footage", value: pkg.maxRawFootage }] : []),
  ];
  const STEP_LABELS = ["Package Details", "Project Brief", "Confirm & Pay"];
  const contentTypeLabel = CONTENT_TYPES.find(c => c.value === contentType)?.label ?? "";
  const platformLabel = PLATFORMS.find(p => p.value === targetPlatform)?.label ?? "";
  const footageOpt = FOOTAGE_OPTIONS.find(o => o.value === footageDelivery);

  /* ─── Shared UI helpers ─────────────────────────────────────── */
  const INPUT_CLS = "w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-[#1e40af] bg-gray-50 placeholder:text-gray-350 font-medium text-gray-700 transition-all duration-200";
  function SectionHdr({ Icon, iconBg, title, sub }: { Icon: LucideIcon; iconBg: string; title: string; sub: string }) {
    return (
      <div className="px-5 pt-5 pb-4 border-b border-gray-100 flex items-center gap-3">
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-black text-gray-900">{title}</h3>
          <p className="text-[11px] font-medium text-gray-400 mt-0.5">{sub}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28 md:pb-10">

      {/* ── Draft saved toast ── */}
      {step === 1 && (
        <div className={cn(
          "fixed bottom-28 md:bottom-6 right-4 z-50 bg-gray-950 text-white text-[10px] font-black px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-xl transition-all duration-300 pointer-events-none",
          draftSaved ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        )}>
          <Check className="w-3 h-3 text-emerald-400" strokeWidth={3} /> Draft saved
        </div>
      )}

      {/* ── Sticky Header ── */}
      <header className="bg-white/95 backdrop-blur-md border-b border-gray-150 shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          {step === 0 ? (
            <Link href={`/editor/${pkg.editorId}`} className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-wider shrink-0">
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
          ) : (
            <button type="button" onClick={() => { setStep(s => s - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-wider shrink-0">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}

          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {STEP_LABELS.map((label, i) => (
              <div key={i} className="flex items-center gap-1.5">
                {i > 0 && (
                  <div className="relative w-5 sm:w-10 h-[1.5px] bg-gray-200 overflow-hidden rounded-full">
                    <div className={cn("absolute inset-y-0 left-0 bg-[#1e40af] transition-all duration-500 ease-out", step > i - 1 ? "w-full" : "w-0")} />
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <div className={cn(
                    "w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black transition-all duration-300 shrink-0",
                    step === i ? "bg-[#1e40af] text-white ring-4 ring-[#1e40af]/15 shadow-sm"
                      : step > i ? "bg-emerald-500 text-white"
                      : "bg-gray-100 text-gray-400 border border-gray-200"
                  )}>
                    {step > i ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : i + 1}
                  </div>
                  <span className={cn("text-[10px] sm:text-xs font-black hidden sm:block transition-colors",
                    step === i ? "text-[#1e40af]" : step > i ? "text-emerald-600" : "text-gray-400")}>
                    {label}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="shrink-0 text-right hidden sm:block">
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide leading-none">Total</p>
            <p className="text-sm font-black text-gray-900 tabular-nums">{formatCurrency(chargeAmount)}</p>
          </div>
        </div>
        <div className="h-[2px] bg-gray-100">
          <div className={cn("h-full bg-gradient-to-r from-[#1e40af] to-blue-500 transition-all duration-700 ease-out",
            step === 0 ? "w-1/3" : step === 1 ? "w-2/3" : "w-full")} />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 grid md:grid-cols-[1fr_300px] gap-5 lg:gap-8 items-start">
        <div className="space-y-4 min-w-0">

          {/* ═══════════ STEP 0: Package Overview ═══════════ */}
          {step === 0 && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-sky-400 to-[#1e40af]" />
                <div className="relative bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 px-6 py-6 overflow-hidden">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/15 rounded-full blur-[120px] pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
                  <div className="absolute inset-0 opacity-[0.03]"
                    style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
                  <div className="relative">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        {pkg.tier && (
                          <span className="inline-flex items-center gap-1 text-[9.5px] font-black uppercase tracking-widest text-sky-400 border border-sky-400/20 bg-sky-400/15 px-3 py-1 rounded-full mb-3">
                            {pkg.tier}
                          </span>
                        )}
                        <h2 className="font-black text-white text-xl sm:text-2xl leading-tight tracking-tight">{pkg.title}</h2>
                      </div>
                      <div className="bg-white/[0.03] border border-white/[0.08] px-4 py-2.5 rounded-2xl text-left sm:text-right shrink-0">
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Price</p>
                        <p className="text-3xl font-black text-white tabular-nums tracking-tight">
                          {(pkg.price / 100).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-[9px] text-gray-400 font-medium mt-0.5">per project</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed font-medium mb-4">{pkg.description}</p>
                    <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/8">
                      <div className="flex items-center gap-3">
                        {pkg.editorImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={pkg.editorImage} alt={pkg.editorName} className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 border border-blue-400/25">
                            <span className="text-xs font-black text-sky-400 uppercase">{(pkg.editorName ?? "?").substring(0, 2)}</span>
                          </div>
                        )}
                        <div>
                          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Hiring Editor</p>
                          <p className="text-xs font-black text-white flex items-center gap-1">
                            {displayNameFromFull(pkg.editorName)}
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[9.5px] text-gray-400 font-bold bg-white/[0.04] border border-white/[0.07] px-3 py-1.5 rounded-xl uppercase tracking-wider">
                        <Shield className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Verified Escrow
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-5 bg-gray-50/40 border-b border-gray-100">
                  {stats.map(s => {
                    const Icon = STAT_ICONS[s.label] ?? Clock;
                    const colorMap: Record<string, string> = {
                      Delivery: "bg-blue-50 text-blue-600 border-blue-100",
                      Revisions: "bg-amber-50 text-amber-600 border-amber-100",
                      Length: "bg-purple-50 text-purple-600 border-purple-100",
                      Videos: "bg-rose-50 text-rose-600 border-rose-100",
                      Resolution: "bg-emerald-50 text-emerald-600 border-emerald-100",
                      "Raw Footage": "bg-indigo-50 text-indigo-600 border-indigo-100",
                    };
                    return (
                      <div key={s.label} className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-150 rounded-2xl shadow-sm">
                        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center border shrink-0", colorMap[s.label] ?? "bg-gray-100 text-gray-600 border-gray-200")}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 leading-none mb-0.5">{s.label}</p>
                          <p className="text-xs font-black text-gray-900 truncate">{s.value}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {((pkg.aspectRatios?.length ?? 0) > 0 || (pkg.softwareUsed?.length ?? 0) > 0 || (pkg.deliveryFormats?.length ?? 0) > 0 || inclusions.length > 0) && (
                  <div className="divide-y divide-gray-100">
                    {(pkg.aspectRatios?.length ?? 0) > 0 && (
                      <div className="px-5 py-4">
                        <div className="flex items-center gap-2 mb-2.5"><Ratio className="w-3.5 h-3.5 text-gray-400" /><p className="text-[9.5px] font-black uppercase tracking-wider text-gray-400">Aspect Ratios</p></div>
                        <div className="flex flex-wrap gap-1.5">{pkg.aspectRatios!.map(r => <span key={r} className="text-[10px] font-bold bg-gray-50 text-gray-600 px-3 py-1 rounded-xl border border-gray-150">{r}</span>)}</div>
                      </div>
                    )}
                    {(pkg.softwareUsed?.length ?? 0) > 0 && (
                      <div className="px-5 py-4">
                        <div className="flex items-center gap-2 mb-2.5"><Wrench className="w-3.5 h-3.5 text-gray-400" /><p className="text-[9.5px] font-black uppercase tracking-wider text-gray-400">Software Used</p></div>
                        <div className="flex flex-wrap gap-1.5">{pkg.softwareUsed!.map(s => <span key={s} className="text-[10px] font-bold bg-blue-50/70 text-[#1e40af] px-3 py-1 rounded-xl border border-blue-100">{s.replace(/_/g, " ")}</span>)}</div>
                      </div>
                    )}
                    {(pkg.deliveryFormats?.length ?? 0) > 0 && (
                      <div className="px-5 py-4">
                        <div className="flex items-center gap-2 mb-2.5"><FileVideo className="w-3.5 h-3.5 text-gray-400" /><p className="text-[9.5px] font-black uppercase tracking-wider text-gray-400">Delivery Formats</p></div>
                        <div className="flex flex-wrap gap-1.5">{pkg.deliveryFormats!.map(f => <span key={f} className="text-[10px] font-bold bg-gray-50 text-gray-600 px-3 py-1 rounded-xl border border-gray-150 uppercase">{f.replace(/_/g, " ")}</span>)}</div>
                      </div>
                    )}
                    {inclusions.length > 0 && (
                      <div className="px-5 py-4">
                        <div className="flex items-center gap-2 mb-3"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /><p className="text-[9.5px] font-black uppercase tracking-wider text-gray-400">What&apos;s Included</p></div>
                        <div className="grid sm:grid-cols-2 gap-2.5">
                          {inclusions.map(f => (
                            <div key={f} className="flex items-center gap-2.5">
                              <span className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0"><Check className="w-2.5 h-2.5 text-emerald-600" /></span>
                              <span className="text-xs font-semibold text-gray-700">{f}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-3xl border border-gray-155 shadow-sm p-5 space-y-4">
                <div className="flex items-start gap-3 bg-amber-50/60 border border-amber-200/60 rounded-2xl px-4 py-3">
                  <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5"><Lock className="w-2.5 h-2.5 text-amber-600" /></div>
                  <p className="text-xs text-amber-800 font-semibold leading-relaxed">Once payment is confirmed, the order cannot be cancelled without the editor&apos;s consent. Review all details carefully before continuing.</p>
                </div>
                <div className="flex items-center justify-center gap-5 text-[10px] text-gray-400 font-bold flex-wrap">
                  <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-emerald-500" /> Escrow protected</span>
                  <span className="text-gray-200">·</span>
                  <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Secure payment</span>
                  <span className="text-gray-200">·</span>
                  <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Refund policy</span>
                </div>
                <button type="button" onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="hidden md:flex w-full py-3.5 rounded-xl font-black text-white text-sm bg-[#1e40af] hover:bg-blue-800 items-center justify-center gap-2 transition-all shadow-md shadow-[#1e40af]/20 active:scale-[0.98]">
                  Looks good — Continue to Brief <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ═══════════ STEP 1: Project Brief ═══════════ */}
          {step === 1 && (
            <div className="space-y-6">

              {/* Template loader */}
              {savedTemplates.length > 0 && (
                <div className="bg-white rounded-3xl border border-gray-150 shadow-sm px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <BookmarkPlus className="w-4 h-4 text-[#1e40af] shrink-0" />
                    <span className="text-xs font-bold text-gray-700 truncate">Load a saved brief template</span>
                  </div>
                  <select onChange={e => { handleSelectTemplate(e.target.value); e.target.value = ""; }} defaultValue=""
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-black focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-[#1e40af] shrink-0 text-gray-700">
                    <option value="" disabled>Select template…</option>
                    {savedTemplates.map(t => <option key={t.id} value={t.content}>{t.name}</option>)}
                  </select>
                </div>
              )}

              {/* ── 1. Project Details ─────────────────────────── */}
              <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden">
                <SectionHdr Icon={Clapperboard} iconBg="bg-orange-50 text-orange-500" title="Project Details" sub="Video type, target platform & how you'll share footage" />
                <div className="p-5 space-y-6">

                  {/* Video Type */}
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      Video type <span className="text-red-500">*</span>
                      {!contentType && !lockedContentType && <span className="font-semibold normal-case tracking-normal text-amber-600 text-[9px]">— required</span>}
                    </p>
                    {lockedContentType ? (
                      <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl border border-orange-200 bg-orange-50">
                        <CheckCircle2 className="w-4 h-4 text-orange-500 shrink-0" />
                        <span className="text-sm font-bold text-orange-900">
                          {CONTENT_TYPES.find(ct => ct.value === lockedContentType)?.label}
                        </span>
                        <span className="text-[11px] text-orange-400 ml-auto">Matched to this package</span>
                      </div>
                    ) : (
                      <>
                        {pkg.videoFormat && pkg.videoFormat !== "both" && (pkg.videoCategory ?? "").split(",").filter(Boolean).length <= 1 && (
                          <p className="text-[10px] text-gray-400 mb-2">
                            This editor specialises in {pkg.videoFormat === "long_form" ? "long-form" : "short-form"} content — only compatible types are shown.
                          </p>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {filteredContentTypes.map(ct => (
                            <button key={ct.value} type="button" onClick={() => setContentType(ct.value)}
                              className={cn(
                                "px-3 py-2.5 rounded-2xl text-xs font-bold border text-left transition-all duration-150 select-none hover:scale-[1.01] active:scale-[0.98]",
                                contentType === ct.value
                                  ? "bg-orange-50 border-orange-300 text-orange-800 shadow-sm ring-2 ring-orange-500/10"
                                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                              )}>
                              {ct.label}
                              {contentType === ct.value && <Check className="inline w-3 h-3 ml-1 text-orange-600" strokeWidth={3} />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Target Platform */}
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <Globe className="w-3 h-3 text-gray-400" /> Target platform
                      <span className="font-normal normal-case tracking-normal text-gray-300 text-[9px]">(optional)</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {PLATFORMS.map(pl => (
                        <button key={pl.value} type="button"
                          onClick={() => setTargetPlatform(pl.value === targetPlatform ? "" : pl.value)}
                          className={cn(
                            "px-3.5 py-2 rounded-full text-xs font-bold border transition-all duration-150 select-none",
                            targetPlatform === pl.value
                              ? "bg-[#1e40af] border-[#1e40af] text-white shadow-sm"
                              : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                          )}>
                          {pl.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Desired Duration */}
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Timer className="w-3 h-3" /> Desired output length
                      <span className="font-normal normal-case tracking-normal text-gray-300 text-[9px]">(optional)</span>
                    </label>
                    <input value={desiredDuration} onChange={e => setDesiredDuration(e.target.value)}
                      placeholder='e.g. "5 minutes", "under 60 seconds", "as short as possible"'
                      className={INPUT_CLS} />
                  </div>

                  <div className="border-t border-dashed border-gray-150" />

                  {/* Footage Delivery Method */}
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <Upload className="w-3 h-3 text-gray-400" /> How will you share your raw footage? <span className="text-red-500">*</span>
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                      {FOOTAGE_OPTIONS.map(opt => (
                        <button key={opt.value} type="button" onClick={() => setFootageDelivery(opt.value)}
                          className={cn(
                            "flex items-start gap-2.5 p-3.5 rounded-2xl border text-left transition-all duration-150 select-none hover:scale-[1.01] active:scale-[0.98]",
                            footageDelivery === opt.value
                              ? "bg-sky-50 border-sky-300 shadow-sm ring-2 ring-sky-500/10"
                              : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                          )}>
                          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5", footageDelivery === opt.value ? "bg-sky-100" : "bg-gray-100")}>
                            <Upload className={cn("w-3.5 h-3.5", footageDelivery === opt.value ? "text-sky-600" : "text-gray-400")} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-xs font-bold leading-none truncate", footageDelivery === opt.value ? "text-sky-800" : "text-gray-800")}>{opt.label}</p>
                            <p className={cn("text-[9.5px] mt-1 font-medium leading-snug", footageDelivery === opt.value ? "text-sky-500" : "text-gray-400")}>{opt.sub}</p>
                          </div>
                          {footageDelivery === opt.value && <Check className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" strokeWidth={3} />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Footage Link (conditional) */}
                  {footageOpt?.needsLink && (
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Link2 className="w-3 h-3" /> {footageOpt.label} folder link
                      </label>
                      <input value={footageLink} onChange={e => setFootageLink(e.target.value)}
                        placeholder={`Paste your ${footageOpt.label} share link here…`}
                        className={INPUT_CLS} />
                      <p className="text-[10px] text-gray-400 font-medium mt-1.5 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-gray-300 inline-block" />
                        Make sure sharing is set to &ldquo;Anyone with the link can view&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Raw footage size */}
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <HardDrive className="w-3 h-3" /> Approx. raw footage
                      <span className="font-normal normal-case tracking-normal text-gray-300 text-[9px]">(optional)</span>
                    </label>
                    <input value={rawFootageDuration} onChange={e => setRawFootageDuration(e.target.value)}
                      placeholder='e.g. "2 hours of clips", "30GB total", "about 15 minutes"'
                      className={INPUT_CLS} />
                    <p className="text-[10px] text-gray-400 font-medium mt-1.5 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-gray-300 inline-block" />
                      Helps the editor plan their time before they start
                    </p>
                  </div>
                </div>
              </div>

              {/* ── 2. Add-ons (moved up for mobile discoverability) ─ */}
              <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden">
                <div className="px-5 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                      <Plus className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-900">Upgrade Your Order</h3>
                      <p className="text-[11px] font-medium text-gray-400 mt-0.5">Optional add-ons to enhance delivery</p>
                    </div>
                  </div>
                  {addOnsCost > 0 && (
                    <span className="text-xs font-black text-amber-800 bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-full">
                      +{formatCurrency(addOnsCost)}
                    </span>
                  )}
                </div>
                <div className="p-4 space-y-2.5">
                  {[
                    { show: pkg.deliveryDays > 1,       key: "extraFast",       icon: <Zap className="w-4 h-4 text-amber-500" />,      title: "Extra Fast Delivery",      price: "+₹1,500", desc: `Delivery in ${Math.max(1, pkg.deliveryDays - 2)} days instead of ${pkg.deliveryDays}`,     checked: addOns.extraFast,          onChange: (v: boolean) => setAddOns(p => ({ ...p, extraFast: v })) },
                    { show: pkg.revisionCount !== -1,   key: "extraRevision",   icon: <RotateCcw className="w-4 h-4 text-violet-500" />, title: "Extra Revision Round",     price: "+₹500",   desc: `+1 revision · total ${pkg.revisionCount + 1} rounds`,                                  checked: addOns.extraRevision,       onChange: (v: boolean) => setAddOns(p => ({ ...p, extraRevision: v })) },
                    { show: !pkg.includesSourceFiles,   key: "sourceFiles",     icon: <Package2 className="w-4 h-4 text-emerald-600" />, title: "Source Files",             price: "+₹1,000", desc: "Premiere / After Effects project files on delivery",                                    checked: addOns.sourceFiles,         onChange: (v: boolean) => setAddOns(p => ({ ...p, sourceFiles: v })) },
                    { show: !pkg.includesCommercialRights, key: "commercialRights", icon: <Building2 className="w-4 h-4 text-sky-600" />, title: "Commercial Use License", price: "+₹750",   desc: "Full commercial rights for ads, branding & business",                                   checked: addOns.commercialRights,    onChange: (v: boolean) => setAddOns(p => ({ ...p, commercialRights: v })) },
                  ].filter(a => a.show).map(addon => (
                    <label key={addon.key}
                      className={cn(
                        "flex items-center gap-3.5 p-4 rounded-2xl border cursor-pointer select-none transition-all duration-155 hover:scale-[1.01]",
                        addon.checked ? "bg-[#1e40af]/[0.02] border-[#1e40af]/25 shadow-sm ring-2 ring-blue-500/10"
                          : "bg-gray-50/40 border-gray-150 hover:border-gray-200 hover:bg-gray-50"
                      )}>
                      <div className={cn("w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all",
                        addon.checked ? "bg-[#1e40af] border-[#1e40af] ring-2 ring-offset-1 ring-blue-500/20" : "border-gray-300 bg-white")}>
                        {addon.checked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                        <input type="checkbox" checked={addon.checked} onChange={e => addon.onChange(e.target.checked)} className="sr-only" />
                      </div>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-white border border-gray-100 flex items-center justify-center shrink-0 shadow-sm">{addon.icon}</div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-gray-900 leading-none">{addon.title}</p>
                          <p className="text-[10px] text-gray-400 font-medium mt-1.5 leading-snug">{addon.desc}</p>
                        </div>
                      </div>
                      <span className={cn("text-xs font-black shrink-0 tabular-nums", addon.checked ? "text-[#1e40af]" : "text-gray-500")}>{addon.price}</span>
                    </label>
                  ))}
                  {[pkg.deliveryDays <= 1, pkg.revisionCount === -1, !!pkg.includesSourceFiles, !!pkg.includesCommercialRights].every(Boolean) && (
                    <p className="text-xs text-gray-400 text-center py-3 font-medium">All available add-ons are already included in this package.</p>
                  )}
                </div>
              </div>

              {/* ── 3. Creative Direction ──────────────────────── */}
              <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden">
                <SectionHdr Icon={Film} iconBg="bg-blue-50 text-[#1e40af]" title="Creative Direction" sub="Vibe, music & colour grading" />
                <div className="p-5 space-y-7">

                  {/* Vibes */}
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      Vibe &amp; mood <span className="text-red-500">*</span>
                      <span className="font-normal normal-case tracking-normal text-gray-400 text-[9px]">(pick all that apply)</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {MOODS.map(m => {
                        const { label, Icon, color, bg, border } = MOOD_CONFIG[m];
                        const active = moods.includes(m);
                        return (
                          <button key={m} type="button" onClick={() => handleMoodToggle(m)}
                            className={cn(
                              "flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all duration-150 select-none hover:scale-[1.02] active:scale-[0.98]",
                              active ? `${bg} ${border} ${color} shadow-sm ring-2 ring-offset-2 ring-blue-500/10` : "border-gray-200 text-gray-500 bg-white hover:bg-gray-50 hover:border-gray-300"
                            )}>
                            <Icon className="w-3.5 h-3.5" />{label}
                            {active && <Check className="w-3 h-3 ml-0.5" strokeWidth={3} />}
                          </button>
                        );
                      })}
                    </div>
                    {moods.length === 0 && (
                      <p className="text-[10px] text-amber-600 font-semibold mt-2.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" /> Select at least one to continue
                      </p>
                    )}
                  </div>

                  {/* Music */}
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5 text-violet-500" /> Music preference
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {MUSIC_OPTIONS.map(opt => {
                        const OptIcon = opt.Icon;
                        const active = musicPref === opt.value;
                        return (
                          <button key={opt.value} type="button" onClick={() => setMusicPref(opt.value)}
                            className={cn(
                              "flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all duration-150 select-none hover:scale-[1.02] active:scale-[0.98]",
                              active ? "bg-violet-50/50 border-violet-300 shadow-sm ring-2 ring-violet-500/10" : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                            )}>
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", active ? "bg-violet-100/50" : "bg-gray-50")}>
                              <OptIcon className={cn("w-4 h-4", active ? "text-violet-600" : "text-gray-400")} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className={cn("text-xs font-bold block leading-tight", active ? "text-violet-850" : "text-gray-800")}>{opt.label}</span>
                              <span className={cn("text-[9.5px] mt-1 font-medium block leading-snug", active ? "text-violet-500" : "text-gray-400")}>{opt.sub}</span>
                            </div>
                            {active && <Check className="w-3.5 h-3.5 text-violet-600 ml-auto shrink-0 mt-0.5" strokeWidth={3} />}
                          </button>
                        );
                      })}
                    </div>
                    {/* Track info — shown when client provides music */}
                    {musicPref === "client_provides" && (
                      <div className="mt-3 bg-violet-50/40 border border-violet-100 rounded-2xl p-4">
                        <label className="text-[10px] font-black text-violet-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Music className="w-3 h-3" /> Track name or link
                        </label>
                        <input value={musicTrackInfo} onChange={e => setMusicTrackInfo(e.target.value)}
                          placeholder="Spotify link, YouTube URL, or track name & artist…"
                          className="w-full rounded-xl border border-violet-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-400 bg-white placeholder:text-violet-300 font-medium text-gray-700 transition-all" />
                      </div>
                    )}
                  </div>

                  {/* Color grading */}
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-amber-500" /> Color grading look
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {COLOR_OPTIONS.map(opt => {
                        const active = colorLook === opt.value;
                        return (
                          <button key={opt.value} type="button" onClick={() => setColorLook(opt.value)}
                            className={cn(
                              "flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all duration-150 select-none hover:scale-[1.02] active:scale-[0.98]",
                              active ? "bg-amber-50/50 border-amber-300 shadow-sm ring-2 ring-amber-500/10" : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                            )}>
                            <span className={cn("w-4 h-4 rounded-full shrink-0 transition-all border border-gray-200", opt.dot, active ? `ring-2 ring-offset-2 ${opt.ring}` : "")} />
                            <div className="flex-1 min-w-0">
                              <span className={cn("text-xs font-bold block leading-none", active ? "text-amber-850" : "text-gray-800")}>{opt.label}</span>
                              <span className={cn("text-[9.5px] mt-1 font-medium block leading-snug", active ? "text-amber-500" : "text-gray-400")}>{opt.sub}</span>
                            </div>
                            {active && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" strokeWidth={3} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 4. Reference Videos ────────────────────────── */}
              <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden">
                <SectionHdr Icon={Link2} iconBg="bg-sky-50 text-sky-600" title="Reference Videos" sub="YouTube, Vimeo, or Drive links · optional · up to 5" />
                <div className="p-5 space-y-3">
                  {referenceUrls.map((url, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex gap-2.5">
                        <input value={url}
                          onChange={e => handleUrlChange(idx, e.target.value)}
                          onBlur={e => handleUrlBlur(idx, e.target.value)}
                          placeholder="https://youtube.com/watch?v=..."
                          className={cn(INPUT_CLS, urlErrors[idx] ? "border-red-300 focus:border-red-400 focus:ring-red-500/10" : "")} />
                        {referenceUrls.length > 1 && (
                          <button type="button" onClick={() => handleRemoveUrl(idx)} aria-label="Remove"
                            className="w-12 h-12 flex items-center justify-center border border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500 hover:bg-red-50/50 rounded-2xl transition-all shrink-0">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {urlErrors[idx] && (
                        <p className="text-[10px] text-red-500 font-semibold ml-1">Must start with https:// — paste a full URL</p>
                      )}
                    </div>
                  ))}
                  {referenceUrls.length < 5 && (
                    <button type="button" onClick={handleAddUrl}
                      className="flex items-center gap-1.5 text-xs font-bold text-[#1e40af] hover:text-blue-900 transition-colors mt-1">
                      <Plus className="w-4 h-4" /> Add another link
                    </button>
                  )}
                </div>
              </div>

              {/* ── 5. Instructions, Brand & Deadline ─────────── */}
              <div className="bg-white rounded-3xl border border-gray-155 shadow-sm overflow-hidden">
                <SectionHdr Icon={AlignLeft} iconBg="bg-gray-100 text-gray-500" title="Instructions & Context" sub="What the editor must know before they start" />
                <div className="p-5 space-y-5">

                  {/* Must Include */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">
                      <Check className="w-3 h-3 text-emerald-500" strokeWidth={3} /> Must include
                      <span className="font-normal normal-case tracking-normal text-gray-300 text-[9px]">(optional)</span>
                    </label>
                    <textarea value={mustInclude} onChange={e => setMustInclude(e.target.value)}
                      placeholder="Specific sound effects, intros, lower thirds, text overlays, transitions you want…"
                      maxLength={500} rows={2} className={cn(INPUT_CLS, "resize-none")} />
                    <div className="flex justify-end mt-1">
                      <span className={cn("text-[10px] font-bold tabular-nums", mustInclude.length > 450 ? "text-amber-500" : "text-gray-300")}>{mustInclude.length}/500</span>
                    </div>
                  </div>

                  {/* Must Avoid */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">
                      <Ban className="w-3 h-3 text-red-500" strokeWidth={3} /> Must avoid
                      <span className="font-normal normal-case tracking-normal text-gray-300 text-[9px]">(optional)</span>
                    </label>
                    <textarea value={mustAvoid} onChange={e => setMustAvoid(e.target.value)}
                      placeholder="Certain transitions, copyright tracks, fast zooms, specific songs, effects…"
                      maxLength={500} rows={2} className={cn(INPUT_CLS, "resize-none")} />
                    <div className="flex justify-end mt-1">
                      <span className={cn("text-[10px] font-bold tabular-nums", mustAvoid.length > 450 ? "text-amber-500" : "text-gray-300")}>{mustAvoid.length}/500</span>
                    </div>
                  </div>

                  {/* Additional Notes */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">
                      <FileText className="w-3.5 h-3.5" /> Additional notes
                    </label>
                    <textarea value={additionalNotes} onChange={e => setAdditionalNotes(e.target.value)}
                      placeholder="Timeline flow, pacing notes, chapter/timestamp requests, specific clip timecodes, anything else the editor needs to know…"
                      maxLength={1000} rows={4} className={cn(INPUT_CLS, "resize-none")} />
                    <div className="flex justify-end mt-1">
                      <span className={cn("text-[10px] font-bold tabular-nums", additionalNotes.length > 900 ? "text-amber-500" : "text-gray-300")}>{additionalNotes.length}/1000</span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-gray-150" />

                  {/* Brand / Channel */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">
                      <Tag className="w-3 h-3 text-gray-400" /> Brand / channel notes
                      <span className="font-normal normal-case tracking-normal text-gray-300 text-[9px]">(optional)</span>
                    </label>
                    <textarea value={brandNotes} onChange={e => setBrandNotes(e.target.value)}
                      placeholder="Channel name, brand colours, logo placement, existing intro/outro style, fonts, do you have brand assets to share?…"
                      maxLength={500} rows={2} className={cn(INPUT_CLS, "resize-none")} />
                    <div className="flex justify-end mt-1">
                      <span className={cn("text-[10px] font-bold tabular-nums", brandNotes.length > 450 ? "text-amber-500" : "text-gray-300")}>{brandNotes.length}/500</span>
                    </div>
                  </div>

                  {/* Urgent Deadline */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">
                      <Calendar className="w-3 h-3 text-gray-400" /> Specific deadline
                      <span className="font-normal normal-case tracking-normal text-gray-300 text-[9px]">(optional)</span>
                    </label>
                    <input value={urgentDeadline} onChange={e => setUrgentDeadline(e.target.value)}
                      placeholder='e.g. "Need by Oct 15 for conference", "Must go live this Friday morning"'
                      className={INPUT_CLS} />
                    <p className="text-[10px] text-gray-400 font-medium mt-1.5 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-gray-300 inline-block" />
                      Only add if you have a real constraint beyond the package delivery window
                    </p>
                  </div>
                </div>

                {/* Save as Template — prominent, inside card */}
                <div className="mx-5 mb-5">
                  <div className={cn(
                    "rounded-2xl border p-4 transition-all",
                    saveAsTemplate ? "bg-[#1e40af]/[0.03] border-[#1e40af]/20" : "bg-gray-50/60 border-gray-150"
                  )}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn("w-7 h-7 rounded-xl flex items-center justify-center shrink-0", saveAsTemplate ? "bg-[#1e40af]/10" : "bg-gray-100")}>
                          <BookmarkPlus className={cn("w-3.5 h-3.5", saveAsTemplate ? "text-[#1e40af]" : "text-gray-400")} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-gray-800">Save this brief as a template</p>
                          <p className="text-[10px] text-gray-400 font-medium">Reuse next time you order — one click to restore all fields</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => setSaveAsTemplate(!saveAsTemplate)}
                        className={cn(
                          "w-9 h-5 rounded-full transition-all duration-200 shrink-0 relative",
                          saveAsTemplate ? "bg-[#1e40af]" : "bg-gray-200"
                        )}>
                        <span className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200", saveAsTemplate ? "right-0.5" : "left-0.5")} />
                      </button>
                    </div>
                    {saveAsTemplate && (
                      <input value={templateName} onChange={e => setTemplateName(e.target.value)}
                        placeholder='Template name, e.g. "My Gaming Highlight Brief"'
                        className="w-full mt-3 rounded-xl border border-[#1e40af]/20 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-[#1e40af] bg-white font-medium text-gray-700 placeholder:text-gray-300 transition-all" />
                    )}
                  </div>
                </div>
              </div>

              <button type="button"
                onClick={() => {
                  if (!contentType) { toast.error("Please select a video type first."); return; }
                  if (moods.length === 0) { toast.error("Please select at least one vibe first."); return; }
                  const selectedFootageOpt = FOOTAGE_OPTIONS.find(o => o.value === footageDelivery);
                  if (selectedFootageOpt?.needsLink && !footageLink.trim()) {
                    toast.error(`Paste your ${selectedFootageOpt.label} link so the editor can access your footage.`);
                    return;
                  }
                  if (saveAsTemplate && !templateName.trim()) {
                    toast.error("Enter a name for your template, or turn off template saving.");
                    return;
                  }
                  persistTemplate();
                  setStep(2); window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="hidden md:flex w-full py-4 rounded-xl font-black text-white text-sm bg-[#1e40af] hover:bg-blue-800 items-center justify-center gap-2 transition-all shadow-md shadow-[#1e40af]/20 hover:shadow-lg active:scale-[0.98]">
                Review &amp; Pay <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ═══════════ STEP 2: Confirm & Pay ═══════════ */}
          {step === 2 && (
            <div className="space-y-6">

              {/* Brief summary */}
              <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-black text-gray-900">Your Brief</h2>
                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">What you&apos;ve configured for the editor</p>
                  </div>
                  <button type="button" onClick={() => setStep(1)}
                    className="flex items-center gap-1.5 text-xs font-black text-[#1e40af] hover:text-blue-900 border border-[#1e40af]/25 bg-[#1e40af]/5 hover:bg-[#1e40af]/10 px-3 py-1.5 rounded-xl transition-all active:scale-[0.98]">
                    <RefreshCw className="w-3 h-3" /> Edit Brief
                  </button>
                </div>
                <div className="p-5 space-y-5">

                  {/* Project Overview */}
                  {(contentType || targetPlatform || desiredDuration) && (
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-2.5">Project Overview</p>
                      <div className="flex flex-wrap gap-1.5">
                        {contentTypeLabel && (
                          <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border bg-orange-50 border-orange-200 text-orange-800">
                            <Clapperboard className="w-3 h-3" />{contentTypeLabel}
                          </span>
                        )}
                        {platformLabel && (
                          <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border bg-blue-50 border-blue-200 text-blue-800">
                            <Globe className="w-3 h-3" />{platformLabel}
                          </span>
                        )}
                        {desiredDuration && (
                          <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border bg-gray-100 border-gray-200 text-gray-700">
                            <Timer className="w-3 h-3" />{desiredDuration}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Footage Delivery */}
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-2">Footage Delivery</p>
                    <div className={cn("flex items-start gap-2.5 rounded-2xl px-4 py-3", footageOpt?.needsLink ? "bg-sky-50 border border-sky-100" : "bg-gray-50 border border-gray-100")}>
                      <Upload className={cn("w-4 h-4 shrink-0 mt-0.5", footageOpt?.needsLink ? "text-sky-600" : "text-gray-500")} />
                      <div>
                        <p className={cn("text-xs font-bold", footageOpt?.needsLink ? "text-sky-800" : "text-gray-700")}>{footageOpt?.label ?? "—"}</p>
                        {footageLink && footageOpt?.needsLink && (
                          <p title={footageLink} className="text-[10px] text-sky-600 font-medium mt-0.5 break-all">{footageLink.length > 50 ? footageLink.slice(0, 50) + "…" : footageLink}</p>
                        )}
                        {rawFootageDuration && (
                          <p className="text-[10px] text-gray-500 font-medium mt-0.5">Approx: {rawFootageDuration}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Mood */}
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-2.5">Vibe &amp; Mood</p>
                    <div className="flex flex-wrap gap-1.5">
                      {moods.map(m => {
                        const cfg = MOOD_CONFIG[m];
                        const MoodIcon = cfg?.Icon;
                        return (
                          <span key={m} className={cn("flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border", cfg?.bg, cfg?.border, cfg?.color)}>
                            {MoodIcon && <MoodIcon className="w-3.5 h-3.5" />}{cfg?.label ?? m}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Music + Color */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-150">
                      <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-2">Music</p>
                      <div className="flex items-center gap-2">
                        <MusicIcon className="w-4 h-4 text-violet-500 shrink-0" />
                        <div>
                          <span className="text-xs font-bold text-gray-800 block">{musicLabel}</span>
                          {musicPref === "client_provides" && musicTrackInfo && (
                            <span className="text-[10px] text-gray-500 font-medium block mt-0.5 truncate">{musicTrackInfo}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-150">
                      <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-2">Color Grade</p>
                      <div className="flex items-center gap-2">
                        <span className={cn("w-3.5 h-3.5 rounded-full border border-gray-200 shrink-0", colorOpt?.dot ?? "bg-gray-400")} />
                        <span className="text-xs font-bold text-gray-800">{colorOpt?.label ?? colorLook}</span>
                      </div>
                    </div>
                  </div>

                  {/* References */}
                  {cleanRefUrls.length > 0 && (
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-2">References</p>
                      <div className="flex items-center gap-2.5 bg-sky-50 border border-sky-100 rounded-2xl px-4 py-3">
                        <Link2 className="w-4 h-4 text-sky-600 shrink-0" />
                        <span className="text-xs font-bold text-sky-800">{cleanRefUrls.length} reference link{cleanRefUrls.length !== 1 ? "s" : ""} attached</span>
                      </div>
                    </div>
                  )}

                  {/* Instructions */}
                  {(mustInclude || mustAvoid || additionalNotes || brandNotes || urgentDeadline) && (
                    <div className="border-t border-gray-100 pt-5 space-y-3">
                      {mustInclude && (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                          <p className="text-[9px] font-black uppercase tracking-wider text-emerald-600 mb-1.5">Must Include</p>
                          <p className="text-xs text-gray-700 leading-relaxed font-semibold">{mustInclude.slice(0, 160)}{mustInclude.length > 160 ? "…" : ""}</p>
                        </div>
                      )}
                      {mustAvoid && (
                        <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                          <p className="text-[9px] font-black uppercase tracking-wider text-red-500 mb-1.5">Must Avoid</p>
                          <p className="text-xs text-gray-700 leading-relaxed font-semibold">{mustAvoid.slice(0, 160)}{mustAvoid.length > 160 ? "…" : ""}</p>
                        </div>
                      )}
                      {additionalNotes && (
                        <div className="bg-gray-50 border border-gray-150 rounded-2xl p-4">
                          <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1.5">Additional Notes</p>
                          <p className="text-xs text-gray-600 leading-relaxed font-semibold">{additionalNotes.slice(0, 200)}{additionalNotes.length > 200 ? "…" : ""}</p>
                        </div>
                      )}
                      {brandNotes && (
                        <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4">
                          <p className="text-[9px] font-black uppercase tracking-wider text-[#1e40af] mb-1.5">Brand / Channel</p>
                          <p className="text-xs text-gray-700 leading-relaxed font-semibold">{brandNotes.slice(0, 160)}{brandNotes.length > 160 ? "…" : ""}</p>
                        </div>
                      )}
                      {urgentDeadline && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-wider text-amber-600 mb-0.5">Specific Deadline</p>
                            <p className="text-xs text-amber-900 font-bold">{urgentDeadline}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Base package inclusions */}
                  {inclusions.length > 0 && (
                    <div className="border-t border-gray-100 pt-5">
                      <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-2.5">Included in Package</p>
                      <div className="flex flex-wrap gap-2">
                        {inclusions.map(l => (
                          <span key={l} className="flex items-center gap-1 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-full">
                            <Check className="w-3 h-3" />{l}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add-ons */}
                  {activeAddOnLabels.length > 0 && (
                    <div className="border-t border-gray-100 pt-5">
                      <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-2.5">Upgrades Selected</p>
                      <div className="flex flex-wrap gap-2">
                        {activeAddOnLabels.map(l => (
                          <span key={l} className="flex items-center gap-1 text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100 px-3 py-1.5 rounded-full">
                            <Check className="w-3 h-3" />{l}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Credits */}
              {availableCredits > 0 && (
                <div className="bg-[#f0fdf4] border border-emerald-200 rounded-3xl p-5 flex items-center justify-between gap-4 shadow-sm">
                  <div>
                    <p className="text-sm font-black text-emerald-800">{formatCurrency(availableCredits)} in credits available</p>
                    <p className="text-xs font-semibold text-emerald-600 mt-1">
                      {useCredits && creditsApplied < availableCredits
                        ? `${formatCurrency(availableCredits - creditsApplied)} stays in your account`
                        : "Apply to reduce your order cost"}
                    </p>
                  </div>
                  <button type="button" onClick={() => setUseCredits(!useCredits)}
                    className={cn("px-4 py-2.5 rounded-xl text-xs font-black border transition-all shrink-0 active:scale-[0.98]",
                      useCredits ? "bg-emerald-600 border-emerald-600 text-white shadow-sm" : "border-emerald-300 text-emerald-700 hover:bg-emerald-100/50 bg-white")}>
                    {useCredits
                      ? <span className="flex items-center gap-1.5"><X className="w-3.5 h-3.5" strokeWidth={3} /> Remove</span>
                      : "Apply Credits"}
                  </button>
                </div>
              )}

              {/* Order Summary & Pay */}
              <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-black text-gray-900">Payment Summary</h2>
                </div>
                <form onSubmit={handleCheckout}>
                  <div className="px-5 py-5 space-y-3.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 font-medium">{pkg.title}</span>
                      <span className="tabular-nums font-bold text-gray-800">{formatCurrency(pkg.price)}</span>
                    </div>
                    {addOnsCost > 0 && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500 font-medium">Add-ons ({activeAddOnLabels.length})</span>
                        <span className="tabular-nums font-bold text-amber-600">+{formatCurrency(addOnsCost)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400 font-medium">
                        Processing Fee ({processingFeePct}%)
                        <span className="block text-[9px] font-medium text-gray-300 mt-0.5">Platform, payment & escrow</span>
                      </span>
                      <span className="tabular-nums font-bold text-gray-400">{formatCurrency(processingFee)}</span>
                    </div>
                    {creditsApplied > 0 && (
                      <div className="flex justify-between items-center text-xs text-emerald-700 font-bold">
                        <span>Credits Applied</span>
                        <span className="tabular-nums">−{formatCurrency(creditsApplied)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center border-t border-gray-100 pt-4 mt-2">
                      <span className="font-bold text-gray-900 text-sm">Total Charge</span>
                      <span className="tabular-nums font-black text-xl text-[#1e40af]">{formatCurrency(chargeAmount)}</span>
                    </div>
                  </div>
                  <div className="px-5 pb-5 space-y-4">
                    <button type="submit" disabled={loading}
                      className="hidden md:flex w-full py-4 rounded-xl font-black text-white text-sm bg-[#1e40af] hover:bg-blue-800 items-center justify-center gap-2 disabled:opacity-60 transition-all shadow-md shadow-[#1e40af]/20 hover:shadow-lg active:scale-[0.98]">
                      {loading
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                        : <><CreditCard className="w-4 h-4" /> Pay {formatCurrency(chargeAmount)} &amp; Start Order</>}
                    </button>
                    <div className="flex items-start gap-2.5 bg-amber-50/60 border border-amber-200/60 rounded-2xl px-4 py-3">
                      <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber-800 font-semibold leading-snug">
                        Payment is final — orders cannot be cancelled without the editor&apos;s consent. Review everything above before paying.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-4 flex-wrap">
                      {[
                        { icon: <Shield className="w-3.5 h-3.5 text-emerald-500" />, label: "Escrow protected" },
                        { icon: <Lock className="w-3.5 h-3.5 text-gray-400" />, label: "Secure payment" },
                        { icon: <RefreshCw className="w-3.5 h-3.5 text-gray-400" />, label: "Refund policy" },
                      ].map((t, i) => (
                        <span key={i} className="flex items-center gap-1 text-[10px] text-gray-400 font-bold">{t.icon} {t.label}</span>
                      ))}
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <aside className="hidden md:block">
          <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden sticky top-[73px]">
            <div className="relative bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 px-5 py-5 overflow-hidden">
              <div className="absolute inset-0 opacity-[0.03]"
                style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
              <div className="relative flex items-center gap-3">
                {pkg.editorImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pkg.editorImage} alt={pkg.editorName} className="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 border border-blue-400/25">
                    <span className="text-xs font-black text-sky-400 uppercase">{(pkg.editorName ?? "?").substring(0, 2)}</span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[8px] font-black uppercase tracking-widest text-sky-400 mb-0.5">Your Order</p>
                  <p className="font-black text-white text-xs leading-snug truncate" title={pkg.title}>{pkg.title}</p>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5 truncate">by {displayNameFromFull(pkg.editorName)}</p>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 space-y-3 border-b border-gray-100 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 flex items-center gap-2 font-bold"><Truck className="w-4 h-4" /> Delivery</span>
                <span className="font-black text-gray-900 flex items-center gap-2">
                  {addOns.extraFast ? Math.max(1, pkg.deliveryDays - 2) : pkg.deliveryDays} days
                  {addOns.extraFast && <span className="text-[8px] bg-amber-100 text-amber-700 font-black px-2 py-0.5 rounded-full">FAST</span>}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 flex items-center gap-2 font-bold"><Repeat2 className="w-4 h-4" /> Revisions</span>
                <span className="font-black text-gray-900">{pkg.revisionCount === -1 ? "Unlimited" : `${pkg.revisionCount + (addOns.extraRevision ? 1 : 0)} rounds`}</span>
              </div>
              {contentTypeLabel && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 flex items-center gap-2 font-bold"><Clapperboard className="w-4 h-4" /> Type</span>
                  <span className="font-bold text-gray-700 text-[11px]">{contentTypeLabel}</span>
                </div>
              )}
            </div>

            {activeAddOnLabels.length > 0 && (
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/20">
                <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-3">Upgrades Added</p>
                <div className="space-y-2">
                  {activeAddOnLabels.map(l => (
                    <div key={l} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                      </div>
                      <span className="text-[11px] font-bold text-gray-600">{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="px-5 py-4 space-y-2.5 border-b border-gray-100">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400 font-medium">Package</span>
                <span className="font-bold text-gray-800 tabular-nums">{formatCurrency(pkg.price)}</span>
              </div>
              {addOnsCost > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400 font-medium">Upgrades</span>
                  <span className="font-bold text-amber-600 tabular-nums">+{formatCurrency(addOnsCost)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-gray-400 font-medium">Processing ({processingFeePct}%)</span>
                <span className="font-bold text-gray-400 tabular-nums">{formatCurrency(processingFee)}</span>
              </div>
              {creditsApplied > 0 && (
                <div className="flex justify-between text-xs text-emerald-700 font-bold">
                  <span>Credits</span><span className="tabular-nums">−{formatCurrency(creditsApplied)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-3 border-t border-gray-100 mt-1">
                <span className="text-xs font-black text-gray-700">Total</span>
                <span className="font-black text-[#1e40af] tabular-nums text-lg">{formatCurrency(chargeAmount)}</span>
              </div>
            </div>

            <div className="px-5 py-4 bg-gray-50/30">
              <div className="bg-[#f0fdf4] border border-emerald-100 rounded-2xl px-4 py-3.5 flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-black text-emerald-800">Held in escrow</p>
                  <p className="text-[10px] text-emerald-600 font-semibold mt-1 leading-snug">Released only when you approve delivery</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ── Mobile sticky bottom bar ── */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white/95 backdrop-blur-md border-t border-gray-150 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] px-4 py-3.5 z-50">
        <div className="flex items-center gap-3">
          <div className="shrink-0">
            <p className="text-[8px] text-gray-400 font-black uppercase tracking-wider leading-none mb-1.5">
              {step === 0 ? "Package" : step === 1 ? "Running total" : "You pay"}
            </p>
            <p className="font-black text-gray-950 text-lg leading-none tabular-nums">{formatCurrency(chargeAmount)}</p>
            {addOnsCost > 0 && <p className="text-[9px] text-amber-600 font-bold mt-1">incl. add-ons</p>}
          </div>
          <button type="button" onClick={goNext} disabled={loading}
            className="flex-1 py-3.5 rounded-xl font-black text-white text-sm bg-[#1e40af] hover:bg-blue-800 flex items-center justify-center gap-2 disabled:opacity-60 transition-all active:scale-[0.98] shadow-md shadow-[#1e40af]/20">
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

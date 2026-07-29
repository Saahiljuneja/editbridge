"use client";

import { useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { SkillTags } from "@/components/editor/skill-tags";
import { ToolTags } from "@/components/editor/tool-tags";
import { PortfolioSection, type PortfolioItem as PortfolioItemType } from "@/components/editor/portfolio-section";
import { ProfileScoreCard } from "@/components/editor/profile-score-card";
import type { ProfileScoreItem } from "@/lib/profile-score";
import {
  CheckCircle, Camera, Eye, Share2,
  Save, TrendingUp, Star,
  MapPin, MessageCircle, Plus, X, ChevronDown,
  Briefcase, Clock, Zap, HelpCircle,
  Layers, BookOpen, Video, Sliders, PauseCircle,
  Film, Play, Image as ImageIcon, Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PROFILE_FRAMES, type FrameKey } from "@/lib/xp-shop-config";
import { ImageCropModal } from "@/components/common/image-crop-modal";
import { getEmbedUrl } from "@/lib/portfolio-media";
import { hasContactInfo } from "@/lib/contact-info";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Language { language: string; level: string; }
interface TurnaroundItem { type: string; days: number; }
interface FaqItem { question: string; answer: string; }

// ─── Constants ────────────────────────────────────────────────────────────────

const NICHE_PRESETS = [
  "YouTube Long-form Editor", "Instagram Reels & Shorts", "Wedding & Event Films",
  "Corporate & Brand Videos", "Podcast Video Editing", "Product Ads & Commercials",
  "Music Videos", "Documentary & Short Films", "Animated Explainer Videos",
  "Real Estate Walkthrough Videos", "Gaming & Streaming Content", "Travel & Lifestyle Vlogs",
];

const WORK_STYLE_OPTIONS = [
  "Fast turnaround", "Cinematic style", "Open to feedback", "Detail-oriented",
  "Creative freedom", "Minimal revisions", "Color grading pro", "Motion graphics",
  "Audio mixing", "Subtitles & captions",
];

const TURNAROUND_SUGGESTIONS = [
  { type: "60-sec Reel / Short", days: 1 },
  { type: "3–5 min YouTube video", days: 3 },
  { type: "10–20 min YouTube video", days: 5 },
  { type: "30-sec Ad / Promo", days: 2 },
  { type: "Wedding highlight reel", days: 7 },
  { type: "Podcast episode edit", days: 2 },
];

const EXPERIENCE_LEVELS = [
  { value: "entry",        label: "Entry",        desc: "Still building your portfolio" },
  { value: "intermediate", label: "Intermediate", desc: "Consistent client work"        },
  { value: "expert",       label: "Expert",       desc: "Deep specialization"           },
];

const FAQ_SUGGESTIONS = [
  "What file formats do you accept?",
  "Do you provide revision rounds?",
  "Can I see samples of your previous work?",
  "What software do you edit with?",
  "Do you add music and sound effects?",
  "How do you handle feedback and changes?",
  "What is your typical turnaround time?",
  "Do you offer rush delivery?",
];

const LANGUAGE_LEVELS = ["Basic", "Conversational", "Fluent", "Native/Bilingual"];
const COMMON_LANGUAGES = [
  "English", "Hindi", "Tamil", "Telugu", "Kannada", "Malayalam",
  "Bengali", "Marathi", "Gujarati", "Punjabi", "Urdu",
  "Spanish", "French", "German", "Arabic", "Portuguese", "Japanese",
];

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  icon: Icon, title, description, action, children,
}: {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-[var(--brand-client)] shrink-0 mt-px" />}
          <div>
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  editorId: string;
  userName: string;
  userImage: string | null;
  userEmail: string;
  initialBio: string;
  initialDisplayName: string;
  initialTitle: string;
  initialLanguages: Language[];
  initialNiches: string[];
  initialExperienceLevel: string;
  initialYearsOfExperience: number | null;
  initialWorkStyleTags: string[];
  initialTurnaround: TurnaroundItem[];
  initialFaqs: FaqItem[];
  initialSkills: string[];
  initialTools: string[];
  initialIsAvailable: boolean;
  initialVacationUntil: Date | null;
  initialLocation: string;
  initialPreviousClients: string;
  initialMaxActiveOrders: number | null;
  initialCoverImage: string | null;
  initialFeaturedVideoUrl: string;
  initialPortfolio: PortfolioItemType[];
  kycStatus: string | null;
  profileScore: number;
  profileMaxScore: number;
  profileScoreItems: ProfileScoreItem[];
  totalOrders: number;
  completionRate: number | null;
  ownedFrames: string[];
  activeFrame: string | null;
  maxFileSizeMb: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProfileClient({
  editorId,
  userName, userImage, userEmail,
  initialBio, initialDisplayName, initialTitle, initialLanguages,
  initialNiches, initialExperienceLevel, initialYearsOfExperience,
  initialWorkStyleTags, initialTurnaround, initialFaqs,
  initialSkills, initialTools, initialIsAvailable, initialVacationUntil,
  initialLocation, initialPreviousClients, initialMaxActiveOrders, initialCoverImage, initialFeaturedVideoUrl,
  initialPortfolio, kycStatus,
  profileScore, profileMaxScore, profileScoreItems,
  totalOrders, completionRate,
  ownedFrames: initialOwnedFrames,
  activeFrame: initialActiveFrame,
  maxFileSizeMb,
}: Props) {
  // ── State ──
  const [ownedFrames] = useState(new Set(initialOwnedFrames));
  const [currentFrame, setCurrentFrame] = useState<string | null>(initialActiveFrame);
  const [settingFrame, setSettingFrame] = useState<string | null>(null);
  const [bio, setBio] = useState(initialBio);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [title, setTitle] = useState(initialTitle);
  const [languages, setLanguages] = useState<Language[]>(initialLanguages);
  const [niches, setNiches] = useState<string[]>(initialNiches);
  const [customNicheInput, setCustomNicheInput] = useState("");
  const [customWorkStyleInput, setCustomWorkStyleInput] = useState("");
  const [experienceLevel, setExperienceLevel] = useState(initialExperienceLevel);
  const [yearsOfExperience, setYearsOfExperience] = useState<number | null>(initialYearsOfExperience);
  const [workStyleTags, setWorkStyleTags] = useState<string[]>(initialWorkStyleTags);
  const [turnaround, setTurnaround] = useState<TurnaroundItem[]>(initialTurnaround);
  const [faqs, setFaqs] = useState<FaqItem[]>(initialFaqs);
  const [editorSkills, setEditorSkills] = useState(initialSkills);
  const [editorTools, setEditorTools] = useState(initialTools);
  const [isAvailable, setIsAvailable] = useState(initialIsAvailable);
  const [vacationUntil, setVacationUntil] = useState<Date | null>(initialVacationUntil);
  const [vacationDateInput, setVacationDateInput] = useState("");
  const [savingVacation, setSavingVacation] = useState(false);
  const [location, setLocation] = useState(initialLocation);
  const [previousClients, setPreviousClients] = useState(initialPreviousClients);
  const [maxActiveOrders, setMaxActiveOrders] = useState<number | null>(initialMaxActiveOrders);
  const [featuredVideoUrl, setFeaturedVideoUrl] = useState(initialFeaturedVideoUrl);
  const [saving, setSaving] = useState(false);
  const { update: updateSession } = useSession();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"profile" | "skills" | "portfolio">(
    tabParam === "skills" || tabParam === "portfolio" ? tabParam : "profile"
  );
  const [currentImage, setCurrentImage] = useState(userImage);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(initialCoverImage);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverCropSrc, setCoverCropSrc] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Support deep-linking to a tab (e.g. from the profile completion score card).
  // Adjusted during render (not an effect) so it takes effect on the same paint
  // instead of causing an extra render pass.
  const [lastTabParam, setLastTabParam] = useState(tabParam);
  if (tabParam !== lastTabParam) {
    setLastTabParam(tabParam);
    if (tabParam === "skills" || tabParam === "portfolio") setActiveTab(tabParam);
  }
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handlePhotoUpload(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file."); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Image must be under 10MB."); return; }
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function uploadCroppedPhoto(blob: Blob) {
    setCropSrc(null);
    setUploadingPhoto(true);
    try {
      const { presignedUrl, publicUrl } = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: "avatar.jpg", contentType: "image/jpeg", uploadType: "avatar" }),
      }).then((r) => r.json());

      await fetch(presignedUrl, { method: "PUT", body: blob, headers: { "Content-Type": "image/jpeg" } });

      await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: publicUrl }),
      });

      setCurrentImage(publicUrl);
      await updateSession?.({ image: publicUrl });
      toast.success("Profile photo updated!");
    } catch {
      toast.error("Failed to upload photo.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  function handleCoverUpload(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file."); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Cover image must be under 10MB."); return; }
    const reader = new FileReader();
    reader.onload = () => setCoverCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function uploadCroppedCover(blob: Blob) {
    setCoverCropSrc(null);
    setUploadingCover(true);
    try {
      const { presignedUrl, publicUrl } = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: "cover.jpg", contentType: "image/jpeg", uploadType: "cover" }),
      }).then((r) => r.json());

      await fetch(presignedUrl, { method: "PUT", body: blob, headers: { "Content-Type": "image/jpeg" } });

      await fetch("/api/editor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverImage: publicUrl }),
      });

      setCoverImage(publicUrl);
      toast.success("Cover image updated!");
    } catch {
      toast.error("Failed to upload cover image.");
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleRemoveCover() {
    try {
      await fetch("/api/editor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverImage: null }),
      });
      setCoverImage(null);
      toast.success("Cover image removed.");
    } catch {
      toast.error("Failed to remove cover image.");
    }
  }

  void userEmail;

  const initials = userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const profileUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/editor/${editorId}`;

  // ── Frame ──
  async function handleSetFrame(frameKey: string | null) {
    setSettingFrame(frameKey ?? "__clear__");
    try {
      const res = await fetch("/api/xp-shop/set-frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frameKey }),
      });
      if (!res.ok) { toast.error("Failed to update frame"); return; }
      setCurrentFrame(frameKey);
      toast.success(frameKey ? "Frame activated!" : "Frame removed.");
    } finally {
      setSettingFrame(null);
    }
  }

  // ── Save ──
  async function handleSave() {
    setSaving(true);
    try {
      if (bioHasContact) {
        toast.error("Bio cannot contain contact information.");
        setSaving(false);
        return;
      }
      if (titleHasContact) {
        toast.error("Profile title cannot contain contact information.");
        setSaving(false);
        return;
      }
      if (displayNameHasContact) {
        toast.error("Display name cannot contain contact information.");
        setSaving(false);
        return;
      }
      if (locationHasContact) {
        toast.error("Location cannot contain contact information.");
        setSaving(false);
        return;
      }
      if (previousClientsHasContact) {
        toast.error("Previously worked with cannot contain contact information.");
        setSaving(false);
        return;
      }
      if (turnaroundHasContact) {
        toast.error("Turnaround time labels cannot contain contact information.");
        setSaving(false);
        return;
      }
      if (faqsHaveContact) {
        toast.error("FAQ questions and answers cannot contain contact information.");
        setSaving(false);
        return;
      }
      if (featuredVideoInvalid) {
        toast.error("Featured video must be a valid YouTube, Vimeo, or Google Drive URL.");
        setSaving(false);
        return;
      }
      const cleanedFaqs = faqs.filter(f => f.question.trim() && f.answer.trim());
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: bio.trim() || null,
          displayName: displayName.trim() || null,
          title: title.trim() || null,
          languages: languages.length > 0 ? languages : null,
          niches: niches.length > 0 ? niches : null,
          experienceLevel: experienceLevel || null,
          yearsOfExperience,
          workStyleTags: workStyleTags.length > 0 ? workStyleTags : null,
          turnaround: turnaround.length > 0 ? turnaround : null,
          faqs: cleanedFaqs.length > 0 ? cleanedFaqs : null,
          skills: editorSkills,
          tools: editorTools,
          isAvailable,
          location: location.trim() || null,
          previousClients: previousClients.trim() || null,
          maxActiveOrders: maxActiveOrders ?? null,
          featuredVideoUrl: featuredVideoUrl.trim() || null,
        }),
      });
      if (!res.ok) { toast.error("Failed to save profile."); return; }
      toast.success("Profile saved!");
    } catch { toast.error("Something went wrong."); }
    finally { setSaving(false); }
  }

  async function handleSetVacation() {
    if (!vacationDateInput) return;
    const date = new Date(vacationDateInput);
    if (isNaN(date.getTime()) || date <= new Date()) {
      toast.error("Please pick a future date.");
      return;
    }
    setSavingVacation(true);
    try {
      const res = await fetch("/api/editor/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vacationUntil: date.toISOString() }),
      });
      if (!res.ok) { toast.error("Failed to set vacation mode."); return; }
      setVacationUntil(date);
      setIsAvailable(false);
      setVacationDateInput("");
      toast.success("Vacation mode activated. You'll be auto-resumed on " + date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }));
    } catch { toast.error("Something went wrong."); }
    finally { setSavingVacation(false); }
  }

  async function handleCancelVacation() {
    setSavingVacation(true);
    try {
      const res = await fetch("/api/editor/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vacationUntil: null }),
      });
      if (!res.ok) { toast.error("Failed to cancel vacation."); return; }
      setVacationUntil(null);
      setIsAvailable(true);
      toast.success("Vacation mode cancelled. You're available again.");
    } catch { toast.error("Something went wrong."); }
    finally { setSavingVacation(false); }
  }

  const inputClass = "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[var(--brand-client)] focus:ring-2 focus:ring-[var(--brand-client)]/10 bg-white transition-all";

  const bioHasContact = hasContactInfo(bio);
  const titleHasContact = hasContactInfo(title);
  const displayNameHasContact = hasContactInfo(displayName);
  const locationHasContact = hasContactInfo(location);
  const previousClientsHasContact = hasContactInfo(previousClients);
  const customNicheHasContact = hasContactInfo(customNicheInput);
  const customWorkStyleHasContact = hasContactInfo(customWorkStyleInput);
  const turnaroundHasContact = turnaround.some(t => hasContactInfo(t.type));
  const faqsHaveContact = faqs.some(f => hasContactInfo(f.question) || hasContactInfo(f.answer));

  // ── Featured video preview/validation ──
  const featuredVideoEmbedUrl = featuredVideoUrl.trim() ? getEmbedUrl(featuredVideoUrl.trim()) : null;
  const featuredVideoInvalid = !!featuredVideoUrl.trim() && !featuredVideoEmbedUrl;

  // ── Portfolio tab breakdown (view/like/comment performance now lives on Analytics) ──
  const portfolioFeaturedCount = initialPortfolio.filter(p => p.isFeatured).length;
  const portfolioVideoCount  = initialPortfolio.filter(p => p.type === "video").length;
  const portfolioImageCount  = initialPortfolio.filter(p => p.type === "image").length;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50/70">

      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          shape="round"
          aspect={1}
          onConfirm={uploadCroppedPhoto}
          onCancel={() => setCropSrc(null)}
        />
      )}

      {coverCropSrc && (
        <ImageCropModal
          imageSrc={coverCropSrc}
          shape="rect"
          aspect={4 / 1}
          onConfirm={uploadCroppedCover}
          onCancel={() => setCoverCropSrc(null)}
        />
      )}

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-6 py-3.5">
        <div className="px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-900">My Profile</h1>
            <p className="text-xs text-gray-400">Manage how clients see you on EditBridge</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { navigator.clipboard?.writeText(profileUrl); toast.success("Profile link copied!"); }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
            <Link
              href={`/editor/${editorId}`}
              target="_blank"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" /> Preview
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
              style={{ background: "var(--brand-client)" }}
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 ">
        <div className="grid lg:grid-cols-[1fr_280px] gap-5 items-start">

          {/* ── Left (main content) ── */}
          <div className="space-y-4">

            {/* ── Profile identity card ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex gap-4 items-start">

                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gradient-to-br from-[var(--brand-client)] to-[#6366F1] flex items-center justify-center">
                    {currentImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={currentImage} alt={userName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-xl font-bold">{initials}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[var(--brand-client)] flex items-center justify-center border-2 border-white shadow-sm hover:bg-indigo-500 transition-colors disabled:opacity-60"
                  >
                    <Camera className={cn("w-2.5 h-2.5 text-white", uploadingPhoto && "animate-pulse")} />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); e.target.value = ""; }} />
                </div>

                {/* Fields */}
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-400">Display name</Label>
                      <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} placeholder="Your name" className={cn(inputClass, displayNameHasContact && "border-red-300 focus:border-red-400 focus:ring-red-100")} />
                      {displayNameHasContact && <p className="text-xs text-red-500">Contact info not allowed.</p>}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-400">Profile title</Label>
                      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="e.g. YouTube & Reels Editor" className={cn(inputClass, titleHasContact && "border-red-300 focus:border-red-400 focus:ring-red-100")} />
                      {titleHasContact && <p className="text-xs text-red-500">Contact info not allowed in title.</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {kycStatus === "approved" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        <CheckCircle className="w-3 h-3" /> KYC Verified
                      </span>
                    ) : (
                      <Link href="/editor/kyc" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors">
                        Complete KYC →
                      </Link>
                    )}
                    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border", isAvailable ? "bg-green-50 text-green-700 border-green-100" : "bg-gray-100 text-gray-500 border-gray-200")}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", isAvailable ? "bg-green-500" : "bg-gray-400")} />
                      {isAvailable ? "Available" : "Unavailable"}
                    </span>
                    {location && <span className="flex items-center gap-1 text-xs text-gray-400"><MapPin className="w-3 h-3" />{location}</span>}
                  </div>
                </div>

                {/* Stats */}
                <div className="hidden sm:flex items-center gap-5 shrink-0 text-right">
                  <div>
                    <p className="text-lg font-bold text-gray-900">{totalOrders}</p>
                    <p className="text-xs text-gray-400">Orders</p>
                  </div>
                  <div className="w-px h-7 bg-gray-100" />
                  <div>
                    <p className="text-lg font-bold text-gray-900">{completionRate != null ? `${completionRate}%` : "—"}</p>
                    <p className="text-xs text-gray-400">Completion</p>
                  </div>
                </div>
              </div>

              {/* Availability row */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <Switch checked={isAvailable} onCheckedChange={setIsAvailable} />
                  <span className="text-sm text-gray-700 font-medium">Available for new orders</span>
                </div>

<div className="flex items-center gap-2 shrink-0">
                  <Sliders className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs text-gray-500">Max orders</span>
                  <input type="number" min={1} max={50} value={maxActiveOrders ?? ""} onChange={(e) => setMaxActiveOrders(e.target.value ? Number(e.target.value) : null)} placeholder="∞" className="w-14 px-2 py-1 rounded-lg border border-gray-200 text-xs text-center outline-none focus:border-[var(--brand-client)] bg-white" />
                  {maxActiveOrders !== null && <button onClick={() => setMaxActiveOrders(null)} className="text-gray-300 hover:text-red-400 transition-colors"><X className="w-3 h-3" /></button>}
                </div>
              </div>

              {/* Vacation mode */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                {vacationUntil && vacationUntil > new Date() ? (
                  <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 flex-wrap">
                    <div className="flex items-center gap-2 text-xs text-amber-800">
                      <PauseCircle className="w-4 h-4 text-amber-500 shrink-0" />
                      On vacation until <strong>{vacationUntil.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</strong> — you&apos;ll be marked available again automatically.
                    </div>
                    <button onClick={handleCancelVacation} disabled={savingVacation} className="shrink-0 text-xs font-semibold text-amber-700 hover:underline disabled:opacity-50">
                      {savingVacation ? "…" : "Resume now"}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <PauseCircle className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="text-xs text-gray-500">Going away?</span>
                    <input
                      type="date"
                      value={vacationDateInput}
                      onChange={(e) => setVacationDateInput(e.target.value)}
                      className="px-2 py-1 rounded-lg border border-gray-200 text-xs outline-none focus:border-[var(--brand-client)] bg-white"
                    />
                    <button
                      onClick={handleSetVacation}
                      disabled={!vacationDateInput || savingVacation}
                      className="text-xs font-semibold text-[var(--brand-client)] hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {savingVacation ? "Setting…" : "Set vacation mode"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ── Tab nav ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 flex gap-1">
              {([
                { key: "profile",   label: "Profile",    icon: BookOpen },
                { key: "skills",    label: "Skills",     icon: Layers },
                { key: "portfolio", label: "Portfolio",  icon: Film },
              ] as const).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all",
                    activeTab === key
                      ? "bg-[var(--brand-client)] text-white shadow-sm"
                      : "text-gray-400 hover:text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            {/* ══ PROFILE TAB ══ */}
            {activeTab === "profile" && (
              <div className="space-y-4">

                {/* Cover image */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="relative h-36 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-800 group">
                    {coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={coverImage} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center opacity-40">
                        <Camera className="w-8 h-8 text-white" />
                      </div>
                    )}
                    {/* overlay on hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => coverInputRef.current?.click()}
                        disabled={uploadingCover}
                        className="flex items-center gap-1.5 bg-white/90 hover:bg-white text-gray-800 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                      >
                        <Camera className={cn("w-3.5 h-3.5", uploadingCover && "animate-pulse")} />
                        {uploadingCover ? "Uploading…" : coverImage ? "Change cover" : "Add cover"}
                      </button>
                      {coverImage && (
                        <button
                          type="button"
                          onClick={handleRemoveCover}
                          className="flex items-center gap-1.5 bg-white/90 hover:bg-white text-red-500 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />Remove
                        </button>
                      )}
                    </div>
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); e.target.value = ""; }}
                    />
                  </div>
                  <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-xs text-gray-400">Cover image — shown at the top of your public profile</p>
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={uploadingCover}
                      className="text-xs font-medium text-[var(--brand-client)] hover:underline disabled:opacity-50"
                    >
                      {uploadingCover ? "Uploading…" : coverImage ? "Change" : "Upload"}
                    </button>
                  </div>
                </div>

                {/* Bio */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <Section icon={BookOpen} title="About you" description="Tell clients about your style, experience and what makes your work stand out.">
                    <Textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Hey! I'm a video editor specializing in YouTube content and Reels. I've worked with 50+ creators and brands to help them grow..."
                      rows={5}
                      maxLength={1000}
                      className="resize-none text-sm"
                    />
                    {bioHasContact && (
                      <p className="text-xs text-red-500 mt-1.5 font-medium">
                        ⚠️ Contact info (email, phone, @handle) is not allowed in your bio.
                      </p>
                    )}
                    <div className="flex justify-between mt-1.5">
                      <p className="text-xs text-gray-400">No contact details, phone numbers, or @handles allowed.</p>
                      <p className={cn("text-xs font-medium", bio.length > 900 ? "text-amber-500" : "text-gray-300")}>{bio.length}/1000</p>
                    </div>
                  </Section>
                </div>

                {/* Location */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <Section icon={MapPin} title="Location" description="Your city or region — shown on your public profile.">
                    <input
                      id="location-input"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      maxLength={60}
                      placeholder="e.g. Mumbai, Maharashtra"
                      className={cn(inputClass, locationHasContact && "border-red-300 focus:border-red-400 focus:ring-red-100")}
                    />
                    {locationHasContact && <p className="text-xs text-red-500 mt-1">Contact info not allowed in location.</p>}
                  </Section>
                </div>

                {/* Experience */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <Section icon={Briefcase} title="Experience" description="Your level and how long you've been editing professionally.">
                    <div className="grid grid-cols-3 gap-2.5">
                      {EXPERIENCE_LEVELS.map(({ value, label, desc }) => (
                        <button
                          key={value}
                          onClick={() => setExperienceLevel(experienceLevel === value ? "" : value)}
                          className={cn(
                            "p-3.5 rounded-xl border text-left transition-all",
                            experienceLevel === value
                              ? "border-[var(--brand-client)] bg-[var(--brand-client)]/5 ring-1 ring-[var(--brand-client)]"
                              : "border-gray-200 hover:border-gray-300 bg-white"
                          )}
                        >
                          <p className={cn("text-sm font-bold", experienceLevel === value ? "text-[var(--brand-client)]" : "text-gray-800")}>{label}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-sm text-gray-500 shrink-0">Years of experience</span>
                      <input
                        type="number" min={0} max={50}
                        value={yearsOfExperience ?? ""}
                        onChange={(e) => setYearsOfExperience(e.target.value ? Number(e.target.value) : null)}
                        placeholder="0"
                        className="w-20 px-3 py-2 rounded-xl border border-gray-200 text-sm text-center outline-none focus:border-[var(--brand-client)] focus:ring-2 focus:ring-[var(--brand-client)]/10"
                      />
                      <span className="text-sm text-gray-400">years</span>
                    </div>
                    <div className="mt-4 space-y-1.5">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Previously worked with</label>
                      <input
                        value={previousClients}
                        onChange={(e) => setPreviousClients(e.target.value)}
                        maxLength={150}
                        placeholder="e.g. Lifestyle YouTubers, D2C brands, tech startups…"
                        className={cn(inputClass, previousClientsHasContact && "border-red-300 focus:border-red-400 focus:ring-red-100")}
                      />
                      {previousClientsHasContact
                        ? <p className="text-xs text-red-500">Contact info not allowed here.</p>
                        : <p className="text-xs text-gray-400">Describes the types of clients you&apos;ve worked with — helps clients recognise relevant experience.</p>
                      }
                    </div>
                  </Section>
                </div>

                {/* Niche */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <Section icon={Zap} title="Niche / Specialization" description={`Pick up to 3 content types you specialise in. ${niches.length}/3 selected.`}>
                    <div className="flex flex-wrap gap-2">
                      {NICHE_PRESETS.map((preset) => {
                        const selected = niches.includes(preset);
                        return (
                          <button
                            key={preset}
                            onClick={() => {
                              if (selected) setNiches(niches.filter((n) => n !== preset));
                              else if (niches.length < 3) setNiches([...niches, preset]);
                            }}
                            className={cn(
                              "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                              selected ? "bg-[var(--brand-client)] text-white border-[var(--brand-client)]"
                                : niches.length >= 3 ? "bg-white text-gray-300 border-gray-100 cursor-not-allowed"
                                : "bg-white text-gray-600 border-gray-200 hover:border-[var(--brand-client)]/30 hover:text-[var(--brand-client)]"
                            )}
                          >{preset}</button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <input
                        value={customNicheInput}
                        onChange={(e) => setCustomNicheInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); const val = customNicheInput.trim(); if (val && !customNicheHasContact && !niches.includes(val) && niches.length < 3) { setNiches([...niches, val]); setCustomNicheInput(""); } }
                        }}
                        maxLength={60}
                        placeholder="Add a custom niche…"
                        className={cn(inputClass, "flex-1", customNicheHasContact && "border-red-300 focus:border-red-400 focus:ring-red-100")}
                        disabled={niches.length >= 3}
                      />
                      <button
                        onClick={() => { const val = customNicheInput.trim(); if (val && !customNicheHasContact && !niches.includes(val) && niches.length < 3) { setNiches([...niches, val]); setCustomNicheInput(""); } }}
                        disabled={!customNicheInput.trim() || customNicheHasContact || niches.length >= 3}
                        className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      ><Plus className="w-4 h-4" /></button>
                    </div>
                    {customNicheHasContact && <p className="text-xs text-red-500 mt-1">Contact info not allowed in niche.</p>}
                    {niches.filter((n) => !NICHE_PRESETS.includes(n)).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {niches.filter((n) => !NICHE_PRESETS.includes(n)).map((n) => (
                          <span key={n} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--brand-client)] text-white border border-[var(--brand-client)]">
                            {n}<button onClick={() => setNiches(niches.filter((x) => x !== n))} className="hover:opacity-70"><X className="w-3 h-3" /></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </Section>
                </div>

                {/* Work style */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <Section icon={TrendingUp} title="Work Style" description={`Pick up to 5 tags that describe how you work. ${workStyleTags.length}/5 selected.`}>
                    <div className="flex flex-wrap gap-2">
                      {WORK_STYLE_OPTIONS.map((tag) => {
                        const selected = workStyleTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            onClick={() => {
                              if (selected) setWorkStyleTags(workStyleTags.filter((t) => t !== tag));
                              else if (workStyleTags.length < 5) setWorkStyleTags([...workStyleTags, tag]);
                            }}
                            className={cn(
                              "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                              selected ? "bg-[var(--brand-client)] text-white border-[var(--brand-client)]"
                                : workStyleTags.length >= 5 ? "bg-white text-gray-300 border-gray-100 cursor-not-allowed"
                                : "bg-white text-gray-600 border-gray-200 hover:border-[var(--brand-client)]/30 hover:text-[var(--brand-client)]"
                            )}
                          >{tag}</button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <input
                        value={customWorkStyleInput}
                        onChange={(e) => setCustomWorkStyleInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); const val = customWorkStyleInput.trim(); if (val && !customWorkStyleHasContact && !workStyleTags.includes(val) && workStyleTags.length < 5) { setWorkStyleTags([...workStyleTags, val]); setCustomWorkStyleInput(""); } }
                        }}
                        maxLength={40}
                        placeholder="Add a custom tag…"
                        className={cn(inputClass, "flex-1", customWorkStyleHasContact && "border-red-300 focus:border-red-400 focus:ring-red-100")}
                        disabled={workStyleTags.length >= 5}
                      />
                      <button
                        onClick={() => { const val = customWorkStyleInput.trim(); if (val && !customWorkStyleHasContact && !workStyleTags.includes(val) && workStyleTags.length < 5) { setWorkStyleTags([...workStyleTags, val]); setCustomWorkStyleInput(""); } }}
                        disabled={!customWorkStyleInput.trim() || customWorkStyleHasContact || workStyleTags.length >= 5}
                        className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      ><Plus className="w-4 h-4" /></button>
                    </div>
                    {customWorkStyleHasContact && <p className="text-xs text-red-500 mt-1">Contact info not allowed in work style.</p>}
                    {workStyleTags.filter((t) => !WORK_STYLE_OPTIONS.includes(t)).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {workStyleTags.filter((t) => !WORK_STYLE_OPTIONS.includes(t)).map((t) => (
                          <span key={t} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--brand-client)] text-white border border-[var(--brand-client)]">
                            {t}<button onClick={() => setWorkStyleTags(workStyleTags.filter((x) => x !== t))} className="hover:opacity-70"><X className="w-3 h-3" /></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </Section>
                </div>

                {/* Featured video */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <Section icon={Video} title="Featured Video" description="Paste a YouTube, Vimeo, or Google Drive link — it plays directly on your public profile.">
                    <input
                      type="url"
                      value={featuredVideoUrl}
                      onChange={(e) => setFeaturedVideoUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className={cn(inputClass, featuredVideoInvalid && "border-red-300 focus:border-red-400 focus:ring-red-100")}
                    />
                    {featuredVideoUrl.trim() && (
                      featuredVideoEmbedUrl ? (
                        <div className="mt-3 rounded-xl overflow-hidden border border-gray-200 aspect-video">
                          <iframe src={featuredVideoEmbedUrl} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full" />
                        </div>
                      ) : (
                        <p className="text-xs text-red-500 mt-1.5">Not a valid YouTube, Vimeo, or Google Drive URL — it won&apos;t be saved.</p>
                      )
                    )}
                  </Section>
                </div>

                {/* FAQ */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <Section
                    icon={HelpCircle}
                    title="FAQ"
                    description="Answer common questions upfront — shown on your public profile."
                    action={
                      <button onClick={() => setFaqs([...faqs, { question: "", answer: "" }])} className="flex items-center gap-1 text-xs font-semibold text-[var(--brand-client)] px-2.5 py-1.5 rounded-lg bg-[var(--brand-client)]/5 hover:bg-[var(--brand-client)]/10 transition-colors">
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    }
                  >
                    {(() => {
                      const usedQuestions = new Set(faqs.map(f => f.question));
                      const available = FAQ_SUGGESTIONS.filter(q => !usedQuestions.has(q));
                      return available.length > 0 ? (
                        <div className="mb-4">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Quick add</p>
                          <div className="flex flex-wrap gap-2">
                            {available.map((q) => (
                              <button key={q} onClick={() => setFaqs([...faqs, { question: q, answer: "" }])} className="px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-gray-300 text-gray-500 hover:border-[var(--brand-client)] hover:text-[var(--brand-client)] hover:bg-[var(--brand-client)]/5 transition-all">
                                + {q}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}
                    {faqs.length === 0 ? (
                      <div className="rounded-xl border-2 border-dashed border-gray-200 py-6 text-center">
                        <p className="text-sm text-gray-400">Pick a suggestion above or add a custom question.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {faqs.map((faq, i) => {
                          const qInvalid = hasContactInfo(faq.question);
                          const aInvalid = hasContactInfo(faq.answer);
                          return (
                            <div key={i} className="rounded-xl border border-gray-200 p-4 space-y-2.5 bg-gray-50/50">
                              <div className="flex items-center gap-2">
                                <input
                                  value={faq.question}
                                  onChange={(e) => { const u = [...faqs]; u[i] = { ...u[i], question: e.target.value }; setFaqs(u); }}
                                  placeholder="Question" maxLength={150}
                                  className={cn(
                                    "flex-1 px-3 py-2 rounded-lg border text-sm bg-white outline-none transition-all",
                                    qInvalid ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-[var(--brand-client)]"
                                  )}
                                />
                                <button onClick={() => setFaqs(faqs.filter((_, idx) => idx !== i))} className="text-gray-300 hover:text-red-400 transition-colors p-1"><X className="w-4 h-4" /></button>
                              </div>
                              <textarea
                                value={faq.answer}
                                onChange={(e) => { const u = [...faqs]; u[i] = { ...u[i], answer: e.target.value }; setFaqs(u); }}
                                placeholder="Answer" rows={2} maxLength={500}
                                className={cn(
                                  "w-full px-3 py-2 rounded-lg border text-sm bg-white outline-none resize-none transition-all",
                                  aInvalid ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-[var(--brand-client)]"
                                )}
                              />
                              {(qInvalid || aInvalid) && <p className="text-xs text-red-500">Contact info not allowed here.</p>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Section>
                </div>

              </div>
            )}

            {/* ══ SKILLS TAB ══ */}
            {activeTab === "skills" && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <Section icon={Layers} title="Skills" description="Select from presets or add your own custom skills.">
                    <SkillTags
                      tags={editorSkills} onChange={setEditorSkills} placeholder="Add a custom skill…"
                      validateTag={(v) => hasContactInfo(v) ? "Contact info isn't allowed in skills." : null}
                    />
                  </Section>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <Section icon={Zap} title="Software & Tools" description="Select from presets or add software not in the list.">
                    <ToolTags
                      tags={editorTools} onChange={setEditorTools} placeholder="Add a custom tool…"
                      validateTag={(v) => hasContactInfo(v) ? "Contact info isn't allowed in tools." : null}
                    />
                  </Section>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <Section
                    icon={MessageCircle}
                    title="Languages"
                    description="Languages you work in and your proficiency level."
                    action={
                      <button onClick={() => setLanguages([...languages, { language: "", level: "" }])} className="flex items-center gap-1 text-xs font-semibold text-[var(--brand-client)] px-2.5 py-1.5 rounded-lg bg-[var(--brand-client)]/5 hover:bg-[var(--brand-client)]/10 transition-colors">
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    }
                  >
                    {languages.length === 0 ? (
                      <div className="rounded-xl border-2 border-dashed border-gray-200 py-6 text-center">
                        <p className="text-sm text-gray-400">No languages added.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {languages.map((lang, i) => (
                          <div key={i} className="rounded-xl border border-gray-200 p-4 space-y-2.5 bg-gray-50/50">
                            <div className="flex items-center gap-2">
                              <div className="relative flex-1">
                                <select value={lang.language} onChange={(e) => { const u = [...languages]; u[i] = { ...u[i], language: e.target.value }; setLanguages(u); }} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white appearance-none pr-7 outline-none focus:border-[var(--brand-client)]">
                                  <option value="">Select language</option>
                                  {COMMON_LANGUAGES.map((l) => <option key={l}>{l}</option>)}
                                </select>
                                <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                              </div>
                              <button onClick={() => setLanguages(languages.filter((_, idx) => idx !== i))} className="text-gray-300 hover:text-red-400 transition-colors p-1"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {LANGUAGE_LEVELS.map((level) => (
                                <button key={level} onClick={() => { const u = [...languages]; u[i] = { ...u[i], level }; setLanguages(u); }} className={cn("px-2.5 py-1 rounded-full text-xs font-medium border transition-all", lang.level === level ? "bg-[var(--brand-client)] text-white border-[var(--brand-client)]" : "bg-white text-gray-500 border-gray-200 hover:border-[var(--brand-client)]/40")}>
                                  {level}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Section>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <Section
                    icon={Clock}
                    title="Turnaround Time"
                    description="How long each video type typically takes you."
                    action={
                      <button onClick={() => setTurnaround([...turnaround, { type: "", days: 1 }])} className="flex items-center gap-1 text-xs font-semibold text-[var(--brand-client)] px-2.5 py-1.5 rounded-lg bg-[var(--brand-client)]/5 hover:bg-[var(--brand-client)]/10 transition-colors">
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    }
                  >
                    {(() => {
                      const usedTypes = new Set(turnaround.map((t) => t.type));
                      const available = TURNAROUND_SUGGESTIONS.filter((s) => !usedTypes.has(s.type));
                      return available.length > 0 ? (
                        <div className="mb-4">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Quick add</p>
                          <div className="flex flex-wrap gap-2">
                            {available.map((s) => (
                              <button key={s.type} onClick={() => setTurnaround([...turnaround, { type: s.type, days: s.days }])} className="px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-gray-300 text-gray-500 hover:border-[var(--brand-client)] hover:text-[var(--brand-client)] hover:bg-[var(--brand-client)]/5 transition-all">
                                + {s.type}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}
                    {turnaround.length === 0 ? (
                      <div className="rounded-xl border-2 border-dashed border-gray-200 py-6 text-center">
                        <p className="text-sm text-gray-400">Pick a suggestion above or add a custom entry.</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {turnaround.map((item, i) => {
                          const typeInvalid = hasContactInfo(item.type);
                          return (
                            <div key={i} className="space-y-1">
                              <div className="flex items-center gap-2.5">
                                <input
                                  value={item.type}
                                  onChange={(e) => { const u = [...turnaround]; u[i] = { ...u[i], type: e.target.value }; setTurnaround(u); }}
                                  placeholder="e.g. 10-min YouTube video" maxLength={50}
                                  className={cn(
                                    "flex-1 px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 bg-white transition-all",
                                    typeInvalid ? "border-red-300 focus:border-red-400 focus:ring-red-100" : "border-gray-200 focus:border-[var(--brand-client)] focus:ring-[var(--brand-client)]/10"
                                  )}
                                />
                                <input type="number" min={1} max={60} value={item.days} onChange={(e) => { const u = [...turnaround]; u[i] = { ...u[i], days: Number(e.target.value) }; setTurnaround(u); }} className="w-16 px-2 py-2.5 rounded-xl border border-gray-200 text-sm text-center outline-none focus:border-[var(--brand-client)]" />
                                <span className="text-xs text-gray-400 shrink-0">days</span>
                                <button onClick={() => setTurnaround(turnaround.filter((_, idx) => idx !== i))} className="text-gray-300 hover:text-red-400 transition-colors"><X className="w-4 h-4" /></button>
                              </div>
                              {typeInvalid && <p className="text-xs text-red-500">Contact info not allowed here.</p>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Section>
                </div>
              </div>
            )}

            {/* ══ PORTFOLIO TAB ══ */}
            {activeTab === "portfolio" && (
              <div className="space-y-4">

                {/* Type breakdown — full performance numbers (views, likes, etc.) live on Analytics */}
                {initialPortfolio.length > 0 && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs text-gray-400">Breakdown:</span>
                    {portfolioVideoCount > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-100 rounded-full px-3 py-1 shadow-sm">
                        <Play className="w-3 h-3 text-[var(--brand-client)]" /> {portfolioVideoCount} video{portfolioVideoCount !== 1 ? "s" : ""}
                      </span>
                    )}
                    {portfolioImageCount > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-100 rounded-full px-3 py-1 shadow-sm">
                        <ImageIcon className="w-3 h-3 text-violet-500" /> {portfolioImageCount} image{portfolioImageCount !== 1 ? "s" : ""}
                      </span>
                    )}
                    {portfolioFeaturedCount > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-3 py-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {portfolioFeaturedCount} featured
                      </span>
                    )}
                    <Link href="/editor/analytics" className="ml-auto text-xs font-medium text-[var(--brand-client)] hover:underline">
                      View views, likes & performance →
                    </Link>
                  </div>
                )}

                {/* Tips — shown only when portfolio is small */}
                {initialPortfolio.length < 3 && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex gap-3">
                    <Lightbulb className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <div className="space-y-1.5 text-sm text-indigo-800">
                      <p className="font-semibold">Tips to make your portfolio stand out</p>
                      <ul className="text-xs text-indigo-700 space-y-1 list-disc list-inside">
                        <li>Add at least 3 items — editors with more portfolio items get 2× more inquiries</li>
                        <li>Feature your best work using the ★ button so it appears first on your profile</li>
                        <li>Use Before / After sliders for image edits — clients love the comparison</li>
                        <li>Link YouTube videos directly — no upload needed, and they auto-show thumbnails</li>
                        <li>Add titles and categories so clients can filter by the content type they need</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Portfolio manager */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <PortfolioSection initialPortfolio={initialPortfolio} editorId={editorId} maxFileSizeMb={maxFileSizeMb} />
                </div>
              </div>
            )}

          </div>

          {/* ── Right sidebar ── */}
          <div className="space-y-5">

            {/* Profile completion score */}
            <ProfileScoreCard score={profileScore} maxScore={profileMaxScore} items={profileScoreItems} />

            {/* Profile Frame selector */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900">Profile Frame</h3>
                <Link href="/editor/xp-shop" className="text-[11px] text-sky-500 hover:underline font-medium">
                  Unlock more →
                </Link>
              </div>

              {ownedFrames.size === 0 ? (
                <div className="text-center py-4 space-y-2">
                  <p className="text-2xl">🖼️</p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    You haven&apos;t unlocked any frames yet.
                  </p>
                  <Link
                    href="/editor/xp-shop"
                    className="inline-block mt-1 text-xs font-semibold text-white bg-sky-500 hover:bg-[var(--brand-client-hover)] px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Browse XP Shop
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Active frame banner */}
                  {currentFrame && (() => {
                    const f = PROFILE_FRAMES.find(fr => fr.key === currentFrame);
                    return f ? (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-sky-50 border border-sky-100 text-xs">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 shrink-0" style={f.style} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sky-700">{f.emoji} {f.label}</p>
                          <p className="text-sky-500 text-[10px]">Active on your profile</p>
                        </div>
                        <button
                          onClick={() => handleSetFrame(null)}
                          disabled={settingFrame === "__clear__"}
                          className="text-[10px] text-gray-400 hover:text-red-500 transition-colors shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    ) : null;
                  })()}

                  {/* Owned frames grid */}
                  <div className="grid grid-cols-4 gap-2">
                    {PROFILE_FRAMES.filter(f => ownedFrames.has(f.key)).map(frame => {
                      const isActive  = currentFrame === frame.key;
                      const isSetting = settingFrame === frame.key;
                      return (
                        <button
                          key={frame.key}
                          onClick={() => !isActive && handleSetFrame(frame.key)}
                          disabled={isActive || !!isSetting}
                          title={frame.label}
                          className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                            isActive
                              ? "bg-sky-50 border-sky-200"
                              : "bg-gray-50 border-gray-100 hover:border-gray-300"
                          }`}
                        >
                          <div
                            className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-base flex items-center justify-center"
                            style={frame.style}
                          >
                            {frame.emoji}
                          </div>
                          <span className="text-[9px] font-medium text-gray-500 truncate w-full text-center">
                            {isSetting ? "…" : isActive ? "Active" : frame.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>


          </div>
        </div>
      </div>
    </div>
  );
}

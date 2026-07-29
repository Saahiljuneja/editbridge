"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Camera, User, Mail, CalendarDays, Settings, ExternalLink, CheckCircle } from "lucide-react";
import { ImageCropModal } from "@/components/common/image-crop-modal";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function ClientProfilePage() {
  const { data: session, update: updateSession } = useSession();

  const [name, setName]               = useState("");
  const [email, setEmail]             = useState("");
  const [joinedAt, setJoinedAt]       = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);

  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [cropSrc, setCropSrc]         = useState<string | null>(null);
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((data) => {
        setName(data.name ?? "");
        setEmail(data.email ?? "");
        setCurrentImage(data.image ?? null);
        setJoinedAt(data.createdAt ?? null);
      })
      .catch(() => toast.error("Failed to load profile."))
      .finally(() => setLoading(false));
  }, []);

  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

  function handleFileSelect(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file."); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Image must be under 10 MB."); return; }
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Name cannot be empty."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error();
      await updateSession({ name: name.trim() });
      toast.success("Profile saved.");
    } catch {
      toast.error("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  const formattedDate = joinedAt
    ? new Date(joinedAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-white rounded-2xl border border-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-100 px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage your name and avatar</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[var(--brand-client)]/10 flex items-center justify-center">
            <User className="w-4 h-4 text-[var(--brand-client)]" />
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-6 py-8 space-y-5">

        {/* Avatar card */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
          <div className="flex flex-col items-center gap-4">

            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gradient-to-br from-[var(--brand-client)] to-[#6366F1] flex items-center justify-center shadow-md">
                {currentImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentImage} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-3xl font-bold">{initials}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full bg-[var(--brand-client)] flex items-center justify-center border-2 border-white shadow-md hover:bg-[var(--brand-client-hover)] transition-colors disabled:opacity-60"
              >
                <Camera className={cn("w-3.5 h-3.5 text-white", uploadingPhoto && "animate-pulse")} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                  e.target.value = "";
                }}
              />
            </div>

            <div className="text-center">
              <p className="font-semibold text-gray-900">{name || "—"}</p>
              <p className="text-xs text-gray-400 mt-0.5">Click the camera icon to change your photo</p>
            </div>

            {uploadingPhoto && (
              <div className="flex items-center gap-2 text-xs text-[var(--brand-client)] font-medium">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-[var(--brand-client)] border-t-transparent animate-spin" />
                Uploading photo…
              </div>
            )}
          </div>
        </div>

        {/* Name edit card */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-start gap-3 px-6 py-5 border-b border-gray-50">
            <div className="w-8 h-8 rounded-lg bg-[var(--brand-client)]/10 flex items-center justify-center shrink-0 mt-0.5">
              <User className="w-4 h-4 text-[var(--brand-client)]" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Display name</p>
              <p className="text-xs text-gray-400 mt-0.5">The name shown to editors and on your orders</p>
            </div>
          </div>
          <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={100}
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/20 focus:border-[var(--brand-client)]/50"
            />
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--brand-client)] hover:bg-[var(--brand-client-hover)] disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </form>
        </div>

        {/* Account info card */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-start gap-3 px-6 py-5 border-b border-gray-50">
            <div className="w-8 h-8 rounded-lg bg-[var(--brand-client)]/10 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle className="w-4 h-4 text-[var(--brand-client)]" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Account info</p>
              <p className="text-xs text-gray-400 mt-0.5">Read-only details tied to your account</p>
            </div>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Email</p>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                <p className="text-sm text-gray-700">{email}</p>
                {session?.user?.isEmailVerified && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Verified</span>
                )}
              </div>
            </div>
            {formattedDate && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Member since</p>
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-gray-400 shrink-0" />
                  <p className="text-sm text-gray-700">{formattedDate}</p>
                </div>
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Account type</p>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-100 text-sky-700">Client</span>
            </div>
          </div>
        </div>

        {/* Security link */}
        <Link
          href="/settings"
          className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white shadow-sm px-6 py-4 hover:bg-gray-50 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
              <Settings className="w-4 h-4 text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Password & security</p>
              <p className="text-xs text-gray-400">Change password, 2FA, notifications</p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors" />
        </Link>

      </div>

      {/* Crop modal */}
      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          shape="round"
          aspect={1}
          onCancel={() => setCropSrc(null)}
          onConfirm={uploadCroppedPhoto}
        />
      )}
    </div>
  );
}

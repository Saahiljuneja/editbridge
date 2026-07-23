"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { SkillTags } from "@/components/editor/skill-tags";
import { UploadZone } from "@/components/common/upload-zone";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface PortfolioItem {
  id: string;
  type: "video" | "image";
  url: string;
  title: string | null;
}

interface ProfileFormProps {
  editorId: string;
  initialBio: string;
  initialSkills: string[];
  initialTools: string[];
  initialIsAvailable: boolean;
  initialPortfolio: PortfolioItem[];
}

export function ProfileForm({
  editorId,
  initialBio,
  initialSkills,
  initialTools,
  initialIsAvailable,
  initialPortfolio,
}: ProfileFormProps) {
  const [bio, setBio] = useState(initialBio);
  const [editorSkills, setEditorSkills] = useState<string[]>(initialSkills);
  const [editorTools, setEditorTools] = useState<string[]>(initialTools);
  const [isAvailable, setIsAvailable] = useState(initialIsAvailable);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(initialPortfolio);
  const [saving, setSaving] = useState(false);

  void editorId;

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: bio.trim() || null,
          skills: editorSkills,
          tools: editorTools,
          isAvailable,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to save profile.");
        return;
      }

      toast.success("Profile saved!");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  function handlePortfolioUploaded({ key, publicUrl }: { key: string; publicUrl: string }) {
    const type = key.match(/\.(mp4|mov|avi|webm)$/i) ? "video" : "image";
    const newItem: PortfolioItem = { id: key, type, url: publicUrl, title: null };
    setPortfolio((prev) => [...prev, newItem]);
    // Persist to DB via a separate call
    fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, url: key, title: null }),
    }).catch(() => null);
  }

  function handleRemovePortfolioItem(id: string) {
    setPortfolio((prev) => prev.filter((p) => p.id !== id));
    fetch(`/api/portfolio/${id}`, { method: "DELETE" }).catch(() => null);
  }

  return (
    <div className="space-y-8">
      {/* Availability toggle */}
      <div className="flex items-center justify-between rounded-xl border border-border p-4">
        <div>
          <p className="font-semibold">Available for new orders</p>
          <p className="text-sm text-muted-foreground">
            Toggle off to pause new bookings without losing your profile visibility.
          </p>
        </div>
        <Switch
          checked={isAvailable}
          onCheckedChange={setIsAvailable}
        />
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="bio" className="font-semibold text-base">Bio</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell clients about your experience, style, and what makes your work stand out…"
          rows={5}
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground text-right">{bio.length}/500</p>
      </div>

      {/* Skills */}
      <div className="space-y-2">
        <Label className="font-semibold text-base">Skills</Label>
        <p className="text-sm text-muted-foreground">Type a skill and press Enter to add it.</p>
        <SkillTags
          tags={editorSkills}
          onChange={setEditorSkills}
          placeholder="e.g. YouTube video editing"
        />
      </div>

      {/* Tools */}
      <div className="space-y-2">
        <Label className="font-semibold text-base">Software & Tools</Label>
        <p className="text-sm text-muted-foreground">Type a tool and press Enter to add it.</p>
        <SkillTags
          tags={editorTools}
          onChange={setEditorTools}
          placeholder="e.g. Adobe Premiere Pro"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={cn(
            buttonVariants(),
            "bg-[#0EA5E9] hover:bg-[#0284C7]",
            saving && "opacity-50 cursor-not-allowed"
          )}
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>

      <Separator />

      {/* Portfolio */}
      <div className="space-y-4">
        <div>
          <h2 className="font-semibold text-base mb-0.5">Portfolio</h2>
          <p className="text-sm text-muted-foreground">Upload your best work — images or video thumbnails.</p>
        </div>

        {portfolio.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {portfolio.map((item) => (
              <div key={item.id} className="relative group aspect-video rounded-lg overflow-hidden bg-zinc-100">
                {item.type === "image" ? (
                  <Image
                    src={item.url}
                    alt={item.title ?? "Portfolio item"}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, 33vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-white text-sm">
                    Video
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleRemovePortfolioItem(item.id)}
                  className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <UploadZone
          uploadType="portfolio"
          accept="image/*,video/*"
          onUploaded={handlePortfolioUploaded}
          label="Upload portfolio item (image or video)"
        />
      </div>
    </div>
  );
}

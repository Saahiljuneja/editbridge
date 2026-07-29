"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AlertTriangle, ImagePlus, X, Loader2 } from "lucide-react";

interface DisputeFormProps {
  orderId: string;
}

const MAX_FILES = 4;

export function DisputeForm({ orderId }: DisputeFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [evidenceText, setEvidenceText] = useState("");
  const [files, setFiles] = useState<{ file: File; previewUrl: string; uploading: boolean; publicUrl?: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File, idx: number) {
    setFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, uploading: true } : f)));
    try {
      const metaRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, uploadType: "dispute_evidence", fileSize: file.size }),
      });
      if (!metaRes.ok) {
        const err = await metaRes.json().catch(() => ({}));
        toast.error(err.error ?? "Upload failed.");
        setFiles((prev) => prev.filter((_, i) => i !== idx));
        return;
      }
      const { presignedUrl, publicUrl } = await metaRes.json();
      await fetch(presignedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      setFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, uploading: false, publicUrl } : f)));
    } catch {
      toast.error("Upload failed.");
      setFiles((prev) => prev.filter((_, i) => i !== idx));
    }
  }

  function handleFiles(newFiles: FileList | null) {
    if (!newFiles) return;
    const remaining = MAX_FILES - files.length;
    const toAdd = Array.from(newFiles).slice(0, remaining);
    const added = toAdd.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      uploading: false,
    }));
    setFiles((prev) => {
      const next = [...prev, ...added];
      // Trigger upload for each new entry
      added.forEach((_, i) => uploadFile(toAdd[i], prev.length + i));
      return next;
    });
  }

  function removeFile(idx: number) {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[idx].previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 20) {
      toast.error("Please provide at least 20 characters of detail.");
      return;
    }
    if (files.some((f) => f.uploading)) {
      toast.error("Please wait for uploads to finish.");
      return;
    }

    setSubmitting(true);
    try {
      const evidenceUrls = files.filter((f) => f.publicUrl).map((f) => f.publicUrl!);
      const res = await fetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          reason: reason.trim(),
          evidenceText: evidenceText.trim() || undefined,
          evidenceUrls,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to open dispute.");
        return;
      }
      toast.success("Dispute opened. Our team will review within 48 hours.");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-red-600 border-red-200 hover:bg-red-50")}
      >
        <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
        Open a dispute
      </button>
    );
  }

  return (
    <section className="rounded-xl border border-red-200 bg-red-50 p-5">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-red-600" />
        <h2 className="font-semibold text-red-800">Open a dispute</h2>
      </div>
      <p className="text-sm text-red-700 mb-4">
        Our support team will review within 48 hours. Attach screenshots as evidence.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs font-medium text-red-800 block mb-1">
            Reason <span className="text-red-500">*</span>
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe the issue with this order (min. 20 characters)…"
            className="resize-none bg-white"
            rows={3}
            maxLength={1000}
            required
          />
          <p className="text-xs text-muted-foreground mt-1">{reason.length}/1000</p>
        </div>

        <div>
          <label className="text-xs font-medium text-red-800 block mb-1">
            Additional notes (optional)
          </label>
          <Textarea
            value={evidenceText}
            onChange={(e) => setEvidenceText(e.target.value)}
            placeholder="Timeline, context, or any additional detail…"
            className="resize-none bg-white"
            rows={2}
            maxLength={2000}
          />
        </div>

        {/* File upload */}
        <div>
          <label className="text-xs font-medium text-red-800 block mb-2">
            Screenshots / evidence (up to {MAX_FILES} images)
          </label>
          <div className="flex flex-wrap gap-2">
            {files.map((f, i) => (
              <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-red-200 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.previewUrl} alt="evidence" className="w-full h-full object-cover" />
                {f.uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  </div>
                )}
                {!f.uploading && (
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            {files.length < MAX_FILES && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 rounded-lg border-2 border-dashed border-red-200 bg-white flex flex-col items-center justify-center gap-1 hover:border-red-400 hover:bg-red-50 transition-colors"
              >
                <ImagePlus className="w-5 h-5 text-red-400" />
                <span className="text-[10px] text-red-400 font-medium">Add image</span>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting || files.some((f) => f.uploading)}
            className={cn(
              buttonVariants({ size: "sm" }),
              "bg-red-600 hover:bg-red-700",
              (submitting || files.some((f) => f.uploading)) && "opacity-50 cursor-not-allowed"
            )}
          >
            {submitting ? "Submitting…" : "Submit dispute"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

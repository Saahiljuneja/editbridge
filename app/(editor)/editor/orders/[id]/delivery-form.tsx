"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadZone } from "@/components/common/upload-zone";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Upload } from "lucide-react";

interface DeliveryFormProps {
  orderId: string;
  versionNumber: number;
}

export function DeliveryForm({ orderId, versionNumber }: DeliveryFormProps) {
  const router = useRouter();
  const [fileKey, setFileKey] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fileKey || !fileName) {
      toast.error("Please upload a file first.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/deliver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl: fileKey, fileName, fileSize }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to submit delivery.");
        return;
      }

      toast.success("Delivery submitted! The client has been notified.");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border p-5 space-y-4">
      <h2 className="font-semibold">
        Submit delivery{versionNumber > 1 ? ` (v${versionNumber})` : ""}
      </h2>
      <p className="text-sm text-muted-foreground">
        Upload your completed work. The client will be able to download it and either approve or request revisions.
      </p>

      <UploadZone
        uploadType="delivery"
        label={fileKey ? `Uploaded: ${fileName}` : "Upload deliverable (video, zip, PDF…)"}
        accept="*/*"
        onUploaded={({ key, fileSize: size }) => {
          setFileKey(key);
          setFileSize(size);
          const parts = key.split("/");
          setFileName(parts[parts.length - 1]);
        }}
      />

      <button
        type="submit"
        disabled={submitting || !fileKey}
        className={cn(
          buttonVariants(),
          "gap-2 bg-[#0EA5E9] hover:bg-[#0284C7]",
          (submitting || !fileKey) && "opacity-50 cursor-not-allowed"
        )}
      >
        <Upload className="w-4 h-4" />
        {submitting ? "Submitting…" : "Submit delivery"}
      </button>
    </form>
  );
}

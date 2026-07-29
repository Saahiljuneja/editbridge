"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadZone } from "@/components/common/upload-zone";
import { toast } from "sonner";
import { Upload, Loader2, CheckCircle2 } from "lucide-react";

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
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-[#0EA5E9]/10 flex items-center justify-center shrink-0">
          <Upload className="w-4 h-4 text-[#0EA5E9]" />
        </div>
        <h2 className="font-semibold text-gray-900">
          Submit delivery{versionNumber > 1 ? ` (v${versionNumber})` : ""}
        </h2>
      </div>

      <div className="px-5 py-4 space-y-4">
        <p className="text-sm text-gray-500">
          Upload your completed work. The client can approve or request revisions.
        </p>

        <UploadZone
          uploadType="delivery"
          label={
            fileKey
              ? `Uploaded: ${fileName}`
              : "Upload deliverable (video, zip, PDF…)"
          }
          accept="*/*"
          onUploaded={({ key, fileSize: size }) => {
            setFileKey(key);
            setFileSize(size);
            const parts = key.split("/");
            setFileName(parts[parts.length - 1]);
          }}
        />

        {fileKey && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="truncate font-medium">{fileName}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !fileKey}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-[#0EA5E9] hover:bg-sky-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
          ) : (
            <><Upload className="w-4 h-4" /> Submit delivery</>
          )}
        </button>
      </div>
    </form>
  );
}

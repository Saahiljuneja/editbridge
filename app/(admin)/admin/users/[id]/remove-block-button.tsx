"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";

export function RemoveBlockButton({ blockId }: { blockId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleRemove() {
    if (!confirm("Remove this block? The client will be able to order from this editor again.")) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/client-blocks/${blockId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to remove block.");
        return;
      }
      toast.success("Block removed.");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button
      onClick={handleRemove}
      disabled={submitting}
      className="text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-50"
      aria-label="Remove block"
    >
      <X className="w-3.5 h-3.5" />
    </button>
  );
}

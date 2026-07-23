"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export function UnsaveButton({ editorId }: { editorId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [removing, setRemoving] = useState(false);

  async function handleRemove() {
    setRemoving(true);
    try {
      const res = await fetch("/api/saved-editors", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editorId }),
      });
      if (!res.ok) throw new Error("Request failed");
      toast.success("Removed from saved editors.");
      startTransition(() => router.refresh());
    } catch {
      toast.error("Something went wrong. Please try again.");
      setRemoving(false);
    }
  }

  return (
    <button
      onClick={handleRemove}
      disabled={removing || isPending}
      className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors disabled:opacity-50"
      title="Remove from saved"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}

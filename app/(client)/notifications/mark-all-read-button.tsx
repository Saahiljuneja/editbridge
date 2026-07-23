"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCheck } from "lucide-react";

export function MarkAllReadButton() {
  const router = useRouter();

  function handleClick() {
    router.refresh();
    toast.success("All notifications marked as read.");
    fetch("/api/notifications", { method: "PATCH" }).catch(() => {
      toast.error("Failed to mark as read — please try again.");
    });
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
    >
      <CheckCheck className="w-3.5 h-3.5" />
      Mark all read
    </button>
  );
}

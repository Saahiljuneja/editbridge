"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { UserRole } from "@/types";

const ROLES: { value: UserRole; label: string }[] = [
  { value: "client", label: "Client" },
  { value: "editor", label: "Editor" },
  { value: "staff_kyc", label: "Staff — KYC" },
  { value: "staff_support", label: "Staff — Support" },
  { value: "staff_dispute", label: "Staff — Disputes" },
  { value: "staff_moderation", label: "Staff — Moderation" },
  { value: "admin", label: "Admin" },
];

export function RoleChangeForm({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: UserRole;
}) {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>(currentRole);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (role === currentRole) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to update role.");
        return;
      }
      toast.success("Role updated. The change will take effect within 2 minutes.");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-white p-5 space-y-4">
      <p className="font-semibold text-sm">Change role</p>
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as UserRole)}
        className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/30"
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
      <button
        type="submit"
        disabled={submitting || role === currentRole}
        className={cn(
          buttonVariants({ size: "sm" }),
          "bg-[var(--brand-client)] hover:bg-[var(--brand-editor-hover)]",
          (submitting || role === currentRole) && "opacity-50 cursor-not-allowed"
        )}
      >
        {submitting ? "Saving…" : "Update role"}
      </button>
    </form>
  );
}

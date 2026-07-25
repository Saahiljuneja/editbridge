"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { downloadCSV } from "@/lib/csv";
import { Download } from "lucide-react";

const ROLE_COLORS: Record<string, string> = {
  client: "bg-blue-100 text-blue-700",
  editor: "bg-[#0EA5E9]/10 text-[#0EA5E9]",
  admin: "bg-red-100 text-red-700",
  staff_kyc: "bg-amber-100 text-amber-700",
  staff_support: "bg-green-100 text-green-700",
  staff_dispute: "bg-orange-100 text-orange-700",
  staff_moderation: "bg-purple-100 text-purple-700",
};

type Row = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
};

export function UsersBulkTable({
  rows,
  currentUserId,
  canBulkAction,
}: {
  rows: Row[];
  currentUserId: string;
  canBulkAction: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [showReason, setShowReason] = useState(false);
  const [pendingAction, setPendingAction] = useState<"suspend" | "unsuspend" | null>(null);

  const toggleAll = () => {
    if (selected.size === rows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map((r) => r.id).filter((id) => id !== currentUserId)));
    }
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const initiateAction = (action: "suspend" | "unsuspend") => {
    setPendingAction(action);
    setShowReason(true);
  };

  const confirmAction = () => {
    if (!pendingAction) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/users/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ids: Array.from(selected),
            action: pendingAction,
            reason: reason.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? "Bulk action failed.");
          return;
        }
        toast.success(
          `${pendingAction === "suspend" ? "Suspended" : "Unsuspended"} ${data.affected} user${data.affected !== 1 ? "s" : ""}.`
        );
        setSelected(new Set());
        setShowReason(false);
        setPendingAction(null);
        setReason("");
        router.refresh();
      } catch {
        toast.error("Something went wrong.");
      }
    });
  };

  const cancelAction = () => {
    setShowReason(false);
    setPendingAction(null);
    setReason("");
  };

  const allSelected = rows.length > 0 && selected.size === rows.filter((r) => r.id !== currentUserId).length;
  const someSelected = selected.size > 0;

  function exportCSV() {
    downloadCSV("users.csv", rows.map(r => ({
      ID: r.id,
      Name: r.name ?? "",
      Email: r.email,
      Role: r.role,
      Status: r.isActive ? "Active" : "Suspended",
      "Joined At": r.createdAt.toISOString(),
    })));
  }

  return (
    <div className="relative">
      {/* Export button */}
      <div className="flex justify-end mb-2">
        <button onClick={exportCSV}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg hover:border-gray-300 transition-colors">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* Bulk action bar */}
      {canBulkAction && someSelected && (
        <div className="sticky top-4 z-10 mb-3 flex items-center gap-3 rounded-xl border border-border bg-white dark:bg-gray-900 dark:border-gray-800 px-4 py-3 shadow-md">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {selected.size} user{selected.size !== 1 ? "s" : ""} selected
          </span>
          <div className="ml-auto flex items-center gap-2">
            {!showReason ? (
              <>
                <button
                  onClick={() => initiateAction("suspend")}
                  className="px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors"
                >
                  Suspend selected
                </button>
                <button
                  onClick={() => initiateAction("unsuspend")}
                  className="px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm font-medium hover:bg-green-100 transition-colors"
                >
                  Unsuspend selected
                </button>
                <button
                  onClick={() => setSelected(new Set())}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                >
                  Deselect all
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={`Reason for ${pendingAction} (optional)`}
                  maxLength={300}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30 w-64"
                />
                <button
                  onClick={confirmAction}
                  disabled={isPending}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50",
                    pendingAction === "suspend"
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-green-600 text-white hover:bg-green-700"
                  )}
                >
                  {isPending ? "Working…" : `Confirm ${pendingAction}`}
                </button>
                <button onClick={cancelAction} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border overflow-hidden bg-white dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {canBulkAction && (
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="rounded border-gray-300 accent-[#0EA5E9]"
                    aria-label="Select all"
                  />
                </th>
              )}
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Role</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.id}
                className={cn(
                  "border-b border-border last:border-0",
                  i % 2 === 1 && "bg-muted/20",
                  selected.has(row.id) && "bg-blue-50"
                )}
              >
                {canBulkAction && (
                  <td className="px-4 py-3 w-8">
                    {row.id !== currentUserId && (
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggle(row.id)}
                        className="rounded border-gray-300 accent-[#0EA5E9]"
                      />
                    )}
                  </td>
                )}
                <td className="px-4 py-3">
                  <p className="font-medium">{row.name ?? "No name"}</p>
                  <p className="text-xs text-muted-foreground">{row.email}</p>
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge className={cn("text-xs border-0", ROLE_COLORS[row.role] ?? "bg-muted text-muted-foreground")}>
                    {row.role}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(row.createdAt)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", row.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600")}>
                    {row.isActive ? "Active" : "Suspended"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/users/${row.id}`} className="text-xs font-semibold text-[#0EA5E9] hover:underline underline-offset-2">
                    View →
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={canBulkAction ? 6 : 5} className="px-4 py-10 text-center text-muted-foreground text-sm">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

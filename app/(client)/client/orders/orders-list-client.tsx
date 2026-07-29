"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ShoppingBag, Search } from "lucide-react";
import { DeadlineCountdown } from "@/components/orders/deadline-countdown";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; stripe: string; badge: string }> = {
  pending:            { label: "Pending",    stripe: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 border border-amber-200" },
  in_progress:        { label: "In Progress",stripe: "bg-[#0EA5E9]",   badge: "bg-sky-50 text-sky-700 border border-sky-200" },
  delivered:          { label: "Delivered",  stripe: "bg-violet-500",  badge: "bg-violet-50 text-violet-700 border border-violet-200" },
  revision_requested: { label: "Revision",   stripe: "bg-orange-400",  badge: "bg-orange-50 text-orange-700 border border-orange-200" },
  disputed:           { label: "Disputed",   stripe: "bg-red-500",     badge: "bg-red-50 text-red-700 border border-red-200" },
  completed:          { label: "Completed",  stripe: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  cancelled:          { label: "Cancelled",  stripe: "bg-gray-300",    badge: "bg-gray-50 text-gray-500 border border-gray-200" },
};

type OrderRow = {
  id: string;
  status: string;
  totalAmount: number;
  deadline: Date | null;
  createdAt: Date;
  packageTitle: string | null;
  packageTier: string | null;
  editorName: string | null;
};

export function OrdersListClient({
  rows,
  hasFilter,
}: {
  rows: OrderRow[];
  hasFilter: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center mb-4">
          <ShoppingBag className="w-7 h-7 text-[#0EA5E9]" />
        </div>
        <p className="font-semibold text-gray-800">No orders found</p>
        <p className="text-sm text-gray-400 mt-1 mb-5">
          {hasFilter
            ? "No orders match this filter."
            : "You haven't placed any orders yet."}
        </p>
        {!hasFilter && (
          <Link
            href="/browse"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#0EA5E9] hover:bg-sky-600 transition-colors"
          >
            <Search className="w-3.5 h-3.5" /> Browse editors
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden divide-y divide-gray-50">
      {rows.map((order, i) => {
        const s = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
        const isActive = !["completed", "cancelled"].includes(order.status);
        const parts = (order.editorName ?? "").split(" ").filter(Boolean);
        const initials =
          parts.length >= 2
            ? (parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")
            : (order.editorName ?? "?").slice(0, 2);

        return (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.04, ease: "easeOut" }}
          >
            <Link
              href={`/client/orders/${order.id}`}
              className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/70 transition-colors group"
            >
              {/* Status stripe */}
              <div
                className={cn(
                  "w-[3px] self-stretch rounded-full shrink-0",
                  s.stripe
                )}
                style={{ minHeight: 44 }}
              />

              {/* Editor avatar */}
              <div className="w-9 h-9 rounded-full bg-[#0EA5E9]/10 flex items-center justify-center text-xs font-bold text-[#0EA5E9] shrink-0 uppercase select-none">
                {initials.toUpperCase() || "?"}
              </div>

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                      s.badge
                    )}
                  >
                    {s.label}
                  </span>
                  {order.packageTier && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 capitalize">
                      {order.packageTier}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {order.packageTitle ?? "Custom order"}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-gray-400 truncate max-w-[120px]">
                    {order.editorName ?? "Editor"}
                  </span>
                  <span className="text-gray-200 text-xs select-none">·</span>
                  {isActive && order.deadline ? (
                    <DeadlineCountdown deadline={order.deadline.toISOString()} />
                  ) : (
                    <span className="text-xs text-gray-400">
                      {order.deadline
                        ? formatDate(order.deadline)
                        : formatDate(order.createdAt)}
                    </span>
                  )}
                </div>
              </div>

              {/* Amount + arrow */}
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="font-bold text-sm text-gray-900 tabular-nums">
                  {formatCurrency(order.totalAmount)}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#0EA5E9] group-hover:translate-x-0.5 transition-all duration-150" />
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

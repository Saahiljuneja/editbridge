"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ShoppingBag, Search } from "lucide-react";
import { DeadlineCountdown } from "@/components/orders/deadline-countdown";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; stripe: string; badge: string }> = {
  pending:            { label: "Pending",    stripe: "bg-neutral-200", badge: "bg-neutral-50 text-neutral-600 border border-neutral-200" },
  in_progress:        { label: "In Progress",stripe: "bg-black",       badge: "bg-black text-white border-black" },
  delivered:          { label: "Delivered",  stripe: "bg-neutral-800", badge: "bg-neutral-900 text-white border-neutral-900" },
  revision_requested: { label: "Revision",   stripe: "bg-neutral-400", badge: "bg-white text-neutral-700 border border-neutral-300" },
  disputed:           { label: "Disputed",   stripe: "bg-red-500",     badge: "bg-red-50 text-red-700 border border-red-200" },
  completed:          { label: "Completed",  stripe: "bg-neutral-300", badge: "bg-neutral-50 text-neutral-800 border border-neutral-250" },
  cancelled:          { label: "Cancelled",  stripe: "bg-neutral-100", badge: "bg-neutral-50 text-neutral-400 border border-neutral-200" },
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
      <div className="rounded-[24px] border border-neutral-200/50 bg-[#ffffff] shadow-none flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-neutral-50 border border-neutral-200/30 flex items-center justify-center mb-4">
          <ShoppingBag className="w-7 h-7 text-neutral-300" />
        </div>
        <p className="font-black text-neutral-800 text-xs uppercase tracking-wider">No orders found</p>
        <p className="text-[11px] text-neutral-400 mt-1 mb-5 font-semibold">
          {hasFilter
            ? "No orders match this filter."
            : "You haven't placed any orders yet."}
        </p>
        {!hasFilter && (
          <Link
            href="/browse"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white bg-black hover:bg-neutral-900 transition-colors shadow-sm"
          >
            <Search className="w-3.5 h-3.5" /> Browse editors
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-neutral-200/60 bg-[#ffffff] shadow-none overflow-hidden divide-y divide-neutral-100">
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
              className="flex items-center gap-4 px-5 py-4 hover:bg-neutral-50/50 transition-colors group"
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
              <div className="w-9 h-9 rounded-xl bg-black border border-neutral-900 flex items-center justify-center text-[10px] font-bold text-white shrink-0 uppercase select-none">
                {initials.toUpperCase() || "?"}
              </div>

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className={cn(
                      "text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider",
                      s.badge
                    )}
                  >
                    {s.label}
                  </span>
                  {order.packageTier && (
                    <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded-md bg-neutral-50 border border-neutral-200/50 text-neutral-400 uppercase tracking-wider">
                      {order.packageTier}
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold text-neutral-900 truncate">
                  {order.packageTitle ?? "Custom order"}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[11px] text-neutral-400 font-semibold truncate max-w-[120px]">
                    {order.editorName ?? "Editor"}
                  </span>
                  <span className="text-neutral-200 text-xs select-none">·</span>
                  {isActive && order.deadline ? (
                    <DeadlineCountdown deadline={order.deadline.toISOString()} />
                  ) : (
                    <span className="text-[11px] text-neutral-400 font-semibold">
                      {order.deadline
                        ? formatDate(order.deadline)
                        : formatDate(order.createdAt)}
                    </span>
                  )}
                </div>
              </div>

              {/* Amount + arrow */}
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="font-black text-xs text-neutral-900 tabular-nums">
                  {formatCurrency(order.totalAmount)}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-neutral-300 group-hover:text-black group-hover:translate-x-0.5 transition-all duration-150" />
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

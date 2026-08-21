"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ShoppingBag, Search } from "lucide-react";
import { DeadlineCountdown } from "@/components/orders/deadline-countdown";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  pending:            { label: "Pending",     badge: "bg-amber-50 text-amber-700 border border-amber-200/50" },
  in_progress:        { label: "In Progress", badge: "bg-blue-100 text-blue-900" },
  delivered:          { label: "Delivered",   badge: "bg-indigo-100 text-indigo-700" },
  revision_requested: { label: "Revision",    badge: "bg-blue-100 text-blue-700" },
  disputed:           { label: "Disputed",    badge: "bg-red-50 text-red-700 border border-red-250/50" },
  completed:          { label: "Completed",   badge: "bg-emerald-100 text-emerald-700" },
  cancelled:          { label: "Cancelled",   badge: "bg-neutral-100 text-neutral-600" },
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

const EMPTY_STATE: Record<string, { heading: string; body: string }> = {
  all:                { heading: "No orders yet",                  body: "You haven't placed any orders yet." },
  pending:            { heading: "No pending orders",              body: "Orders awaiting editor pickup will appear here." },
  in_progress:        { heading: "No active projects",             body: "Orders being worked on by your editors will appear here." },
  delivered:          { heading: "No deliveries awaiting review",  body: "When an editor delivers work, it will appear here." },
  revision_requested: { heading: "No revision requests",           body: "Orders with open revision requests will appear here." },
  completed:          { heading: "No completed orders",            body: "Your finished projects will appear here." },
  cancelled:          { heading: "No cancelled orders",            body: "Cancelled orders will appear here." },
};

export function OrdersListClient({
  rows,
  hasFilter,
  tab,
}: {
  rows: OrderRow[];
  hasFilter: boolean;
  tab?: string;
}) {
  if (rows.length === 0) {
    const state = (tab ? EMPTY_STATE[tab] : undefined) ?? (hasFilter ? { heading: "No orders found", body: "No orders match this filter." } : EMPTY_STATE.all);
    return (
      <div className="rounded-3xl border border-neutral-200/60 bg-white shadow-sm flex flex-col items-center justify-center py-20 text-center relative z-10">
        <div className="w-14 h-14 rounded-2xl bg-neutral-50 border border-neutral-200/30 flex items-center justify-center mb-4">
          <ShoppingBag className="w-7 h-7 text-neutral-300" />
        </div>
        <p className="font-black text-neutral-800 text-xs uppercase tracking-wider">{state.heading}</p>
        <p className="text-[11px] text-neutral-400 mt-1 mb-5 font-semibold">{state.body}</p>
        {!hasFilter && (
          <Link
            href="/browse"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-black hover:bg-neutral-900 transition-colors shadow-sm"
          >
            <Search className="w-3.5 h-3.5" /> Browse editors
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-neutral-200/60 bg-white shadow-sm overflow-hidden divide-y divide-neutral-100 relative z-10">
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
              className="flex items-center gap-4 px-5 py-4.5 hover:bg-neutral-50/50 transition-colors group"
            >
              {/* Editor avatar */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50/50 border border-blue-200/40 flex items-center justify-center text-xs font-black text-blue-900 shrink-0 uppercase select-none">
                {initials.toUpperCase() || "?"}
              </div>

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={cn(
                      "text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider",
                      s.badge
                    )}
                  >
                    {s.label}
                  </span>
                  {order.packageTier && (
                    <span className="text-[9px] font-mono font-black px-2 py-0.5 rounded-md bg-neutral-50 border border-neutral-200/50 text-neutral-400 uppercase tracking-wider">
                      {order.packageTier}
                    </span>
                  )}
                </div>
                <p className="text-sm font-black text-neutral-800 truncate">
                  {order.packageTitle ?? "Custom order"}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[11px] text-neutral-400 font-bold truncate max-w-[120px]">
                    {order.editorName ?? "Editor"}
                  </span>
                  <span className="text-neutral-200 text-xs select-none">·</span>
                  {isActive && order.deadline ? (
                    <DeadlineCountdown deadline={order.deadline.toISOString()} />
                  ) : (
                    <span className="text-[11px] text-neutral-400 font-bold">
                      {order.deadline
                        ? formatDate(order.deadline)
                        : formatDate(order.createdAt)}
                    </span>
                  )}
                </div>
              </div>

              {/* Amount + arrow */}
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="font-black text-xs text-neutral-800 tabular-nums">
                  {formatCurrency(order.totalAmount)}
                </span>
                <ArrowRight className="w-4 h-4 text-neutral-300 group-hover:text-black group-hover:translate-x-0.5 transition-all duration-150" />
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

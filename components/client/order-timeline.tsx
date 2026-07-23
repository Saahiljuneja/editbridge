"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

type OrderStatus =
  | "pending" | "in_progress" | "delivered"
  | "revision_requested" | "completed" | "disputed" | "cancelled";

interface OrderTimelineProps {
  status: OrderStatus;
  timestamps?: {
    placed?: Date;
    accepted?: Date;
    delivered?: Date;
    completed?: Date;
  };
  approvedExtensionDays?: number | null;
}

const STEPS = [
  { key: "pending",     label: "Placed",    tsKey: "placed" as const },
  { key: "in_progress", label: "Accepted",  tsKey: "accepted" as const },
  { key: "delivered",   label: "Delivered", tsKey: "delivered" as const },
  { key: "completed",   label: "Approved",  tsKey: "completed" as const },
];

function stepIndex(status: OrderStatus): number {
  if (status === "pending") return 0;
  if (status === "in_progress" || status === "revision_requested") return 1;
  if (status === "delivered") return 2;
  if (status === "completed") return 3;
  return -1;
}

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function OrderTimeline({ status, timestamps, approvedExtensionDays }: OrderTimelineProps) {
  const current = stepIndex(status);
  const isCancelled = status === "cancelled";
  const isDisputed  = status === "disputed";

  if (isCancelled || isDisputed) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
        <p className="font-semibold text-gray-900 text-sm mb-4">Order Progress</p>
        <div className={cn(
          "flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium",
          isCancelled ? "bg-gray-50 text-gray-500" : "bg-red-50 text-red-700"
        )}>
          {isCancelled
            ? <XCircle className="w-4 h-4 shrink-0" />
            : <AlertTriangle className="w-4 h-4 shrink-0" />
          }
          {isCancelled ? "This order was cancelled." : "A dispute is open for this order."}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
      <p className="font-semibold text-gray-900 text-sm mb-5">Order Progress</p>

      {/* Step bar */}
      <div className="relative flex items-start">
        {/* Background connector line */}
        <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-100" style={{ zIndex: 0 }} />
        {/* Filled connector line */}
        {current > 0 && (
          <div
            className="absolute top-4 h-0.5 bg-[#0EA5E9] transition-all duration-500"
            style={{
              left: "16px",
              width: `calc(${(current / (STEPS.length - 1)) * 100}% - 32px)`,
              zIndex: 1,
            }}
          />
        )}

        {STEPS.map((step, i) => {
          const done   = i < current;
          const active = i === current;
          const ts     = timestamps?.[step.tsKey];

          return (
            <div
              key={step.key}
              className={cn(
                "flex-1 flex flex-col items-center gap-1.5",
                i === 0 && "items-start",
                i === STEPS.length - 1 && "items-end",
              )}
              style={{ position: "relative", zIndex: 2 }}
            >
              {/* Circle */}
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all bg-white",
                done  ? "bg-[#0EA5E9] border-[#0EA5E9]" :
                active ? "border-[#0EA5E9]" :
                        "border-gray-200"
              )}>
                {done
                  ? <CheckCircle2 className="w-4 h-4 text-white" />
                  : active
                  ? <div className="w-2.5 h-2.5 rounded-full bg-[#0EA5E9]" />
                  : <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />
                }
              </div>

              {/* Label */}
              <span className={cn(
                "text-[11px] font-semibold leading-tight text-center",
                done ? "text-gray-700" : active ? "text-[#0EA5E9]" : "text-gray-400"
              )}>
                {step.label}
                {status === "revision_requested" && step.key === "in_progress" && (
                  <span className="block text-[9px] text-amber-600 font-semibold mt-0.5">Revision</span>
                )}
              </span>

              {/* Timestamp */}
              {ts && (
                <span className="text-[10px] text-gray-400 text-center leading-tight">
                  {relativeTime(ts)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {approvedExtensionDays != null && approvedExtensionDays > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          Deadline extended by {approvedExtensionDays} day{approvedExtensionDays !== 1 ? "s" : ""} — approved by you
        </div>
      )}
    </div>
  );
}

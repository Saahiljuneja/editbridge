"use client";

import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";

interface TimelineEvent {
  id: string;
  eventType: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actorName: string | null;
}

interface OrderEventTimelineProps {
  orderId: string;
  className?: string;
}

const COLLAPSED_COUNT = 3;

type DotColor = "green" | "amber" | "red" | "gray" | "indigo";

const DOT_CLASSES: Record<DotColor, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  gray: "bg-gray-400",
  indigo: "bg-indigo-500",
};

function describeEvent(event: TimelineEvent): { label: string; sub?: string; color: DotColor } {
  const meta = event.metadata ?? {};

  switch (event.eventType) {
    case "order_placed":
      return { label: "Order placed and payment received", color: "green" };
    case "delivery_uploaded":
      return {
        label: meta.versionNumber ? `Draft v${meta.versionNumber} delivered` : "Delivery uploaded",
        sub: typeof meta.fileName === "string" ? meta.fileName : undefined,
        color: "indigo",
      };
    case "revision_requested":
      return {
        label: "Revision requested",
        sub: typeof meta.feedbackText === "string" ? meta.feedbackText : undefined,
        color: "amber",
      };
    case "extension_requested": {
      const days = Number(meta.extensionDays ?? 0);
      return { label: `Extension requested — +${days} day${days === 1 ? "" : "s"}`, sub: typeof meta.reason === "string" ? meta.reason : undefined, color: "amber" };
    }
    case "extension_approved": {
      const days = Number(meta.extensionDays ?? 0);
      return { label: `Extension approved — +${days} day${days === 1 ? "" : "s"}`, color: "green" };
    }
    case "extension_rejected":
      return { label: "Extension request rejected", color: "red" };
    case "dispute_opened":
      return { label: "Dispute opened", sub: typeof meta.reason === "string" ? meta.reason : undefined, color: "red" };
    case "dispute_resolved": {
      const type = meta.resolutionType as string | undefined;
      const label =
        type === "refund"
          ? "Dispute resolved — refund issued"
          : type === "split"
            ? "Dispute resolved — split settlement"
            : "Dispute resolved — payment released";
      return { label, sub: typeof meta.resolutionNote === "string" ? meta.resolutionNote : undefined, color: type === "refund" ? "red" : "green" };
    }
    case "order_completed":
      return {
        label: meta.reason === "auto-approved after 7 days" ? "Final delivery auto-approved" : "Final delivery approved",
        color: "green",
      };
    case "order_cancelled":
      return {
        label: "Order cancelled",
        sub: typeof meta.cancelledBy === "string" ? `Cancelled by ${meta.cancelledBy}` : undefined,
        color: "red",
      };
    case "payout_scheduled":
      return { label: "Payout scheduled", color: "gray" };
    case "message_flagged":
      return { label: "Chat message auto-flagged", sub: typeof meta.reason === "string" ? meta.reason : undefined, color: "red" };
    default:
      return { label: event.eventType, color: "gray" };
  }
}

export function OrderEventTimeline({ orderId, className }: OrderEventTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/orders/${orderId}/events`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d) setEvents(d.events ?? []);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (events === null) {
    return (
      <div className={cn("rounded-xl border border-border bg-white p-5", className)}>
        <p className="text-sm text-muted-foreground">Loading timeline…</p>
      </div>
    );
  }

  if (events.length === 0) return null;

  // Collapsed view keeps the most recent events, still in chronological order.
  const visible = expanded ? events : events.slice(-COLLAPSED_COUNT);
  const hiddenCount = events.length - visible.length;

  return (
    <div className={cn("rounded-xl border border-border bg-white p-5", className)}>
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm">Order timeline</h3>
      </div>

      <div>
        {visible.map((event, i) => {
          const { label, sub, color } = describeEvent(event);
          const isLast = i === visible.length - 1;
          return (
            <div key={event.id} className="relative pl-6 pb-5 last:pb-0">
              {!isLast && <div className="absolute left-[5px] top-3 bottom-0 w-px bg-gray-200" />}
              <div className={cn("absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full", DOT_CLASSES[color])} />
              <p className="text-sm font-medium text-gray-900">{label}</p>
              {sub && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{sub}</p>}
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDateTime(event.createdAt)}
                {event.actorName ? ` · ${event.actorName}` : ""}
              </p>
            </div>
          );
        })}
      </div>

      {hiddenCount > 0 && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex items-center gap-1 text-xs font-medium text-[var(--brand-client)] hover:underline mt-1"
        >
          View full timeline ({events.length} events) <ChevronDown className="w-3.5 h-3.5" />
        </button>
      )}
      {expanded && events.length > COLLAPSED_COUNT && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:underline mt-1"
        >
          Show less <ChevronUp className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

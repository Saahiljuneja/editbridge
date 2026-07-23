import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type OrderStatus =
  | "pending"
  | "in_progress"
  | "delivered"
  | "revision_requested"
  | "completed"
  | "disputed"
  | "cancelled";

const CONFIG: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-zinc-100 text-zinc-700 border-zinc-200" },
  in_progress: { label: "In Progress", className: "bg-blue-50 text-blue-700 border-blue-200" },
  delivered: { label: "Delivered", className: "bg-purple-50 text-purple-700 border-purple-200" },
  revision_requested: { label: "Revision", className: "bg-amber-50 text-amber-700 border-amber-200" },
  completed: { label: "Completed", className: "bg-green-50 text-green-700 border-green-200" },
  disputed: { label: "Disputed", className: "bg-red-50 text-red-700 border-red-200" },
  cancelled: { label: "Cancelled", className: "bg-zinc-100 text-zinc-400 border-zinc-200" },
};

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const { label, className: colorClass } = CONFIG[status] ?? CONFIG.pending;
  return (
    <Badge className={cn("text-xs font-medium border", colorClass, className)}>
      {label}
    </Badge>
  );
}
